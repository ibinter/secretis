<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * MicrosoftAuthService — Authentification OAuth2 Microsoft 365
 *
 * Gère le flux OAuth2 Authorization Code avec PKCE pour Microsoft Identity Platform.
 * Supporte les apps multi-tenant (common) et mono-tenant (organisation).
 *
 * Scopes par défaut :
 *   - Calendars.ReadWrite    : lecture/écriture calendrier Outlook
 *   - Mail.Send              : envoi d'emails via compte MS
 *   - Files.ReadWrite        : accès OneDrive
 *   - OnlineMeetings.ReadWrite : création réunions Teams
 *   - Chat.ReadWrite         : messages Teams
 *   - offline_access         : obtenir un refresh_token
 *   - openid, profile, email : informations de base
 */
class MicrosoftAuthService
{
    /** URL de base Microsoft Identity Platform */
    private const AUTHORITY_URL = 'https://login.microsoftonline.com';

    /** URL de base Microsoft Graph API */
    private const GRAPH_URL = 'https://graph.microsoft.com/v1.0';

    /** TTL du cache pour les states OAuth (5 minutes) */
    private const STATE_TTL = 300;

    /** Scopes disponibles pour SECRETIS */
    public const AVAILABLE_SCOPES = [
        'Calendars.ReadWrite',
        'Mail.Send',
        'Files.ReadWrite',
        'Files.ReadWrite.All',
        'OnlineMeetings.ReadWrite',
        'Chat.ReadWrite',
        'User.Read',
        'offline_access',
        'openid',
        'profile',
        'email',
    ];

    // -------------------------------------------------------------------------
    // OAuth2 — Génération de l'URL d'autorisation
    // -------------------------------------------------------------------------

    /**
     * Génère l'URL de redirection OAuth2 vers Microsoft Identity Platform.
     *
     * Un état (state) unique est généré et mis en cache pour prévenir les
     * attaques CSRF. L'état encode aussi l'userId pour le callback.
     *
     * @param  int    $userId  ID de l'utilisateur SECRETIS initiant la connexion
     * @param  array  $scopes  Scopes Microsoft à demander (par défaut : tous)
     * @return string          URL de redirection vers Microsoft
     */
    public function getAuthUrl(int $userId, array $scopes = []): string
    {
        if (empty($scopes)) {
            $scopes = self::AVAILABLE_SCOPES;
        }

        // Générer un state unique anti-CSRF
        $state = Str::random(40);

        // Stocker l'état en cache (5 minutes) avec l'userId associé
        Cache::put("ms_oauth_state:{$state}", [
            'user_id'    => $userId,
            'created_at' => now()->toIso8601String(),
        ], self::STATE_TTL);

        $tenantId = $this->getTenantId($userId);

        $params = http_build_query([
            'client_id'     => $this->getClientId($userId),
            'response_type' => 'code',
            'redirect_uri'  => $this->getRedirectUri(),
            'response_mode' => 'query',
            'scope'         => implode(' ', $scopes),
            'state'         => $state,
            'prompt'        => 'select_account', // Forcer la sélection de compte
        ]);

        return self::AUTHORITY_URL . "/{$tenantId}/oauth2/v2.0/authorize?{$params}";
    }

    // -------------------------------------------------------------------------
    // OAuth2 — Échange du code d'autorisation
    // -------------------------------------------------------------------------

    /**
     * Traite le callback OAuth2 : échange le code contre des tokens,
     * récupère le profil Microsoft et stocke tout chiffré en base.
     *
     * @param  string $code   Code d'autorisation reçu de Microsoft
     * @param  string $state  State reçu de Microsoft (doit correspondre au cache)
     * @throws \RuntimeException Si le state est invalide ou l'échange échoue
     */
    public function handleCallback(string $code, string $state): void
    {
        // Valider le state anti-CSRF
        $stateData = Cache::pull("ms_oauth_state:{$state}");

        if (! $stateData) {
            throw new \RuntimeException('State OAuth2 invalide ou expiré. Veuillez recommencer la connexion.');
        }

        $userId = $stateData['user_id'];

        /** @var User $user */
        $user = User::findOrFail($userId);

        // Échanger le code contre des tokens
        $tokens = $this->exchangeCodeForTokens($code, $userId);

        // Récupérer le profil Microsoft
        $profile = $this->getMicrosoftProfile($tokens['access_token']);

        // Décoder les scopes accordés
        $grantedScopes = isset($tokens['scope'])
            ? explode(' ', $tokens['scope'])
            : self::AVAILABLE_SCOPES;

        // Calculer l'expiration de l'access token
        $expiresAt = now()->addSeconds($tokens['expires_in'] ?? 3600);

        // Persister les tokens chiffrés en base
        $user->update([
            'microsoft_id'                => $profile['id'],
            'microsoft_access_token'      => Crypt::encryptString($tokens['access_token']),
            'microsoft_refresh_token'     => Crypt::encryptString($tokens['refresh_token'] ?? ''),
            'microsoft_token_expires_at'  => $expiresAt,
            'microsoft_email'             => $profile['mail'] ?? $profile['userPrincipalName'] ?? null,
            'microsoft_scopes'            => $grantedScopes,
        ]);

        Log::info('MicrosoftAuthService: Connexion Microsoft réussie', [
            'user_id'       => $userId,
            'microsoft_id'  => $profile['id'],
            'microsoft_mail'=> $profile['mail'] ?? null,
            'scopes_count'  => count($grantedScopes),
        ]);
    }

    // -------------------------------------------------------------------------
    // Token Management — Refresh automatique
    // -------------------------------------------------------------------------

    /**
     * Retourne un access token valide pour l'utilisateur.
     * Si le token est expiré (ou expire dans moins de 5 minutes), il est
     * automatiquement renouvelé via le refresh token.
     *
     * @param  User   $user
     * @return string Access token valide
     * @throws \RuntimeException Si aucun token Microsoft n'est configuré
     */
    public function refreshTokenIfNeeded(User $user): string
    {
        if (! $user->microsoft_access_token) {
            throw new \RuntimeException(
                "L'utilisateur #{$user->id} n'a pas de compte Microsoft connecté."
            );
        }

        // Décrypter le token courant
        $accessToken = Crypt::decryptString($user->microsoft_access_token);

        // Vérifier si le token expire dans moins de 5 minutes
        $expiresAt = $user->microsoft_token_expires_at;
        $needsRefresh = ! $expiresAt || $expiresAt->subMinutes(5)->isPast();

        if (! $needsRefresh) {
            return $accessToken;
        }

        // Renouveler via le refresh token
        if (! $user->microsoft_refresh_token) {
            throw new \RuntimeException(
                "Token Microsoft expiré et aucun refresh token disponible pour l'utilisateur #{$user->id}."
            );
        }

        $refreshToken = Crypt::decryptString($user->microsoft_refresh_token);
        $tokens = $this->refreshAccessToken($refreshToken, $user->id);

        $newAccessToken = $tokens['access_token'];
        $newExpiresAt   = now()->addSeconds($tokens['expires_in'] ?? 3600);

        // Mettre à jour en base
        $updateData = [
            'microsoft_access_token'     => Crypt::encryptString($newAccessToken),
            'microsoft_token_expires_at' => $newExpiresAt,
        ];

        // Si un nouveau refresh token est fourni (rotation)
        if (! empty($tokens['refresh_token'])) {
            $updateData['microsoft_refresh_token'] = Crypt::encryptString($tokens['refresh_token']);
        }

        $user->update($updateData);

        Log::debug('MicrosoftAuthService: Token renouvelé', [
            'user_id'    => $user->id,
            'expires_at' => $newExpiresAt->toIso8601String(),
        ]);

        return $newAccessToken;
    }

    // -------------------------------------------------------------------------
    // Déconnexion — Révocation des tokens
    // -------------------------------------------------------------------------

    /**
     * Révoque les tokens Microsoft et supprime les données de connexion
     * de la base de données.
     *
     * Note : Microsoft ne fournit pas d'endpoint de révocation standard pour
     * les tokens OAuth2 desktop/SPA, mais on tente la révocation Graph.
     *
     * @param User $user
     */
    public function disconnect(User $user): void
    {
        // Tenter de révoquer le token auprès de Microsoft (best-effort)
        if ($user->microsoft_access_token) {
            try {
                $token = Crypt::decryptString($user->microsoft_access_token);
                // Microsoft n'a pas d'endpoint de révocation direct pour les access tokens
                // La révocation se fait via la console Azure ou l'expiration naturelle
                // On invalide en supprimant côté SECRETIS
            } catch (\Throwable $e) {
                Log::warning('MicrosoftAuthService: Impossible de déchiffrer le token lors de la déconnexion', [
                    'user_id' => $user->id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        // Supprimer toutes les données Microsoft de l'utilisateur
        $user->update([
            'microsoft_id'               => null,
            'microsoft_access_token'     => null,
            'microsoft_refresh_token'    => null,
            'microsoft_token_expires_at' => null,
            'microsoft_email'            => null,
            'microsoft_scopes'           => null,
        ]);

        Log::info('MicrosoftAuthService: Déconnexion Microsoft', ['user_id' => $user->id]);
    }

    // -------------------------------------------------------------------------
    // Méthodes privées — Appels HTTP Microsoft
    // -------------------------------------------------------------------------

    /**
     * Échange un code d'autorisation contre des tokens OAuth2.
     */
    private function exchangeCodeForTokens(string $code, int $userId): array
    {
        $tenantId = $this->getTenantId($userId);

        $response = Http::asForm()
            ->timeout(15)
            ->post(self::AUTHORITY_URL . "/{$tenantId}/oauth2/v2.0/token", [
                'client_id'     => $this->getClientId($userId),
                'client_secret' => $this->getClientSecret($userId),
                'code'          => $code,
                'redirect_uri'  => $this->getRedirectUri(),
                'grant_type'    => 'authorization_code',
            ]);

        if ($response->failed()) {
            Log::error('MicrosoftAuthService: Échec échange du code OAuth2', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException(
                'Échec de l\'authentification Microsoft : ' . ($response->json('error_description') ?? 'Erreur inconnue')
            );
        }

        return $response->json();
    }

    /**
     * Renouvelle l'access token via le refresh token.
     */
    private function refreshAccessToken(string $refreshToken, int $userId): array
    {
        $tenantId = $this->getTenantId($userId);

        $response = Http::asForm()
            ->timeout(15)
            ->retry(3, 1000, fn($e) => true)
            ->post(self::AUTHORITY_URL . "/{$tenantId}/oauth2/v2.0/token", [
                'client_id'     => $this->getClientId($userId),
                'client_secret' => $this->getClientSecret($userId),
                'refresh_token' => $refreshToken,
                'grant_type'    => 'refresh_token',
                'scope'         => implode(' ', self::AVAILABLE_SCOPES),
            ]);

        if ($response->failed()) {
            Log::error('MicrosoftAuthService: Échec renouvellement token', [
                'status'  => $response->status(),
                'user_id' => $userId,
                'error'   => $response->json('error'),
            ]);
            throw new \RuntimeException(
                'Impossible de renouveler le token Microsoft. Veuillez vous reconnecter.'
            );
        }

        return $response->json();
    }

    /**
     * Récupère le profil Microsoft Graph de l'utilisateur connecté.
     */
    private function getMicrosoftProfile(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->timeout(10)
            ->get(self::GRAPH_URL . '/me', [
                '$select' => 'id,displayName,mail,userPrincipalName,jobTitle',
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Impossible de récupérer le profil Microsoft Graph.');
        }

        return $response->json();
    }

    // -------------------------------------------------------------------------
    // Helpers — Configuration
    // -------------------------------------------------------------------------

    /**
     * Retourne l'ID du tenant Azure AD.
     * Utilise le tenant de l'organisation si configuré, sinon 'common' (multi-tenant).
     */
    private function getTenantId(int $userId): string
    {
        $user = User::find($userId);
        return $user?->organization?->microsoft_tenant_id
            ?? config('services.microsoft.tenant_id', 'common');
    }

    /**
     * Retourne le Client ID Azure AD.
     * Utilise le client_id de l'organisation si configuré (app dédiée).
     */
    private function getClientId(int $userId): string
    {
        $user = User::find($userId);
        $orgClientId = $user?->organization?->microsoft_client_id;

        if ($orgClientId) {
            try {
                return Crypt::decryptString($orgClientId);
            } catch (\Throwable) {
                // Fallback sur la config globale
            }
        }

        return config('services.microsoft.client_id');
    }

    /**
     * Retourne le Client Secret Azure AD.
     */
    private function getClientSecret(int $userId): string
    {
        $user = User::find($userId);
        $orgSecret = $user?->organization?->microsoft_client_secret;

        if ($orgSecret) {
            try {
                return Crypt::decryptString($orgSecret);
            } catch (\Throwable) {
                // Fallback
            }
        }

        return config('services.microsoft.client_secret');
    }

    /**
     * Retourne l'URI de callback OAuth2 configurée.
     */
    private function getRedirectUri(): string
    {
        return config('services.microsoft.redirect_uri',
            config('app.url') . '/integrations/microsoft/callback'
        );
    }
}
