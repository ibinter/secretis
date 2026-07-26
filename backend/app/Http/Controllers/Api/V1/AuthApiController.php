<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use App\Services\AuditService;
use App\Services\LicenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * AuthApiController — Authentification API v1 via Sanctum
 *
 * Endpoints :
 *  POST   /api/v1/auth/login    → Token + profil
 *  POST   /api/v1/auth/logout   → Révocation token courant
 *  POST   /api/v1/auth/refresh  → Nouveau token
 *  GET    /api/v1/auth/me       → Profil utilisateur courant
 */
class AuthApiController extends ApiController
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly LicenseService $license,
    ) {}

    // -------------------------------------------------------------------------
    // POST /auth/login
    // -------------------------------------------------------------------------

    /**
     * Authentifie l'utilisateur et retourne un token Sanctum.
     *
     * Rate limit : 5 tentatives par email+IP / 60 secondes.
     * Retourne : { token, token_type, user, organization, license_status }
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        // Rate limiting
        $key = 'api-login:' . Str::lower($request->input('email')) . '|' . $request->ip();

        if (RateLimiter::tooManyAttempts($key, maxAttempts: 5)) {
            $seconds = RateLimiter::availableIn($key);
            return $this->error(
                "Trop de tentatives. Réessayez dans {$seconds} secondes.",
                429,
                'SEC-040',
            );
        }

        $user = User::where('email', strtolower(trim($request->input('email'))))
                    ->with(['organization', 'roles'])
                    ->first();

        // Vérification credentials (timing-safe)
        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            RateLimiter::hit($key, decay: 60);
            $user?->recordFailedLogin();

            $this->audit->log(
                action: 'api_login_failed',
                module: 'auth',
                resourceType: 'user',
                resourceId: $user?->id,
                newValues: ['email' => $request->input('email')],
            );

            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        // Compte verrouillé
        if ($user->isLocked()) {
            return $this->error('Compte verrouillé. Contactez votre administrateur.', 423, 'SEC-041');
        }

        // Compte inactif
        if (! $user->isActive()) {
            return $this->error('Votre compte est désactivé.', 403, 'SEC-042');
        }

        // Vérification licence
        $licenseStatus = $this->license->checkStatus($user->organization_id);
        if ($licenseStatus === LicenseService::STATUS_SUSPENDED) {
            return $this->error('Organisation suspendue. Contactez le support IBIG.', 403, 'SEC-043');
        }

        // Authentification réussie
        RateLimiter::clear($key);
        $user->recordSuccessfulLogin($request->ip());

        // Créer le token Sanctum (révoquer les anciens si "remember" non demandé)
        if (! $request->boolean('remember')) {
            $user->tokens()->where('name', 'api-token')->delete();
        }

        $token = $user->createToken('api-token')->plainTextToken;

        // Établit aussi la session web (SPA même domaine) pour les routes Inertia
        try {
            \Illuminate\Support\Facades\Auth::guard('web')->login($user, (bool) $request->boolean('remember'));
            $request->session()->regenerate();
        } catch (\Throwable $e) {
            // Requête purement API (mobile) sans session — ignorer
        }

        $this->audit->log(
            action: 'api_login_success',
            module: 'auth',
            resourceType: 'user',
            resourceId: $user->id,
            newValues: ['license_status' => $licenseStatus],
            userId: $user->id,
            organizationId: $user->organization_id,
        );

        return $this->success([
            'token'          => $token,
            'token_type'     => 'Bearer',
            'user'           => $this->formatUser($user),
            'organization'   => $user->organization,
            'license_status' => $licenseStatus,
            'permissions'    => $user->getAllPermissions()->pluck('name'),
        ], 'Connexion réussie.');
    }

    // -------------------------------------------------------------------------
    // POST /auth/logout
    // -------------------------------------------------------------------------

    /**
     * Révoque le token Sanctum courant.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        $this->audit->log(
            action: 'api_logout',
            module: 'auth',
            resourceType: 'user',
            resourceId: $request->user()->id,
            userId: $request->user()->id,
            organizationId: $request->user()->organization_id,
        );

        return $this->noContent('Déconnexion réussie.');
    }

    // -------------------------------------------------------------------------
    // POST /auth/refresh
    // -------------------------------------------------------------------------

    /**
     * Révoque le token courant et émet un nouveau token.
     */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();

        // Révoquer le token courant
        $user->currentAccessToken()->delete();

        // Émettre un nouveau token
        $newToken = $user->createToken('api-token')->plainTextToken;

        return $this->success([
            'token'      => $newToken,
            'token_type' => 'Bearer',
        ], 'Token renouvelé avec succès.');
    }

    // -------------------------------------------------------------------------
    // GET /auth/me
    // -------------------------------------------------------------------------

    /**
     * Retourne le profil complet de l'utilisateur authentifié.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['organization', 'roles', 'department']);

        return $this->success([
            'user'           => $this->formatUser($user),
            'organization'   => $user->organization,
            'permissions'    => $user->getAllPermissions()->pluck('name'),
            'roles'          => $user->getRoleNames(),
            'license_status' => $this->license->checkStatus($user->organization_id),
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function formatUser(User $user): array
    {
        return [
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'avatar_url'     => $user->avatar_url ?? null,
            'status'         => $user->status,
            'organization_id' => $user->organization_id,
            'roles'          => $user->getRoleNames(),
            'department'     => $user->department,
            'last_login_at'  => $user->last_login_at?->toIso8601String(),
            'created_at'     => $user->created_at->toIso8601String(),
        ];
    }
}
