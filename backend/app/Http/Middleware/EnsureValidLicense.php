<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Services\LicenseService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnsureValidLicense
 *
 * SECURITE CRITIQUE : La vérification de licence est basée exclusivement sur
 * l'horloge SERVEUR (now() / Carbon::now()). Aucune donnée cliente n'est
 * acceptée pour cette décision. Toute tentative de manipulation via headers
 * ou paramètres est ignorée.
 */
class EnsureValidLicense
{
    /**
     * Routes exclues de la vérification de licence.
     * Inclut les routes de paiement, support et authentification.
     */
    protected array $excludedRoutes = [
        'license.renew',
        'license.checkout',
        'license.callback',
        'payment.*',
        'support.*',
        'auth.*',
        'login',
        'logout',
        'password.*',
        'account.suspended',
        'license.expired',
        'webhook.*',
    ];

    public function __construct(private LicenseService $licenseService) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Pas d'utilisateur connecté → laisser passer (AuthMiddleware gère ça)
        if (! Auth::check()) {
            return $next($request);
        }

        // Exclure les routes de paiement / support / auth
        if ($this->isExcludedRoute($request)) {
            return $next($request);
        }

        /** @var \App\Models\Organization|null $organization */
        $organization = app('current_organization');

        if (! $organization) {
            // Pas d'organisation résolue → laisser ResolveTenant gérer
            return $next($request);
        }

        // VÉRIFICATION SERVEUR — jamais basée sur des données client
        $status = $this->licenseService->checkStatus($organization->id);

        return match ($status) {
            'active', 'trial', 'grace' => $next($request),

            'expired' => $this->handleExpired($request, $organization),

            'suspended' => $this->handleSuspended($request, $organization),

            // Statut inconnu → traiter comme suspendu par sécurité
            default => $this->handleSuspended($request, $organization),
        };
    }

    /**
     * Redirige vers la page de renouvellement avec contexte minimal.
     * Ne pas exposer d'informations sensibles dans les paramètres URL.
     */
    private function handleExpired(Request $request, Organization $organization): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'error'   => 'license_expired',
                'message' => 'Votre licence a expiré. Veuillez renouveler votre abonnement.',
                'renew_url' => route('license.renew'),
            ], Response::HTTP_PAYMENT_REQUIRED);
        }

        return redirect()->route('license.expired')
            ->with('organization_name', $organization->name);
    }

    /**
     * Redirige vers la page de compte suspendu.
     */
    private function handleSuspended(Request $request, Organization $organization): Response
    {
        if ($request->expectsJson()) {
            return response()->json([
                'error'   => 'account_suspended',
                'message' => 'Votre compte a été suspendu. Contactez le support.',
                'support_url' => route('support.contact'),
            ], Response::HTTP_FORBIDDEN);
        }

        return redirect()->route('account.suspended')
            ->with('organization_name', $organization->name);
    }

    /**
     * Vérifie si la route courante est dans la liste d'exclusion.
     * Utilise le nom de route Laravel (pas l'URI) pour éviter les contournements.
     */
    private function isExcludedRoute(Request $request): bool
    {
        $routeName = $request->route()?->getName() ?? '';

        foreach ($this->excludedRoutes as $pattern) {
            if (fnmatch($pattern, $routeName)) {
                return true;
            }
        }

        return false;
    }
}
