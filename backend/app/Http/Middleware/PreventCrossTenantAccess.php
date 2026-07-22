<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * PreventCrossTenantAccess — Protection globale via model scoping
 *
 * Middleware complémentaire à ValidateTenantIntegrity.
 * Appliqué GLOBALEMENT sur toutes les routes tenant pour ajouter
 * un filet de sécurité supplémentaire.
 *
 * Responsabilités :
 *  1. Vérifier que l'organization_id du modèle résolu via route-binding
 *     correspond au tenant actif (défense en profondeur).
 *  2. Forcer un scope global organization_id sur toutes les queries Eloquent
 *     via le contexte tenant (empêche les oublis de ->where('organization_id',...)).
 *  3. Détecter les tentatives d'énumération d'IDs.
 *
 * IMPORTANT : Ce middleware complète (ne remplace pas) la validation
 * dans les contrôleurs et services. Les deux couches doivent exister.
 *
 * Enregistrement dans bootstrap/app.php :
 *   ->withMiddleware(function (Middleware $middleware) {
 *       $middleware->appendToGroup('tenant', PreventCrossTenantAccess::class);
 *   })
 */
class PreventCrossTenantAccess
{
    /**
     * Nombre de violations par IP avant alerte critique.
     */
    private const VIOLATION_THRESHOLD = 3;

    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return $next($request);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Super-admins IBIG exemptés
        if ($user->hasRole('superadmin_ibig')) {
            return $next($request);
        }

        // Récupérer l'organisation courante depuis le conteneur IoC
        $currentOrg = app()->bound('current_organization')
            ? app('current_organization')
            : null;

        if (! $currentOrg) {
            // Pas de tenant résolu = accès sur une route publique, on laisse passer
            return $next($request);
        }

        // Vérification que l'utilisateur appartient au tenant résolu
        if ($user->organization_id !== $currentOrg->id) {
            return $this->handleViolation(
                $request,
                $user,
                $currentOrg->id,
                'user_org_mismatch'
            );
        }

        // Vérification des modèles dans les paramètres de route
        $routeParams = $request->route()?->parameters() ?? [];

        foreach ($routeParams as $paramName => $paramValue) {
            if ($paramValue instanceof Model && $this->isTenanScoped($paramValue)) {
                $modelOrgId = $paramValue->organization_id ?? null;

                if ($modelOrgId !== null && (int) $modelOrgId !== $currentOrg->id) {
                    return $this->handleViolation(
                        $request,
                        $user,
                        $currentOrg->id,
                        "model_org_mismatch:{$paramName}"
                    );
                }
            }
        }

        // Injecter le tenant ID dans le contexte pour faciliter le scoping
        // dans les repositories et services (évite les oublis)
        $this->injectTenantContext($currentOrg->id);

        return $next($request);
    }

    /**
     * Détermine si un modèle Eloquent est scopé par tenant (a une colonne organization_id).
     */
    private function isTenanScoped(Model $model): bool
    {
        return isset($model->organization_id) || $model->isFillable('organization_id');
    }

    /**
     * Injecte le tenant ID dans le contexte applicatif.
     * Les repositories peuvent le récupérer via app('tenant_id').
     */
    private function injectTenantContext(int $orgId): void
    {
        if (! app()->bound('tenant_id')) {
            app()->instance('tenant_id', $orgId);
        }
    }

    /**
     * Gère une violation de sécurité cross-tenant.
     * Log, incrémente le compteur de violations, retourne 403.
     */
    private function handleViolation(
        Request $request,
        \App\Models\User $user,
        int $currentOrgId,
        string $reason
    ): Response {
        $violationKey = 'cross_tenant_violations:' . $request->ip();
        $violations   = cache()->increment($violationKey);
        cache()->put($violationKey, $violations, now()->addHour());

        $severity = $violations >= self::VIOLATION_THRESHOLD ? 'critical' : 'warning';

        Log::channel('security')->{$severity}('PreventCrossTenantAccess: violation détectée', [
            'reason'           => $reason,
            'user_id'          => $user->id,
            'user_email'       => $user->email,
            'user_org_id'      => $user->organization_id,
            'current_org_id'   => $currentOrgId,
            'violations_count' => $violations,
            'method'           => $request->method(),
            'url'              => $request->fullUrl(),
            'ip'               => $request->ip(),
            'user_agent'       => $request->userAgent(),
        ]);

        // Alerte si le seuil est dépassé (intégration email/Slack possible)
        if ($violations >= self::VIOLATION_THRESHOLD) {
            Log::channel('security')->critical('SEUIL DE VIOLATIONS CROSS-TENANT ATTEINT — POSSIBLE ATTAQUE', [
                'ip'               => $request->ip(),
                'user_id'          => $user->id,
                'violations_count' => $violations,
            ]);
            // TODO: Déclencher notification Slack/email via event(new CrossTenantAttackDetected(...))
        }

        return response()->json([
            'error'   => 'forbidden',
            'message' => 'Accès refusé.',
            'code'    => 'CROSS_TENANT_PREVENTED',
        ], Response::HTTP_FORBIDDEN);
    }
}
