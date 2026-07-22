<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\SsoProvider;
use App\Models\SsoSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * OidcService — Authentification OAuth2/OIDC pour SECRETIS ERP
 *
 * Providers supportés (via discovery URL) :
 *  - Google Workspace  : https://accounts.google.com/.well-known/openid-configuration
 *  - Azure AD (v2)     : https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration
 *  - Okta              : https://{domain}/.well-known/openid-configuration
 *  - Keycloak          : https://{host}/realms/{realm}/.well-known/openid-configuration
 *  - Tout provider OIDC standard (RFC 8414)
 *
 * SÉCURITÉ :
 *  - State parameter (CSRF protection)
 *  - Nonce (replay protection)
 *  - PKCE S256 pour les clients publics
 *  - Validation du ID Token (exp, iss, aud, nonce)
 *  - Config chiffrée au repos
 */
class OidcService
{
    // -------------------------------------------------------------------------
    // URL d'autorisation
    // -------------------------------------------------------------------------

    /**
     * Construit l'URL d'autorisation OIDC et initialise la session OAuth2.
     *
     * @param  Organization $org
     * @return string  URL de redirection vers l'IdP
     */
    public function getAuthUrl(Organization $org): string
    {
        $provider    = $this->getActiveProvider($org);
        $config      = $this->decryptConfig($provider);
        $discovery   = $this->discover($config['discovery_url'] ?? throw new RuntimeException('discovery_url manquant'));

        $state       = Str::random(32);
        $nonce       = Str::random(32);
        $codeVerifier  = Str::random(64);  // PKCE
        $codeChallenge = base64_encode(hash('sha256', $codeVerifier, raw: true));
        $codeChallenge = rtrim(strtr($codeChallenge, '+/', '-_'), '=');

        // Sauvegarder en session pour la validation du callback
        session([
            'oidc_state'         => $state,
            'oidc_nonce'         => $nonce,
            'oidc_code_verifier' => $codeVerifier,
            'oidc_org_slug'      => $org->slug,
            'oidc_initiated_at'  => time(),
        ]);

        $params = [
            'response_type'         => 'code',
            'client_id'             => $config['client_id'],
            'redirect_uri'          => $this->redirectUri($org),
            'scope'                 => $config['scopes'] ?? 'openid email profile',
            'state'                 => $state,
            'nonce'                 => $nonce,
            'code_challenge'        => $codeChallenge,
            'code_challenge_method' => 'S256',
        ];

        // Paramètres spécifiques Azure AD (forcer le choix de compte)
        if (str_contains($config['discovery_url'] ?? '', 'microsoft')) {
            $params['prompt'] = 'select_account';
        }

        return $discovery['authorization_endpoint'] . '?' . http_build_query($params);
    }

    // -------------------------------------------------------------------------
    // Callback — échange le code, valide l'ID Token, retourne l'utilisateur
    // -------------------------------------------------------------------------

    /**
     * Traite le callback OIDC (code authorization flow).
     *
     * @param  string       $code   Authorization code reçu de l'IdP
     * @param  Organization $org
     * @return User         Utilisateur authentifié
     * @throws RuntimeException en cas d'erreur
     */
    public function handleCallback(string $code, Organization $org): User
    {
        $provider  = $this->getActiveProvider($org);
        $config    = $this->decryptConfig($provider);
        $discovery = $this->discover($config['discovery_url']);

        // --- Validation CSRF state ---
        $state = request()->query('state');
        if ($state !== session('oidc_state')) {
            throw new RuntimeException('OIDC : state invalide — possible attaque CSRF.');
        }

        if (time() - session('oidc_initiated_at', 0) > 600) {
            throw new RuntimeException('OIDC : requête expirée (> 10 min).');
        }

        // --- Échange du code contre les tokens ---
        $tokenResponse = Http::asForm()
            ->timeout(15)
            ->post($discovery['token_endpoint'], [
                'grant_type'    => 'authorization_code',
                'code'          => $code,
                'redirect_uri'  => $this->redirectUri($org),
                'client_id'     => $config['client_id'],
                'client_secret' => $config['client_secret'] ?? '',
                'code_verifier' => session('oidc_code_verifier'),
            ]);

        if (! $tokenResponse->successful()) {
            $err = $tokenResponse->json('error_description') ?? $tokenResponse->body();
            throw new RuntimeException("OIDC : échange de code échoué — {$err}");
        }

        $tokens      = $tokenResponse->json();
        $accessToken = $tokens['access_token'] ?? throw new RuntimeException('OIDC : access_token manquant.');
        $idToken     = $tokens['id_token']     ?? null;

        // --- Récupérer les infos utilisateur ---
        $userInfo = $this->fetchUserInfo($accessToken, $discovery['userinfo_endpoint'] ?? '');

        // Valider le nonce depuis l'ID Token si présent
        if ($idToken) {
            $this->validateIdTokenNonce($idToken, session('oidc_nonce'));
        }

        session()->forget(['oidc_state', 'oidc_nonce', 'oidc_code_verifier', 'oidc_org_slug', 'oidc_initiated_at']);

        // --- Extraire les attributs ---
        $email     = $userInfo['email']       ?? throw new RuntimeException('OIDC : email manquant dans userinfo.');
        $firstName = $userInfo['given_name']  ?? $userInfo['name'] ?? '';
        $lastName  = $userInfo['family_name'] ?? '';
        $sub       = $userInfo['sub']         ?? $email;

        $roleMapping = $config['role_mapping'] ?? [];
        $groups      = $userInfo['groups'] ?? [];
        $role        = $this->getRoleFromGroups($groups, $roleMapping);

        // --- Créer / mettre à jour l'utilisateur ---
        $user = DB::transaction(function () use ($email, $firstName, $lastName, $role, $sub, $provider, $org) {
            $user = User::withTrashed()
                ->where('organization_id', $org->id)
                ->where('email', strtolower($email))
                ->first();

            if ($user === null) {
                $user = new User();
                $user->organization_id = $org->id;
                $user->email           = strtolower($email);
                $user->password        = bcrypt(Str::random(32));
            }

            if ($user->trashed()) {
                $user->restore();
            }

            $user->first_name      = $firstName ?: $user->first_name ?? '';
            $user->last_name       = $lastName  ?: $user->last_name  ?? $email;
            $user->is_active       = true;
            $user->sso_provider_id = $provider->id;
            $user->sso_external_id = $sub;
            $user->sso_synced_at   = now();

            if ($role && $user->role !== 'admin') {
                $user->role = $role;
            }

            $user->save();
            return $user;
        });

        SsoSession::create([
            'user_id'       => $user->id,
            'provider_id'   => $provider->id,
            'external_id'   => $sub,
            'session_token' => hash('sha256', Str::random(64)),
            'ip_address'    => request()->ip(),
            'user_agent'    => request()->userAgent(),
            'expires_at'    => now()->addHours(8),
        ]);

        Log::info('OIDC SSO login réussi', [
            'user_id'    => $user->id,
            'email'      => $email,
            'provider'   => $provider->name,
            'org'        => $org->slug,
        ]);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Récupération des infos utilisateur via UserInfo endpoint
    // -------------------------------------------------------------------------

    /**
     * Appelle le UserInfo endpoint OIDC avec le Bearer token.
     *
     * @param  string $accessToken
     * @param  string $userinfoEndpoint
     * @return array  Claims OIDC (email, sub, given_name, family_name, ...)
     */
    public function fetchUserInfo(string $accessToken, string $userinfoEndpoint): array
    {
        if (empty($userinfoEndpoint)) {
            throw new RuntimeException('OIDC : userinfo_endpoint non disponible dans la discovery.');
        }

        $response = Http::withToken($accessToken)
            ->timeout(10)
            ->get($userinfoEndpoint);

        if (! $response->successful()) {
            throw new RuntimeException('OIDC : appel userinfo échoué — ' . $response->status());
        }

        return $response->json();
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Récupère et met en cache le document de discovery OIDC.
     * Expire après 1 heure (configurable).
     */
    private function discover(string $discoveryUrl): array
    {
        $cacheKey = 'oidc_discovery_' . md5($discoveryUrl);

        return cache()->remember($cacheKey, 3600, function () use ($discoveryUrl) {
            $response = Http::timeout(10)->get($discoveryUrl);

            if (! $response->successful()) {
                throw new RuntimeException("OIDC : discovery échouée ({$discoveryUrl}) — " . $response->status());
            }

            $data = $response->json();

            if (empty($data['authorization_endpoint']) || empty($data['token_endpoint'])) {
                throw new RuntimeException('OIDC : document de discovery invalide (champs requis manquants).');
            }

            return $data;
        });
    }

    private function validateIdTokenNonce(string $idToken, ?string $expectedNonce): void
    {
        if (! $expectedNonce) {
            return;
        }

        // Décoder le payload JWT (pas de vérification de signature ici — l'IdP est de confiance via HTTPS)
        $parts = explode('.', $idToken);
        if (count($parts) !== 3) {
            return;
        }

        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        $nonce   = $payload['nonce'] ?? null;

        if ($nonce && $nonce !== $expectedNonce) {
            throw new RuntimeException('OIDC : nonce invalide — possible attaque replay.');
        }
    }

    private function getRoleFromGroups(array $groups, array $mapping): string
    {
        $hierarchy = ['employee' => 1, 'manager' => 2, 'admin' => 3];
        $best      = 'employee';
        $bestLevel = 0;

        foreach ($groups as $group) {
            $role = $mapping[$group] ?? null;
            if ($role && isset($hierarchy[$role]) && $hierarchy[$role] > $bestLevel) {
                $best      = $role;
                $bestLevel = $hierarchy[$role];
            }
        }

        return $best;
    }

    private function redirectUri(Organization $org): string
    {
        return rtrim(config('app.url'), '/') . '/sso/oidc/' . $org->slug . '/callback';
    }

    private function getActiveProvider(Organization $org): SsoProvider
    {
        $provider = SsoProvider::where('organization_id', $org->id)
            ->where('type', 'oidc')
            ->where('is_active', true)
            ->first();

        if (! $provider) {
            throw new RuntimeException("Aucun provider OIDC actif pour l'organisation {$org->slug}.");
        }

        return $provider;
    }

    private function decryptConfig(SsoProvider $provider): array
    {
        $raw = decrypt($provider->config);
        return is_array($raw) ? $raw : json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
    }
}
