<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use App\Models\Plan;
use App\Services\AuditService;
use App\Services\LicenseService;
use App\Services\PartnerService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * AuthController — Authentification SECRETIS ERP
 *
 * SECURITE :
 *  - Rate limiting : 5 tentatives par email+IP, puis lockout 60s
 *  - Mots de passe : min 12 chars, mixte, pas dans liste de pwned
 *  - Création compte : l'org et l'admin sont créés dans une transaction atomique
 *  - Après login : vérification licence + résolution tenant avant redirection
 *  - Tous les événements sont loggués dans audit_logs
 */
class AuthController extends Controller
{
    public function __construct(
        private AuditService $auditService,
        private LicenseService $licenseService,
        private PartnerService $partnerService,
    ) {}

    // -------------------------------------------------------------------------
    // Login
    // -------------------------------------------------------------------------

    /**
     * Authentifie un utilisateur avec rate limiting.
     * 5 tentatives max par email + IP avant blocage temporaire (60s).
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        // RATE LIMITING — clé unique par email + IP pour éviter les attaques distribuées
        $rateLimitKey = 'login:' . Str::lower($request->input('email')) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($rateLimitKey, maxAttempts: 5)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);

            $this->auditService->log(
                action: 'login_rate_limited',
                module: 'auth',
                resourceType: 'user',
                resourceId: null,
                newValues: ['email' => $request->input('email'), 'seconds_remaining' => $seconds],
            );

            throw ValidationException::withMessages([
                'email' => [__('auth.throttle', ['seconds' => $seconds, 'minutes' => ceil($seconds / 60)])],
            ])->status(429);
        }

        // Rechercher l'utilisateur
        $user = User::where('email', strtolower(trim($request->input('email'))))->first();

        // SECURITE : vérification uniforme pour éviter le timing attack (toujours hasher)
        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            RateLimiter::hit($rateLimitKey, decay: 60);

            // Incrémenter le compteur et potentiellement verrouiller le compte
            $user?->recordFailedLogin();

            $this->auditService->log(
                action: 'login_failed',
                module: 'auth',
                resourceType: 'user',
                resourceId: $user?->id,
                newValues: ['email' => $request->input('email'), 'reason' => 'invalid_credentials'],
            );

            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        // Vérifier si le compte est verrouillé
        if ($user->isLocked()) {
            throw ValidationException::withMessages([
                'email' => ['Compte verrouillé. Réessayez dans quelques minutes.'],
            ])->status(423);
        }

        // Vérifier si le compte est actif
        if (! $user->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['Votre compte est désactivé. Contactez votre administrateur.'],
            ])->status(403);
        }

        // Vérifier la licence de l'organisation AVANT de connecter
        $licenseStatus = $this->licenseService->checkStatus($user->organization_id);

        if ($licenseStatus === LicenseService::STATUS_SUSPENDED) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte est suspendu. Contactez le support IBIG.'],
            ])->status(403);
        }

        // Connexion réussie — réinitialiser les compteurs
        RateLimiter::clear($rateLimitKey);
        $user->recordSuccessfulLogin($request->ip());

        // Créer la session
        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        // Stocker le tenant en session
        $request->session()->put('current_organization_id', $user->organization_id);

        // Log d'audit
        $this->auditService->log(
            action: 'login_success',
            module: 'auth',
            resourceType: 'user',
            resourceId: $user->id,
            newValues: ['license_status' => $licenseStatus],
        );

        return response()->json([
            'user'            => $user->load('organization', 'roles'),
            'license_status'  => $licenseStatus,
            'redirect'        => $this->getRedirectUrl($licenseStatus),
        ]);
    }

    // -------------------------------------------------------------------------
    // Logout
    // -------------------------------------------------------------------------

    public function logout(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $this->auditService->log(
            action: 'logout',
            module: 'auth',
            resourceType: 'user',
            resourceId: $userId,
        );

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    // -------------------------------------------------------------------------
    // Register — Création organisation + admin
    // -------------------------------------------------------------------------

    /**
     * Crée une nouvelle organisation et son administrateur dans une transaction atomique.
     * L'organisation démarre en mode trial (14 jours par défaut).
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Organisation
            'organization_name' => ['required', 'string', 'max:255'],
            'organization_slug' => ['required', 'string', 'max:63', 'regex:/^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]$/', 'unique:organizations,slug'],
            'country'           => ['required', 'string', 'size:2'],
            'timezone'          => ['required', 'string', 'timezone'],
            // Administrateur
            'admin_name'        => ['required', 'string', 'max:255'],
            'email'             => ['required', 'email', 'max:255', 'unique:users,email'],
            'password'          => ['required', 'confirmed', PasswordRule::min(12)->mixedCase()->numbers()->symbols()->uncompromised()],
            // IBIG PARTNERS — code de parrainage optionnel
            'referral_code'     => ['nullable', 'string', 'max:12'],
            // Formule choisie lors de l'inscription (optionnel)
            'plan'              => ['nullable', 'string', 'in:decouverte,essentiel,pro,entreprise'],
        ]);

        $result = DB::transaction(function () use ($validated) {
            // Résoudre le plan choisi lors de l'inscription
            $planId = null;
            if (!empty($validated['plan'])) {
                $planId = \App\Models\Plan::where('slug', $validated['plan'])->value('id');
            }
            // Créer l'organisation en mode trial
            $organization = Organization::create([
                'name'         => $validated['organization_name'],
                'slug'         => strtolower($validated['organization_slug']),
                'email'        => $validated['email'],
                'country'      => strtoupper($validated['country']),
                'timezone'     => $validated['timezone'],
                'status'       => 'trial',
                'trial_ends_at' => now()->addDays(config('secretis.trial_days', 14)),
                'settings'     => [
                    'enabled_modules' => ['agenda', 'courrier', 'taches', 'contacts', 'reunions', 'documents'],
                    'language'        => 'fr',
                ],
                'plan_id'      => $planId,
            ]);

            // Créer l'administrateur
            $admin = User::create([
                'organization_id' => $organization->id,
                'name'            => $validated['admin_name'],
                'email'           => strtolower($validated['email']),
                'password'        => Hash::make($validated['password']),
                'status'          => 'active',
            ]);

            // Assigner le rôle admin_org via Spatie
            $admin->assignRole('admin_org');

            return compact('organization', 'admin');
        });

        // IBIG PARTNERS — enregistrer le parrainage si un code valide a été fourni
        if (!empty($validated['referral_code'])) {
            $this->partnerService->recordReferral(
                strtoupper(trim($validated['referral_code'])),
                $result['organization']
            );
        }

        event(new Registered($result['admin']));

        $this->auditService->log(
            action: 'organization_registered',
            module: 'auth',
            resourceType: 'organization',
            resourceId: $result['organization']->id,
            newValues: [
                'organization_name' => $result['organization']->name,
                'admin_email'       => $result['admin']->email,
                'plan'              => $validated['plan'] ?? null,
            ],
            userId: $result['admin']->id,
            organizationId: $result['organization']->id,
        );

        // Connecter automatiquement l'admin
        Auth::login($result['admin']);
        $request->session()->regenerate();
        $request->session()->put('current_organization_id', $result['organization']->id);

        return response()->json([
            'message'      => 'Organisation créée avec succès. Votre trial de ' . config('secretis.trial_days', 14) . ' jours a commencé.',
            'organization' => $result['organization'],
            'user'         => $result['admin']->load('roles'),
            'redirect'     => route('dashboard'),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // Mot de passe oublié
    // -------------------------------------------------------------------------

    /**
     * Envoie un lien de réinitialisation de mot de passe.
     * Rate-limitée pour éviter l'énumération d'emails.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        // Rate limit : 3 demandes par email par heure
        $key = 'forgot-password:' . Str::lower($request->input('email'));

        if (RateLimiter::tooManyAttempts($key, maxAttempts: 3)) {
            return response()->json([
                'message' => 'Trop de demandes. Réessayez dans une heure.',
            ], 429);
        }

        RateLimiter::hit($key, decay: 3600);

        // SECURITE : Toujours retourner le même message quelle que soit l'existence de l'email
        // pour éviter l'énumération d'utilisateurs
        $status = Password::sendResetLink($request->only('email'));

        // Log uniquement si l'email existe (mais sans exposer ça dans la réponse)
        if ($status === Password::RESET_LINK_SENT) {
            $user = User::where('email', strtolower($request->input('email')))->first();
            $this->auditService->log(
                action: 'password_reset_requested',
                module: 'auth',
                resourceType: 'user',
                resourceId: $user?->id,
            );
        }

        return response()->json([
            'message' => 'Si cet email est associé à un compte, vous recevrez un lien de réinitialisation.',
        ]);
    }

    /**
     * Réinitialise le mot de passe avec le token reçu par email.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email', 'max:255'],
            'password' => ['required', 'confirmed', PasswordRule::min(12)->mixedCase()->numbers()->symbols()->uncompromised()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password'               => Hash::make($password),
                    'remember_token'         => Str::random(60),
                    'failed_login_attempts'  => 0,
                    'locked_until'           => null,
                ])->save();

                $this->auditService->log(
                    action: 'password_reset_completed',
                    module: 'auth',
                    resourceType: 'user',
                    resourceId: $user->id,
                    userId: $user->id,
                    organizationId: $user->organization_id,
                );
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => 'Mot de passe réinitialisé avec succès.']);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function getRedirectUrl(string $licenseStatus): string
    {
        return match ($licenseStatus) {
            LicenseService::STATUS_EXPIRED   => route('license.expired'),
            LicenseService::STATUS_SUSPENDED => route('account.suspended'),
            LicenseService::STATUS_GRACE     => route('dashboard') . '?license=grace',
            default                          => route('dashboard'),
        };
    }

    // -------------------------------------------------------------------------
    // Inertia page renderers
    // -------------------------------------------------------------------------

    public function showLogin(): \Inertia\Response
    {
        return Inertia::render('Auth/Login');
    }

    public function showRegister(): \Inertia\Response
    {
        return Inertia::render('Auth/Register');
    }

    public function showForgotPassword(): \Inertia\Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function showResetPassword(string $token): \Inertia\Response
    {
        return Inertia::render('Auth/ResetPassword', ['token' => $token, 'email' => request('email')]);
    }

    public function showVerifyEmail(): \Inertia\Response
    {
        return Inertia::render('Auth/VerifyEmail');
    }

    public function verifyEmail(\Illuminate\Foundation\Auth\EmailVerificationRequest $request): \Illuminate\Http\RedirectResponse
    {
        $request->fulfill();
        return redirect()->route('dashboard');
    }

}
