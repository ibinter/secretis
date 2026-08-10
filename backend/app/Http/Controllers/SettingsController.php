<?php

namespace App\Http\Controllers;

use App\Models\Organization;

use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────────
    // Middleware
    // ─────────────────────────────────────────────────────────────────────────

    public function __construct()
    {
        $this->middleware(['auth', 'verified']);
        // Admin-only routes
        $this->middleware('role:admin,super_admin')->only([
            'updateOrganization',
            'inviteUser',
            'updateUserRole',
            'updateIntegration',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ORGANISATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /parametres/organisation
     * Retourne la page Paramètres > Organisation avec les données actuelles.
     */
    public function showOrganisation(): Response
    {
        $org = Auth::user()->organisation;

        return Inertia::render('Parametres/Organisation', [
            'organisation' => [
                'raison_sociale'           => $org->raison_sociale,
                'logo_url'                 => $org->logo_path ? Storage::url($org->logo_path) : null,
                'adresse'                  => $org->adresse,
                'telephone'                => $org->telephone,
                'email'                    => $org->email,
                'site_web'                 => $org->site_web,
                'devise'                   => $org->devise ?? 'XOF',
                'fuseau_horaire'           => $org->fuseau_horaire ?? 'Africa/Abidjan',
                'locale'                   => $org->locale ?? 'fr_FR',
                'services'                 => $org->services ?? [],
                'prefix_courrier_entrant'  => $org->prefix_courrier_entrant ?? 'CORR-ENT',
                'prefix_courrier_sortant'  => $org->prefix_courrier_sortant ?? 'CORR-SORT',
                'prefix_document'          => $org->prefix_document ?? 'DOC',
                'prefix_reunion'           => $org->prefix_reunion ?? 'REU',
                'numerotation_reset'       => $org->numerotation_reset ?? 'annuel',
                'couleur_accent'           => $org->couleur_accent ?? '#1e40af',
            ],
        ]);
    }

    /**
     * POST /parametres/organisation
     * Met à jour les informations de l'organisation (avec upload logo).
     */
    public function updateOrganization(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'raison_sociale'           => ['required', 'string', 'max:255'],
            'logo'                     => ['nullable', 'image', 'mimes:png,jpg,jpeg,svg,webp', 'max:2048'],
            'logo_remove'              => ['boolean'],
            'adresse'                  => ['nullable', 'string', 'max:1000'],
            'telephone'                => ['nullable', 'string', 'max:50'],
            'email'                    => ['nullable', 'email', 'max:255'],
            'site_web'                 => ['nullable', 'url', 'max:255'],
            'devise'                   => ['required', 'string', 'max:10'],
            'fuseau_horaire'           => ['required', 'string', 'max:50'],
            'locale'                   => ['required', 'string', 'max:10'],
            'services'                 => ['nullable', 'array'],
            'services.*'               => ['string', 'max:100'],
            'prefix_courrier_entrant'  => ['nullable', 'string', 'max:20', 'regex:/^[A-Z0-9\-]+$/'],
            'prefix_courrier_sortant'  => ['nullable', 'string', 'max:20', 'regex:/^[A-Z0-9\-]+$/'],
            'prefix_document'          => ['nullable', 'string', 'max:20', 'regex:/^[A-Z0-9\-]+$/'],
            'prefix_reunion'           => ['nullable', 'string', 'max:20', 'regex:/^[A-Z0-9\-]+$/'],
            'numerotation_reset'       => ['required', 'in:annuel,jamais'],
            'couleur_accent'           => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $org = Auth::user()->organisation;

        // ── Logo ──────────────────────────────────────────────────────────────
        if ($request->boolean('logo_remove') && $org->logo_path) {
            Storage::disk('public')->delete($org->logo_path);
            $validated['logo_path'] = null;
        }

        if ($request->hasFile('logo')) {
            if ($org->logo_path) {
                Storage::disk('public')->delete($org->logo_path);
            }
            $path = $request->file('logo')->store('logos', 'public');
            $validated['logo_path'] = $path;
        }

        unset($validated['logo'], $validated['logo_remove']);

        $org->update($validated);

        $this->auditLog('organisation.updated', ['fields' => array_keys($validated)]);

        return redirect()->back()->with('success', 'Les informations de l\'organisation ont été mises à jour.');
    }

    /**
     * GET /parametres/organisation/settings (API JSON)
     * Retourne les paramètres complets pour usage interne/API.
     */
    public function getOrganizationSettings(): JsonResponse
    {
        $org = Auth::user()->organisation;

        return response()->json([
            'organisation' => $org->only([
                'raison_sociale', 'adresse', 'telephone', 'email', 'site_web',
                'devise', 'fuseau_horaire', 'locale', 'services',
                'prefix_courrier_entrant', 'prefix_courrier_sortant',
                'prefix_document', 'prefix_reunion',
                'numerotation_reset', 'couleur_accent',
            ]),
            'logo_url' => $org->logo_path ? Storage::url($org->logo_path) : null,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UTILISATEURS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /parametres/utilisateurs
     * Page de gestion des utilisateurs.
     */
    public function showUtilisateurs(): Response
    {
        $org = Auth::user()->organisation;

        $utilisateurs = User::where('organisation_id', $org->id)
            ->withLastLogin()
            ->get()
            ->map(fn($u) => [
                'id'                => $u->id,
                'nom'               => $u->nom,
                'prenom'            => $u->prenom,
                'email'             => $u->email,
                'role'              => $u->role,
                'service'           => $u->service,
                'statut'            => $u->statut,
                'avatar_url'        => $u->avatar_url,
                'derniere_connexion' => $u->derniere_connexion?->diffForHumans(),
            ]);

        return Inertia::render('Parametres/Utilisateurs', [
            'utilisateurs' => $utilisateurs,
            'services'     => $org->services ?? [],
        ]);
    }

    /**
     * POST /parametres/utilisateurs/inviter
     * Envoie une invitation par email à un nouveau collaborateur.
     */
    public function inviteUser(Request $request): \Illuminate\Http\RedirectResponse
    {
        // Multi-utilisateur fermé au palier Découverte (section 3.3).
        app(\App\Services\LicenceGarde::class)->exiger('multi_utilisateur', $request->user());

        $validated = $request->validate([
            'email'   => ['required', 'email', 'max:255'],
            'role'    => ['required', 'in:admin,manager,employe,consultant'],
            'service' => ['nullable', 'string', 'max:100'],
        ]);

        $org = Auth::user()->organisation;

        // Vérifie que l'utilisateur n'existe pas déjà
        $exists = User::where('email', $validated['email'])
            ->where('organisation_id', $org->id)
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors(['email' => 'Cet utilisateur appartient déjà à votre organisation.']);
        }

        // Crée un token d'invitation signé (valable 72h)
        $token = Str::random(64);

        \DB::table('invitations')->insert([
            'email'           => $validated['email'],
            'organisation_id' => $org->id,
            'role'            => $validated['role'],
            'service'         => $validated['service'],
            'token'           => Hash::make($token),
            'expires_at'      => now()->addHours(72),
            'invited_by'      => Auth::id(),
            'created_at'      => now(),
        ]);

        // Envoi de l'email d'invitation
        Mail::to($validated['email'])->send(
            new \App\Mail\InvitationMail($org, $validated['role'], $token)
        );

        $this->auditLog('user.invited', ['email' => $validated['email'], 'role' => $validated['role']]);

        return redirect()->back()->with('success', 'L\'invitation a été envoyée à ' . $validated['email'] . '.');
    }

    /**
     * PATCH /parametres/utilisateurs/{id}/role
     * Change le rôle et/ou le service d'un utilisateur.
     */
    public function updateUserRole(Request $request, int $id): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'role'    => ['required', 'in:admin,manager,employe,consultant'],
            'service' => ['nullable', 'string', 'max:100'],
        ]);

        $user = User::where('id', $id)
            ->where('organisation_id', Auth::user()->organisation_id)
            ->firstOrFail();

        // Un admin ne peut pas modifier le super_admin
        if ($user->role === 'super_admin') {
            abort(403, 'Impossible de modifier le rôle du super administrateur.');
        }

        $ancienRole = $user->role;
        $user->update($validated);

        // Notification à l'utilisateur
        $user->notify(new \App\Notifications\RoleUpdatedNotification($ancienRole, $validated['role']));

        $this->auditLog('user.role_updated', [
            'user_id'     => $id,
            'ancien_role' => $ancienRole,
            'nouveau_role' => $validated['role'],
        ]);

        return redirect()->back()->with('success', 'Le rôle de ' . $user->prenom . ' ' . $user->nom . ' a été mis à jour.');
    }

    /**
     * PATCH /parametres/utilisateurs/{id}/toggle
     * Active ou désactive un compte utilisateur.
     */
    public function toggleUser(Request $request, int $id): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate(['statut' => ['required', 'in:actif,inactif']]);

        $user = User::where('id', $id)
            ->where('organisation_id', Auth::user()->organisation_id)
            ->where('id', '!=', Auth::id())
            ->firstOrFail();

        $user->update(['statut' => $validated['statut']]);

        // Révocation des sessions actives si désactivation
        if ($validated['statut'] === 'inactif') {
            \DB::table('sessions')->where('user_id', $id)->delete();
        }

        $this->auditLog('user.toggled', ['user_id' => $id, 'statut' => $validated['statut']]);

        return redirect()->back()->with('success', 'Le compte a été ' . ($validated['statut'] === 'actif' ? 'réactivé' : 'suspendu') . '.');
    }

    /**
     * POST /parametres/utilisateurs/{id}/reset-mdp
     * Envoie un email de réinitialisation du mot de passe.
     */
    public function resetUserPassword(int $id): \Illuminate\Http\RedirectResponse
    {
        $user = User::where('id', $id)
            ->where('organisation_id', Auth::user()->organisation_id)
            ->firstOrFail();

        // Utilise le broker de mot de passe Laravel
        \Password::broker()->sendResetLink(['email' => $user->email]);

        $this->auditLog('user.password_reset_sent', ['user_id' => $id, 'email' => $user->email]);

        return redirect()->back()->with('success', 'Un email de réinitialisation a été envoyé à ' . $user->email . '.');
    }

    /**
     * GET /parametres/utilisateurs/{id}/historique
     * Retourne l'historique des connexions d'un utilisateur (JSON).
     */
    public function userHistorique(int $id): JsonResponse
    {
        $user = User::where('id', $id)
            ->where('organisation_id', Auth::user()->organisation_id)
            ->firstOrFail();

        $historique = AuditLog::where('user_id', $id)
            ->where('action', 'auth.login')
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn($log) => [
                'date'     => $log->created_at->format('d/m/Y H:i'),
                'ip'       => $log->ip_address,
                'appareil' => $log->properties['user_agent'] ?? 'Inconnu',
                'suspect'  => $log->properties['suspect'] ?? false,
            ]);

        return response()->json(['historique' => $historique]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /parametres/notifications
     */
    public function showNotifications(): Response
    {
        $prefs = Auth::user()->notificationPreferences ?? [];

        return Inertia::render('Parametres/Notifications', [
            'preferences' => $prefs,
        ]);
    }

    /**
     * PATCH /parametres/notifications
     * Sauvegarde les préférences de notifications de l'utilisateur connecté.
     */
    public function updateNotificationPreferences(Request $request): \Illuminate\Http\RedirectResponse
    {
        // Validation flexible : accepte n'importe quelle clé booléenne + digest + son
        $data = $request->validate([
            'son_notification' => ['boolean'],
            'digest'           => ['nullable', 'string', 'in:jamais,quotidien_8h,quotidien_18h,hebdo_lundi'],
            // Les autres clés sont des booléens pour {event_id}_{canal}
        ]);

        // Récupère toutes les préférences (booléens pour events/canaux)
        $allData = $request->all();
        foreach ($allData as $key => $value) {
            if (!in_array($key, ['son_notification', 'digest', '_token'])) {
                $data[$key] = (bool) $value;
            }
        }

        Auth::user()->update(['notification_preferences' => $data]);

        return redirect()->back()->with('success', 'Vos préférences de notifications ont été enregistrées.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INTÉGRATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /parametres/integrations
     */
    public function showIntegrations(): Response
    {
        $org  = Auth::user()->organisation;
        $configs = $this->buildIntegrationConfigs($org);

        return Inertia::render('Parametres/Integrations', [
            'configs' => $configs,
        ]);
    }

    /**
     * POST /parametres/integrations/{type}
     * Sauvegarde la configuration d'une intégration.
     * Les secrets (clés API, mots de passe) sont chiffrés avant stockage.
     */
    public function updateIntegration(Request $request, string $type): \Illuminate\Http\RedirectResponse
    {
        $rules = $this->integrationRules($type);

        if (empty($rules)) {
            abort(404, 'Type d\'intégration inconnu : ' . $type);
        }

        $validated = $request->validate($rules);
        $org       = Auth::user()->organisation;

        // Chiffrement des secrets avant stockage
        $sensitiveFields = $this->sensitiveFields($type);
        foreach ($sensitiveFields as $field) {
            if (!empty($validated[$field])) {
                $validated[$field] = Crypt::encryptString($validated[$field]);
            } else {
                // Conserver la valeur existante si le champ est vide
                unset($validated[$field]);
            }
        }

        // Récupère la config existante et fusionne
        $existing = $org->integrations[$type] ?? [];
        $merged   = array_merge($existing, $validated, [
            'configured' => true,
            'updated_at' => now()->toIso8601String(),
        ]);

        $integrations       = $org->integrations ?? [];
        $integrations[$type] = $merged;
        $org->update(['integrations' => $integrations]);

        // Audit (sans les secrets)
        $safeData = collect($validated)->except($sensitiveFields)->toArray();
        $this->auditLog("integration.{$type}.updated", $safeData);

        return redirect()->back()->with('success', 'La configuration de l\'intégration a été enregistrée avec succès.');
    }

    /**
     * POST /parametres/integrations/test-smtp
     * Teste la connexion SMTP sans sauvegarder.
     * Les credentials ne sont jamais journalisés.
     */
    public function testSmtpConnection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'host'       => ['required', 'string'],
            'port'       => ['required', 'integer'],
            'username'   => ['nullable', 'string'],
            'password'   => ['nullable', 'string'],
            'from_email' => ['required', 'email'],
        ]);

        try {
            // Configuration dynamique du mailer Laravel
            config([
                'mail.mailers.smtp_test' => [
                    'transport'  => 'smtp',
                    'host'       => $validated['host'],
                    'port'       => (int) $validated['port'],
                    'encryption' => (int) $validated['port'] === 465 ? 'ssl' : 'tls',
                    'username'   => $validated['username'] ?? null,
                    'password'   => $validated['password'] ?? null,
                    'timeout'    => 10,
                ],
            ]);

            $transport = app('mail.manager')->mailer('smtp_test')->getSymfonyTransport();
            $transport->start();

            return response()->json([
                'success' => true,
                'message' => 'Connexion SMTP établie avec succès. L\'email peut être envoyé.',
            ]);
        } catch (\Throwable $e) {
            // Ne jamais logger le mot de passe, ne retourner que le message d'erreur technique
            \Log::warning('SMTP test failed (no credentials logged)', [
                'host' => $validated['host'],
                'port' => $validated['port'],
                'error_type' => get_class($e),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Échec de la connexion : ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * POST /parametres/integrations/test-ai
     * Teste la connexion au fournisseur IA sélectionné.
     * La clé API n'est JAMAIS journalisée.
     */
    public function testAiConnection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider' => ['required', 'in:groq,openai,anthropic'],
            'api_key'  => ['required', 'string', 'min:10'],
            'model'    => ['required', 'string'],
        ]);

        try {
            $result = match ($validated['provider']) {
                'groq'      => $this->testGroq($validated['api_key'], $validated['model']),
                'openai'    => $this->testOpenAI($validated['api_key'], $validated['model']),
                'anthropic' => $this->testAnthropic($validated['api_key'], $validated['model']),
            };

            return response()->json($result);
        } catch (\Throwable $e) {
            // Journalise SANS la clé API
            \Log::warning('AI connection test failed (no API key logged)', [
                'provider'   => $validated['provider'],
                'model'      => $validated['model'],
                'error_type' => get_class($e),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Échec du test : ' . $e->getMessage(),
            ]);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ALIAS API (routes api.php → méthodes réelles)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /organization (API) → getOrganizationSettings
     *
     * NOTE : la cible suggérée showOrganisation() retourne une réponse Inertia pure
     * (Inertia\Response), non adaptée à une route API JSON. On délègue donc vers
     * getOrganizationSettings() qui retourne un JsonResponse équivalent.
     */
    public function organization(): JsonResponse
    {
        return $this->getOrganizationSettings();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Construit les configs d'intégration masquées (pas de secrets en clair).
     */
    private function buildIntegrationConfigs(Organization $org): array
    {
        $raw     = $org->integrations ?? [];
        $configs = [];

        foreach (['smtp', 'whatsapp', 's3', 'google_calendar', 'sara'] as $type) {
            $data = $raw[$type] ?? [];
            $sensitive = $this->sensitiveFields($type);

            // Masque les champs sensibles
            $safe = array_filter($data, fn($k) => !in_array($k, $sensitive), ARRAY_FILTER_USE_KEY);
            $safe['configured'] = !empty($data);
            $safe['has_key']    = !empty(array_intersect_key($data, array_flip($sensitive)));

            $configs[$type] = $safe;
        }

        return $configs;
    }

    private function integrationRules(string $type): array
    {
        return match ($type) {
            'smtp' => [
                'host'       => ['required', 'string', 'max:255'],
                'port'       => ['required', 'integer', 'in:25,465,587'],
                'username'   => ['nullable', 'string', 'max:255'],
                'password'   => ['nullable', 'string', 'max:500'],
                'from_email' => ['required', 'email', 'max:255'],
                'from_name'  => ['nullable', 'string', 'max:255'],
                'encryption' => ['nullable', 'in:tls,ssl,none'],
            ],
            'whatsapp' => [
                'phone_number_id' => ['required', 'string', 'max:100'],
                'access_token'    => ['nullable', 'string', 'max:1000'],
                'waba_id'         => ['nullable', 'string', 'max:100'],
                'webhook_verify'  => ['nullable', 'string', 'max:255'],
            ],
            's3' => [
                'driver'   => ['required', 'in:s3,minio,scaleway,digitalocean'],
                'key'      => ['required', 'string', 'max:255'],
                'secret'   => ['nullable', 'string', 'max:500'],
                'region'   => ['nullable', 'string', 'max:50'],
                'bucket'   => ['required', 'string', 'max:255'],
                'endpoint' => ['nullable', 'url', 'max:255'],
            ],
            'google_calendar' => [
                'sync_direction' => ['nullable', 'in:bidirectional,to_google,from_google'],
            ],
            'sara' => [
                'provider'    => ['required', 'in:groq,openai,anthropic'],
                'api_key'     => ['nullable', 'string', 'max:500'],
                'model'       => ['required', 'string', 'max:100'],
                'temperature' => ['nullable', 'numeric', 'min:0', 'max:1'],
                'max_tokens'  => ['nullable', 'integer', 'min:256', 'max:8192'],
            ],
            default => [],
        };
    }

    /**
     * Liste des champs sensibles à chiffrer pour chaque type d'intégration.
     */
    private function sensitiveFields(string $type): array
    {
        return match ($type) {
            'smtp'           => ['password'],
            'whatsapp'       => ['access_token'],
            's3'             => ['secret'],
            'google_calendar' => ['access_token', 'refresh_token'],
            'sara'           => ['api_key'],
            default          => [],
        };
    }

    /**
     * Test de connexion Groq.
     */
    private function testGroq(string $apiKey, string $model): array
    {
        $response = \Http::withToken($apiKey)
            ->timeout(10)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'      => $model,
                'messages'   => [['role' => 'user', 'content' => 'Réponds juste "OK".']],
                'max_tokens' => 5,
            ]);

        if ($response->successful()) {
            return ['success' => true, 'message' => 'Connexion Groq réussie. Modèle "' . $model . '" opérationnel.'];
        }

        return ['success' => false, 'message' => 'Groq a retourné : HTTP ' . $response->status() . ' — ' . ($response->json('error.message') ?? 'Erreur inconnue')];
    }

    /**
     * Test de connexion OpenAI.
     */
    private function testOpenAI(string $apiKey, string $model): array
    {
        $response = \Http::withToken($apiKey)
            ->timeout(10)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'      => $model,
                'messages'   => [['role' => 'user', 'content' => 'Say "OK".']],
                'max_tokens' => 5,
            ]);

        if ($response->successful()) {
            return ['success' => true, 'message' => 'Connexion OpenAI réussie. Modèle "' . $model . '" opérationnel.'];
        }

        return ['success' => false, 'message' => 'OpenAI a retourné : HTTP ' . $response->status() . ' — ' . ($response->json('error.message') ?? 'Erreur inconnue')];
    }

    /**
     * Test de connexion Anthropic (Claude).
     */
    private function testAnthropic(string $apiKey, string $model): array
    {
        $response = \Http::withHeaders([
                'x-api-key'         => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])
            ->timeout(10)
            ->post('https://api.anthropic.com/v1/messages', [
                'model'      => $model,
                'max_tokens' => 5,
                'messages'   => [['role' => 'user', 'content' => 'Say "OK".']],
            ]);

        if ($response->successful()) {
            return ['success' => true, 'message' => 'Connexion Anthropic (Claude) réussie. Modèle "' . $model . '" opérationnel.'];
        }

        return ['success' => false, 'message' => 'Anthropic a retourné : HTTP ' . $response->status() . ' — ' . ($response->json('error.message') ?? 'Erreur inconnue')];
    }

    /**
     * Enregistre une entrée dans le journal d'audit.
     */
    private function auditLog(string $action, array $properties = []): void
    {
        AuditLog::create([
            'user_id'          => Auth::id(),
            'organisation_id'  => Auth::user()->organisation_id,
            'action'           => $action,
            'properties'       => $properties,
            'ip_address'       => request()->ip(),
            'user_agent'       => request()->userAgent(),
        ]);
    }
}
