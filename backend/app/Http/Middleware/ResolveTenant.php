<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Symfony\Component\HttpFoundation\Response;

/**
 * ResolveTenant
 *
 * Résout l'organisation courante à partir du sous-domaine (méthode principale)
 * ou de la session (fallback). Injecte l'instance dans le conteneur Laravel
 * sous la clé 'current_organization' afin que tous les services en aval
 * puissent y accéder sans re-requêter la base.
 *
 * SECURITE : On vérifie que l'utilisateur authentifié appartient bien à
 * l'organisation résolue avant d'autoriser l'accès. Sans cette vérification,
 * un attaquant pourrait changer de sous-domaine pour accéder à des données
 * d'un autre tenant.
 */
class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $organization = $this->resolveOrganization($request);

        if ($organization === null) {
            return $this->tenantNotFound($request);
        }

        // Vérification d'appartenance : l'utilisateur connecté doit être membre
        if (Auth::check() && ! $this->userBelongsToOrganization(Auth::user(), $organization)) {
            Log::warning('Tentative d\'accès cross-tenant', [
                'user_id'         => Auth::id(),
                'attempted_org'   => $organization->id,
                'user_org'        => Auth::user()->organization_id,
                'ip'              => $request->ip(),
                'url'             => $request->fullUrl(),
            ]);

            abort(Response::HTTP_FORBIDDEN, 'Accès refusé : organisation invalide.');
        }

        // Injection dans le conteneur IoC — disponible partout via app('current_organization')
        app()->instance('current_organization', $organization);

        // Stocke l'ID en session pour les requêtes futures (notamment les SPA)
        if (Auth::check()) {
            Session::put('current_organization_id', $organization->id);
        }

        // Partage avec toutes les vues Blade
        view()->share('currentOrganization', $organization);

        return $next($request);
    }

    /**
     * Tente de résoudre l'organisation dans cet ordre :
     *  1. Sous-domaine de la requête (ex: acme.secretis.app)
     *  2. Session (utile pour les redirections post-login)
     *  3. Route parameter {organization} si présent
     */
    private function resolveOrganization(Request $request): ?Organization
    {
        // --- 1. Résolution par sous-domaine ---
        $slug = $this->extractSlugFromHost($request->getHost());

        if ($slug && $slug !== 'www' && $slug !== 'app') {
            return Organization::bySlug($slug)->active()->first();
        }

        // --- 2. Résolution par session ---
        $sessionOrgId = Session::get('current_organization_id');

        if ($sessionOrgId) {
            return Organization::active()->find($sessionOrgId);
        }

        // --- 3. Résolution par paramètre de route ---
        $routeOrg = $request->route('organization');

        if ($routeOrg instanceof Organization) {
            return $routeOrg;
        }

        if (is_string($routeOrg) || is_int($routeOrg)) {
            return Organization::active()->find($routeOrg);
        }

        return null;
    }

    /**
     * Extrait le sous-domaine depuis le hostname.
     * acme.secretis.app → "acme"
     * secretis.app      → null (pas de sous-domaine)
     */
    private function extractSlugFromHost(string $host): ?string
    {
        // Retirer le port si présent
        $host = strtolower(explode(':', $host)[0]);

        $appDomain = config('app.domain', 'secretis.app');
        $appDomain = strtolower($appDomain);

        // Le host doit se terminer par le domaine principal
        if (! str_ends_with($host, '.' . $appDomain)) {
            return null;
        }

        $subdomain = str_replace('.' . $appDomain, '', $host);

        // Valider le format du slug (alphanumérique et tirets uniquement)
        if (! preg_match('/^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$/', $subdomain)) {
            return null;
        }

        return $subdomain;
    }

    /**
     * Vérifie que l'utilisateur est membre de l'organisation.
     * Supporte les super-admins IBIG qui ont accès à tous les tenants.
     */
    private function userBelongsToOrganization(\App\Models\User $user, Organization $organization): bool
    {
        // Les super-admins IBIG ont accès à tous les tenants (pour le support)
        if ($user->hasRole('superadmin_ibig')) {
            return true;
        }

        return $user->organization_id === $organization->id;
    }

    private function tenantNotFound(Request $request): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'error'   => 'tenant_not_found',
                'message' => 'Organisation introuvable ou inactive.',
            ], Response::HTTP_NOT_FOUND);
        }

        return redirect()->route('tenant.not-found');
    }
}
