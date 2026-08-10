<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SsoProvider;
use App\Services\AuditService;
use App\Services\OidcService;
use App\Services\SamlService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response as HttpResponse;
use Throwable;

/**
 * SsoController — Points d'entrée SSO pour les utilisateurs
 *
 * Routes publiques (pas d'authentification requise) :
 *  GET  /sso/{subdomain}/login           → redirige vers l'IdP SAML ou OIDC
 *  POST /sso/{subdomain}/callback        → callback SAML (POST Binding)
 *  GET  /sso/{subdomain}/metadata.xml    → SP metadata XML (SAML)
 *  GET  /sso/oidc/{subdomain}/callback   → callback OIDC (authorization code)
 *  GET  /auth/sso-detect                 → détecte le SSO par domaine email
 *
 * SÉCURITÉ :
 *  - Validation du subdomain (longueur, alphanumérique)
 *  - Rate limiting sur /login (10 req/min par IP)
 *  - Audit log de chaque tentative SSO
 *  - Messages d'erreur génériques (pas de fuite d'info)
 */
class SsoController extends Controller
{
    public function __construct(
        private SamlService  $samlService,
        private OidcService  $oidcService,
        private AuditService $auditService,
    ) {}

    // -------------------------------------------------------------------------
    // GET /sso/{subdomain}/login
    // Redirige l'utilisateur vers l'IdP SSO configuré (SAML ou OIDC)
    // -------------------------------------------------------------------------

    public function login(string $subdomain): RedirectResponse
    {
        $org = $this->resolveOrg($subdomain);

        // Détecter le type de provider actif
        $provider = SsoProvider::where('organization_id', $org->id)
            ->where('is_active', true)
            ->first();

        if (! $provider) {
            return redirect('/login')->withErrors(['sso' => 'SSO non configuré pour cette organisation.']);
        }

        try {
            $url = match ($provider->type) {
                'saml' => $this->samlService->getLoginUrl($org),
                'oidc' => $this->oidcService->getAuthUrl($org),
                'ldap' => redirect('/login?org=' . $subdomain . '&method=ldap'), // LDAP = form login
                default => throw new \RuntimeException("Type SSO inconnu : {$provider->type}"),
            };

            $this->auditService->log(
                action: 'sso.login_initiated',
                targetType: 'organization',
                targetId: $org->id,
                metadata: ['provider_type' => $provider->type, 'subdomain' => $subdomain],
            );

            if (is_string($url)) {
                return redirect()->away($url);
            }

            return $url;
        } catch (Throwable $e) {
            Log::error('SSO login error', ['subdomain' => $subdomain, 'error' => $e->getMessage()]);
            return redirect('/login')->withErrors(['sso' => 'Erreur lors de la redirection SSO. Contactez votre administrateur.']);
        }
    }

    // -------------------------------------------------------------------------
    // POST /sso/{subdomain}/callback
    // Reçoit la SAMLResponse de l'IdP (HTTP-POST Binding)
    // -------------------------------------------------------------------------

    public function samlCallback(Request $request, string $subdomain): RedirectResponse
    {
        $org = $this->resolveOrg($subdomain);

        $samlResponse = $request->input('SAMLResponse');
        if (! $samlResponse) {
            Log::warning('SAML callback sans SAMLResponse', ['subdomain' => $subdomain, 'ip' => $request->ip()]);
            return redirect('/login')->withErrors(['sso' => 'Réponse SAML invalide.']);
        }

        try {
            $user = $this->samlService->handleCallback($samlResponse, $org);

            Auth::login($user, remember: false);

            $this->auditService->log(
                action: 'sso.login_success',
                userId: $user->id,
                targetType: 'user',
                targetId: $user->id,
                metadata: ['method' => 'saml', 'org' => $org->slug],
            );

            return redirect()->intended(
                route('dashboard', [], absolute: false)
            );
        } catch (Throwable $e) {
            Log::warning('SAML callback échec', [
                'subdomain' => $subdomain,
                'error'     => $e->getMessage(),
                'ip'        => $request->ip(),
            ]);

            $this->auditService->log(
                action: 'sso.login_failed',
                targetType: 'organization',
                targetId: $org->id,
                metadata: ['method' => 'saml', 'error' => $e->getMessage()],
            );

            return redirect('/login')->withErrors([
                'sso' => 'Authentification SSO échouée. Vérifiez votre configuration ou contactez votre administrateur.',
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // GET /sso/{subdomain}/metadata.xml
    // Retourne le XML de metadata SP pour que l'IdP puisse configurer SECRETIS
    // -------------------------------------------------------------------------

    public function metadata(string $subdomain): Response
    {
        $org = $this->resolveOrg($subdomain);

        try {
            $xml = $this->samlService->getMetadata($org);

            return response($xml, 200, [
                'Content-Type'        => 'application/samlmetadata+xml; charset=UTF-8',
                'Content-Disposition' => 'inline; filename="metadata-' . $subdomain . '.xml"',
                'Cache-Control'       => 'public, max-age=86400',
            ]);
        } catch (Throwable $e) {
            Log::error('SP Metadata error', ['subdomain' => $subdomain, 'error' => $e->getMessage()]);
            abort(HttpResponse::HTTP_SERVICE_UNAVAILABLE, 'Metadata non disponible — SAML non configuré.');
        }
    }

    // -------------------------------------------------------------------------
    // GET /sso/oidc/{subdomain}/callback
    // Reçoit le code authorization de l'IdP OIDC
    // -------------------------------------------------------------------------

    public function oidcCallback(Request $request, string $subdomain): RedirectResponse
    {
        $org = $this->resolveOrg($subdomain);

        // Gestion des erreurs retournées par l'IdP
        if ($request->has('error')) {
            $errDesc = $request->query('error_description', $request->query('error'));
            Log::warning('OIDC callback erreur IdP', ['error' => $errDesc, 'subdomain' => $subdomain]);
            return redirect('/login')->withErrors(['sso' => "L'IdP a retourné une erreur : {$errDesc}"]);
        }

        $code = $request->query('code');
        if (! $code) {
            return redirect('/login')->withErrors(['sso' => 'Code OIDC manquant.']);
        }

        try {
            $user = $this->oidcService->handleCallback($code, $org);

            Auth::login($user, remember: false);

            $this->auditService->log(
                action: 'sso.login_success',
                userId: $user->id,
                targetType: 'user',
                targetId: $user->id,
                metadata: ['method' => 'oidc', 'org' => $org->slug],
            );

            return redirect()->intended(route('dashboard', [], absolute: false));
        } catch (Throwable $e) {
            Log::warning('OIDC callback échec', [
                'subdomain' => $subdomain,
                'error'     => $e->getMessage(),
                'ip'        => $request->ip(),
            ]);

            return redirect('/login')->withErrors([
                'sso' => 'Authentification OIDC échouée. Contactez votre administrateur.',
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // GET /auth/sso-detect?email=user@acme.com
    // Détecte si une organisation a SSO actif pour un domaine email donné
    // -------------------------------------------------------------------------

    public function detectSso(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email', 'max:255']]);

        $email  = strtolower($request->input('email'));
        $domain = substr($email, strpos($email, '@') + 1);

        // Chercher un provider avec ce domaine email
        $provider = SsoProvider::where('is_active', true)
            ->whereJsonContains('email_domains', $domain)
            ->with('organization:id,slug,name')
            ->first();

        if (! $provider) {
            return response()->json(['sso_enabled' => false]);
        }

        $org = $provider->organization;

        return response()->json([
            'sso_enabled'   => true,
            'provider_type' => $provider->type,
            'provider_name' => $provider->name,
            'organization'  => [
                'name' => $org->name,
                'slug' => $org->slug,
            ],
            'login_url'     => url("/sso/{$org->slug}/login"),
            'logo'          => $this->providerLogo($provider->type, decrypt($provider->config)),
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function resolveOrg(string $subdomain): Organization
    {
        if (! preg_match('/^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$/', $subdomain)) {
            abort(HttpResponse::HTTP_BAD_REQUEST, 'Identifiant organisation invalide.');
        }

        $org = Organization::where('slug', $subdomain)
            ->where('status', 'active')
            ->first();

        if (! $org) {
            abort(HttpResponse::HTTP_NOT_FOUND, "Organisation '{$subdomain}' introuvable.");
        }

        return $org;
    }

    private function providerLogo(string $type, array $config): ?string
    {
        // Détection du logo par discovery URL ou type
        if ($type === 'oidc') {
            $discovery = $config['discovery_url'] ?? '';
            if (str_contains($discovery, 'google')) {
                return 'google';
            }
            if (str_contains($discovery, 'microsoft') || str_contains($discovery, 'azure')) {
                return 'microsoft';
            }
            if (str_contains($discovery, 'okta')) {
                return 'okta';
            }
            if (str_contains($discovery, 'keycloak')) {
                return 'keycloak';
            }
        }

        return $type; // 'saml', 'ldap', etc.
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }

    // Page SSO admin
    public function settings(\Illuminate\Http\Request $request): \Inertia\Response
    {
        $org      = \Illuminate\Support\Facades\Auth::user()->load('organization')->organization;
        $provider = \App\Models\SsoProvider::where('organization_id', $org->id)->first();
        return \Inertia\Inertia::render('Parametres/SsoConfig', [
            'organization' => $org->only(['id', 'name', 'slug']),
            'provider'     => $provider ? $provider->only(['id', 'type', 'name', 'is_active', 'email_domains']) : null,
        ]);
    }
}
