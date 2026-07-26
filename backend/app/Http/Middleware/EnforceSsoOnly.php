<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnforceSsoOnly — Bloque la connexion par mot de passe si SSO-only est actif
 *
 * Si l'organisation a le mode "SSO uniquement" activé :
 *  - Toute tentative de login par mot de passe est redirigée vers le SSO
 *  - Exception : super admins IBIG (superadmin_ibig)
 *  - Exception : comptes de secours marqués `is_sso_only = false` explicitement
 *
 * Ce middleware est appliqué sur la route POST /auth/login uniquement.
 *
 * SÉCURITÉ :
 *  - Empêche l'accès par mot de passe quand le SI impose SSO
 *  - Les comptes de secours doivent être explicitement provisionnés
 *  - Les super admins IBIG conservent toujours l'accès password (support)
 */
class EnforceSsoOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        // Résoudre l'organisation à partir de l'email soumis
        $email = strtolower($request->input('email', ''));

        if (! $email) {
            return $next($request);
        }

        $org = $this->resolveOrgFromRequest($request);

        if (! $org) {
            return $next($request);
        }

        // Vérifier si l'organisation a SSO-only activé
        $isSsoOnly = (bool) ($org->settings['is_sso_only'] ?? false);

        if (! $isSsoOnly) {
            return $next($request);
        }

        // Chercher l'utilisateur pour vérifier les exceptions
        $user = \App\Models\User::where('organization_id', $org->id)
            ->where('email', $email)
            ->first();

        // Exception 1 : super admin IBIG → toujours autorisé
        if ($user && $user->role === 'superadmin_ibig') {
            return $next($request);
        }

        // Exception 2 : compte de secours (is_sso_only = false explicitement)
        if ($user && $user->is_sso_only === false) {
            return $next($request);
        }

        // Bloquer : rediriger vers SSO
        $ssoLoginUrl = url("/sso/{$org->slug}/login");

        if ($request->expectsJson()) {
            return response()->json([
                'error'      => 'sso_only',
                'message'    => 'Cette organisation impose la connexion via SSO. La connexion par mot de passe est désactivée.',
                'sso_url'    => $ssoLoginUrl,
                'org_name'   => $org->name,
            ], Response::HTTP_FORBIDDEN);
        }

        return redirect($ssoLoginUrl)->withErrors([
            'email' => "Votre organisation impose la connexion via SSO. Cliquez pour vous connecter.",
        ])->with('sso_redirect', $ssoLoginUrl);
    }

    /**
     * Tente de résoudre l'organisation depuis :
     *  1. Le paramètre org de la requête
     *  2. Le sous-domaine de la requête
     *  3. Le domaine de l'email soumis (via sso_providers.email_domains)
     */
    private function resolveOrgFromRequest(Request $request): ?Organization
    {
        // 1. Paramètre org explicite
        $orgParam = $request->input('org') ?? $request->query('org');
        if ($orgParam) {
            return Organization::where('slug', $orgParam)->where('status', 'active')->first();
        }

        // 2. Sous-domaine
        $host      = $request->getHost();
        $appDomain = config('app.domain', 'secretis.app');

        if (str_ends_with($host, '.' . $appDomain)) {
            $slug = str_replace('.' . $appDomain, '', $host);
            $org  = Organization::where('slug', $slug)->where('status', 'active')->first();
            if ($org) {
                return $org;
            }
        }

        // 3. Résolution par domaine email via sso_providers
        $email  = strtolower($request->input('email', ''));
        $domain = substr($email, strpos($email, '@') + 1);

        if ($domain) {
            $provider = \App\Models\SsoProvider::where('is_active', true)
                ->whereJsonContains('email_domains', $domain)
                ->first();

            if ($provider) {
                return Organization::find($provider->organization_id);
            }
        }

        return null;
    }
}
