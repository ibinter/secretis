<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SsoProvider;
use App\Services\AuditService;
use App\Services\LdapService;
use App\Services\OidcService;
use App\Services\SamlService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * SsoConfigController — Gestion de la configuration SSO par les admins org
 *
 * Toutes ces routes nécessitent : auth + rôle admin + appartenance à l'org
 *
 * GET    /admin/sso            → config SSO actuelle
 * POST   /admin/sso/saml       → configurer SAML
 * POST   /admin/sso/ldap       → configurer LDAP
 * POST   /admin/sso/oidc       → configurer OIDC
 * POST   /admin/sso/test       → tester la connexion
 * POST   /admin/sso/sync       → synchroniser les utilisateurs LDAP
 * DELETE /admin/sso            → désactiver SSO
 *
 * SÉCURITÉ :
 *  - La config est chiffrée avant stockage (AES-256-GCM)
 *  - Le bind_password LDAP n'est jamais retourné dans les réponses API
 *  - Les certificats sont validés avant stockage
 *  - Audit log de chaque modification
 */
class SsoConfigController extends Controller
{
    public function __construct(
        private SamlService  $samlService,
        private LdapService  $ldapService,
        private OidcService  $oidcService,
        private AuditService $auditService,
    ) {}

    // -------------------------------------------------------------------------
    // GET /admin/sso
    // -------------------------------------------------------------------------

    public function index(): JsonResponse
    {
        $org       = app('current_organization');
        $providers = SsoProvider::where('organization_id', $org->id)
            ->get()
            ->map(fn ($p) => $this->sanitizeProvider($p));

        return response()->json([
            'providers'  => $providers,
            'is_sso_only' => (bool) ($org->settings['is_sso_only'] ?? false),
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /admin/sso/saml
    // -------------------------------------------------------------------------

    public function configureSaml(Request $request): JsonResponse
    {
        $org = app('current_organization');

        $validated = $request->validate([
            'name'                         => ['required', 'string', 'max:100'],
            'idp_sso_url'                  => ['required', 'url', 'max:500'],
            'idp_cert'                     => ['required', 'string', 'max:10000'],
            'attribute_mapping'            => ['nullable', 'array'],
            'attribute_mapping.email'      => ['nullable', 'string', 'max:255'],
            'attribute_mapping.firstName'  => ['nullable', 'string', 'max:255'],
            'attribute_mapping.lastName'   => ['nullable', 'string', 'max:255'],
            'attribute_mapping.groups'     => ['nullable', 'string', 'max:255'],
            'role_mapping'                 => ['nullable', 'array'],
            'email_domains'                => ['nullable', 'array'],
            'email_domains.*'              => ['string', 'max:100'],
            'is_active'                    => ['boolean'],
        ]);

        // Valider le certificat IdP
        if (! $this->isValidCertificate($validated['idp_cert'])) {
            return response()->json([
                'message' => 'Le certificat IdP est invalide ou malformé.',
                'errors'  => ['idp_cert' => ['Certificat X.509 invalide.']],
            ], 422);
        }

        $config = [
            'idp_sso_url'       => $validated['idp_sso_url'],
            'idp_cert'          => $validated['idp_cert'],
            'attribute_mapping' => $validated['attribute_mapping'] ?? [
                'email'     => 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
                'firstName' => 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
                'lastName'  => 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
                'groups'    => 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
            ],
            'role_mapping'      => $validated['role_mapping'] ?? [],
        ];

        $provider = SsoProvider::updateOrCreate(
            ['organization_id' => $org->id, 'type' => 'saml'],
            [
                'name'         => $validated['name'],
                'is_active'    => $validated['is_active'] ?? false,
                'config'       => encrypt(json_encode($config)),
                'email_domains'=> $validated['email_domains'] ?? [],
            ]
        );

        // Générer un certificat SP si absent
        $decrypted = json_decode(decrypt($provider->config), true);
        if (empty($decrypted['sp_cert'])) {
            try {
                $this->samlService->generateSpCertificate($org);
                $provider->refresh();
            } catch (Throwable $e) {
                // Non bloquant — l'admin peut générer plus tard
            }
        }

        $this->auditService->log(
            action: 'sso.saml_configured',
            userId: Auth::id(),
            targetType: 'sso_provider',
            targetId: $provider->id,
            metadata: ['org' => $org->slug, 'idp_url' => $validated['idp_sso_url']],
        );

        return response()->json([
            'message'  => 'Configuration SAML enregistrée.',
            'provider' => $this->sanitizeProvider($provider->fresh()),
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /admin/sso/ldap
    // -------------------------------------------------------------------------

    public function configureLdap(Request $request): JsonResponse
    {
        $org = app('current_organization');

        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'host'          => ['required', 'string', 'max:255'],
            'port'          => ['required', 'integer', 'min:1', 'max:65535'],
            'use_ssl'       => ['boolean'],
            'use_tls'       => ['boolean'],
            'base_dn'       => ['required', 'string', 'max:500'],
            'bind_dn'       => ['required', 'string', 'max:500'],
            'bind_password' => ['required', 'string', 'max:255'],
            'user_filter'   => ['nullable', 'string', 'max:500'],
            'sync_filter'   => ['nullable', 'string', 'max:500'],
            'role_mapping'  => ['nullable', 'array'],
            'email_domains' => ['nullable', 'array'],
            'email_domains.*'=> ['string', 'max:100'],
            'is_active'     => ['boolean'],
        ]);

        $config = [
            'host'          => $validated['host'],
            'port'          => $validated['port'],
            'use_ssl'       => $validated['use_ssl'] ?? false,
            'use_tls'       => $validated['use_tls'] ?? false,
            'base_dn'       => $validated['base_dn'],
            'bind_dn'       => $validated['bind_dn'],
            'bind_password' => $validated['bind_password'],
            'user_filter'   => $validated['user_filter']  ?? '(&(objectClass=user)(mail=*))',
            'sync_filter'   => $validated['sync_filter']  ?? '(&(objectClass=user)(mail=*))',
            'role_mapping'  => $validated['role_mapping'] ?? [],
        ];

        $provider = SsoProvider::updateOrCreate(
            ['organization_id' => $org->id, 'type' => 'ldap'],
            [
                'name'          => $validated['name'],
                'is_active'     => $validated['is_active'] ?? false,
                'config'        => encrypt(json_encode($config)),
                'email_domains' => $validated['email_domains'] ?? [],
            ]
        );

        $this->auditService->log(
            action: 'sso.ldap_configured',
            userId: Auth::id(),
            targetType: 'sso_provider',
            targetId: $provider->id,
            metadata: ['org' => $org->slug, 'host' => $validated['host']],
        );

        return response()->json([
            'message'  => 'Configuration LDAP enregistrée.',
            'provider' => $this->sanitizeProvider($provider->fresh()),
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /admin/sso/oidc
    // -------------------------------------------------------------------------

    public function configureOidc(Request $request): JsonResponse
    {
        $org = app('current_organization');

        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'client_id'     => ['required', 'string', 'max:500'],
            'client_secret' => ['required', 'string', 'max:500'],
            'discovery_url' => ['required', 'url', 'max:500'],
            'scopes'        => ['nullable', 'string', 'max:255'],
            'role_mapping'  => ['nullable', 'array'],
            'email_domains' => ['nullable', 'array'],
            'email_domains.*'=> ['string', 'max:100'],
            'is_active'     => ['boolean'],
        ]);

        $config = [
            'client_id'     => $validated['client_id'],
            'client_secret' => $validated['client_secret'],
            'discovery_url' => $validated['discovery_url'],
            'scopes'        => $validated['scopes'] ?? 'openid email profile',
            'role_mapping'  => $validated['role_mapping'] ?? [],
        ];

        $provider = SsoProvider::updateOrCreate(
            ['organization_id' => $org->id, 'type' => 'oidc'],
            [
                'name'          => $validated['name'],
                'is_active'     => $validated['is_active'] ?? false,
                'config'        => encrypt(json_encode($config)),
                'email_domains' => $validated['email_domains'] ?? [],
            ]
        );

        $this->auditService->log(
            action: 'sso.oidc_configured',
            userId: Auth::id(),
            targetType: 'sso_provider',
            targetId: $provider->id,
            metadata: ['org' => $org->slug, 'discovery_url' => $validated['discovery_url']],
        );

        return response()->json([
            'message'  => 'Configuration OIDC enregistrée.',
            'provider' => $this->sanitizeProvider($provider->fresh()),
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /admin/sso/test
    // -------------------------------------------------------------------------

    public function testConnection(Request $request): JsonResponse
    {
        $org = app('current_organization');

        $request->validate([
            'type' => ['required', Rule::in(['saml', 'ldap', 'oidc'])],
        ]);

        $type = $request->input('type');

        try {
            $result = match ($type) {
                'ldap' => $this->testLdap($org, $request),
                'saml' => $this->testSaml($org),
                'oidc' => $this->testOidc($org),
            };

            return response()->json(['success' => true, 'message' => $result]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    // -------------------------------------------------------------------------
    // POST /admin/sso/sync
    // -------------------------------------------------------------------------

    public function syncUsers(): JsonResponse
    {
        $org = app('current_organization');

        try {
            $stats = $this->ldapService->syncUsers($org);

            $this->auditService->log(
                action: 'sso.ldap_sync',
                userId: Auth::id(),
                targetType: 'organization',
                targetId: $org->id,
                metadata: $stats,
            );

            return response()->json([
                'message' => 'Synchronisation LDAP terminée.',
                'stats'   => $stats,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'Synchronisation échouée : ' . $e->getMessage(),
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // DELETE /admin/sso
    // -------------------------------------------------------------------------

    public function disable(Request $request): JsonResponse
    {
        $org = app('current_organization');

        $request->validate([
            'type' => ['required', Rule::in(['saml', 'ldap', 'oidc', 'all'])],
        ]);

        $type = $request->input('type');

        $query = SsoProvider::where('organization_id', $org->id);
        if ($type !== 'all') {
            $query->where('type', $type);
        }

        $query->update(['is_active' => false]);

        $this->auditService->log(
            action: 'sso.disabled',
            userId: Auth::id(),
            targetType: 'organization',
            targetId: $org->id,
            metadata: ['type' => $type],
        );

        return response()->json(['message' => 'SSO désactivé.']);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Retourne la config sans les données sensibles (mot de passe, clé privée).
     */
    private function sanitizeProvider(SsoProvider $provider): array
    {
        try {
            $raw    = decrypt($provider->config);
            $config = is_array($raw) ? $raw : json_decode($raw, true);
        } catch (Throwable) {
            $config = [];
        }

        // Masquer les champs sensibles
        unset($config['bind_password'], $config['client_secret'], $config['sp_key']);

        if (isset($config['idp_cert'])) {
            $config['idp_cert_fingerprint'] = openssl_x509_fingerprint(
                $this->normalizeCert($config['idp_cert']),
                'sha256'
            ) ?: 'invalide';
            $config['idp_cert'] = '*** masqué — ' . strlen($config['idp_cert']) . ' caractères ***';
        }

        return [
            'id'              => $provider->id,
            'name'            => $provider->name,
            'type'            => $provider->type,
            'is_active'       => $provider->is_active,
            'email_domains'   => $provider->email_domains ?? [],
            'last_sync_at'    => $provider->last_sync_at?->toIso8601String(),
            'last_sync_stats' => $provider->last_sync_stats,
            'config'          => $config,
        ];
    }

    private function testLdap($org, Request $request): string
    {
        // Si des identifiants de test sont fournis, tester l'authentification
        $testUser = $request->input('test_username');
        $testPass = $request->input('test_password');

        if ($testUser && $testPass) {
            $result = $this->ldapService->authenticate($testUser, $testPass, $org);
            if (! $result) {
                throw new \RuntimeException("Authentification LDAP échouée pour '{$testUser}'.");
            }
            return "Authentification réussie pour '{$testUser}' (email: {$result['email']}).";
        }

        // Sinon tester juste la connexion
        $provider = \App\Models\SsoProvider::where('organization_id', $org->id)
            ->where('type', 'ldap')
            ->where('is_active', true)
            ->firstOrFail();

        $raw    = decrypt($provider->config);
        $config = is_array($raw) ? $raw : json_decode($raw, true);

        if (! $this->ldapService->testConnection($config)) {
            throw new \RuntimeException('Connexion LDAP échouée. Vérifiez host, port et identifiants du service account.');
        }

        return "Connexion LDAP réussie vers {$config['host']}:{$config['port']}.";
    }

    private function testSaml($org): string
    {
        // Pour SAML, on vérifie la config et génère l'URL de login
        $url = $this->samlService->getLoginUrl($org);
        return "Configuration SAML valide. URL de redirection générée. IdP : " . parse_url($url, PHP_URL_HOST);
    }

    private function testOidc($org): string
    {
        $url = $this->oidcService->getAuthUrl($org);
        return "Configuration OIDC valide. Discovery chargée. URL auth : " . parse_url($url, PHP_URL_HOST);
    }

    private function normalizeCert(string $cert): string
    {
        $stripped = preg_replace('/-----[^-]+-----|\s/', '', $cert);
        return "-----BEGIN CERTIFICATE-----\n" . chunk_split($stripped, 64, "\n") . "-----END CERTIFICATE-----\n";
    }

    private function isValidCertificate(string $cert): bool
    {
        $pem = $this->normalizeCert($cert);
        return openssl_x509_read($pem) !== false;
    }
}
