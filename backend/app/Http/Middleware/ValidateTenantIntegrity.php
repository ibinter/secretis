<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * ValidateTenantIntegrity — Middleware critique anti-IDOR / cross-tenant
 *
 * Ce middleware vérifie que TOUTES les ressources référencées dans la requête
 * (route params, query string, body JSON) appartiennent bien au tenant courant.
 *
 * Protège contre :
 *  - IDOR (Insecure Direct Object Reference) : /api/events/9999 appartenant à un autre tenant
 *  - Cross-tenant data access : manipulation de l'organization_id dans le body
 *  - Route parameter tampering
 *
 * À appliquer sur toutes les routes tenant :
 *   Route::middleware(['auth', 'resolve.tenant', 'tenant.integrity'])->group(...)
 */
class ValidateTenantIntegrity
{
    /**
     * Champs qui contiennent un organization_id et qui ne peuvent jamais
     * être surchargés par le client.
     */
    private const PROTECTED_FIELDS = [
        'organization_id',
        'tenant_id',
        'org_id',
    ];

    /**
     * Modèles à vérifier automatiquement lors du route-model binding.
     * Clé = paramètre de route, Valeur = classe Eloquent.
     */
    private const TENANT_BOUND_MODELS = [
        'event'            => \App\Models\Event::class,
        'calendar'         => \App\Models\Calendar::class,
        'room'             => \App\Models\Room::class,
        'roomReservation'  => \App\Models\RoomReservation::class,
        'meeting'          => \App\Models\Meeting::class,
        'task'             => \App\Models\Task::class,
        'mailRegistry'     => \App\Models\MailRegistry::class,
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return $next($request);
        }

        $user            = Auth::user();
        $currentOrgId    = app()->bound('current_organization')
            ? app('current_organization')?->id
            : $user->organization_id;

        // Les super-admins IBIG sont exemptés (accès cross-tenant légitimes)
        if ($user->hasRole('superadmin_ibig')) {
            return $next($request);
        }

        // 1. Vérifier que le client n'essaie pas de surcharger organization_id
        if ($this->detectOrgIdTampering($request, $currentOrgId)) {
            return $this->blockCrossTenantAccess($request, $user, $currentOrgId, 'org_id_tampering');
        }

        // 2. Vérifier les modèles liés via route model binding
        if ($violation = $this->checkBoundModels($request, $currentOrgId)) {
            return $this->blockCrossTenantAccess($request, $user, $currentOrgId, $violation);
        }

        return $next($request);
    }

    /**
     * Vérifie si le client tente d'injecter un organization_id différent.
     *
     * Cas bloqués :
     *  - POST /api/events avec { "organization_id": 999 } (autre tenant)
     *  - GET /api/events?organization_id=999
     *  - Route param organization_id différent du tenant courant
     */
    private function detectOrgIdTampering(Request $request, int $currentOrgId): bool
    {
        foreach (self::PROTECTED_FIELDS as $field) {
            // Vérifier dans le body (JSON ou form-data)
            $bodyValue = $request->input($field);
            if ($bodyValue !== null && (int) $bodyValue !== $currentOrgId) {
                return true;
            }

            // Vérifier dans la query string
            $queryValue = $request->query($field);
            if ($queryValue !== null && (int) $queryValue !== $currentOrgId) {
                return true;
            }

            // Vérifier dans les paramètres de route
            $routeValue = $request->route($field);
            if ($routeValue !== null && (int) $routeValue !== $currentOrgId) {
                return true;
            }
        }

        return false;
    }

    /**
     * Vérifie que les modèles résolus via route-model binding
     * appartiennent bien au tenant courant.
     *
     * Exemple : GET /api/events/42 → Event::find(42) → vérifie event->organization_id
     */
    private function checkBoundModels(Request $request, int $currentOrgId): ?string
    {
        foreach (self::TENANT_BOUND_MODELS as $param => $modelClass) {
            $model = $request->route($param);

            if ($model instanceof Model) {
                $modelOrgId = $model->organization_id ?? null;

                if ($modelOrgId !== null && (int) $modelOrgId !== $currentOrgId) {
                    return "cross_tenant_model_access:{$param}:{$model->getKey()}";
                }
            }
        }

        return null;
    }

    /**
     * Bloque l'accès, log l'incident de sécurité et retourne 403.
     *
     * Politique de log : TOUJOURS logger même si c'est peut-être une erreur légitime.
     * Les faux positifs sont détectables, les vrais positifs sont critiques.
     */
    private function blockCrossTenantAccess(
        Request $request,
        \App\Models\User $user,
        int $currentOrgId,
        string $violationType
    ): Response {
        // Log de sécurité structuré pour SIEM / alerting
        Log::channel('security')->critical('CROSS-TENANT ACCESS ATTEMPT BLOCKED', [
            'violation_type'   => $violationType,
            'user_id'          => $user->id,
            'user_email'       => $user->email,
            'user_org_id'      => $user->organization_id,
            'current_org_id'   => $currentOrgId,
            'method'           => $request->method(),
            'url'              => $request->fullUrl(),
            'route'            => $request->route()?->getName(),
            'route_params'     => $request->route()?->parameters() ?? [],
            'body_keys'        => array_keys($request->all()),
            'ip'               => $request->ip(),
            'user_agent'       => $request->userAgent(),
            'session_id'       => session()->getId(),
            'timestamp'        => now()->toIso8601String(),
        ]);

        // Aussi via AuditService si disponible
        try {
            app(\App\Services\AuditService::class)->log(
                action: 'cross_tenant_access_blocked',
                module: 'security',
                resourceType: 'middleware',
                resourceId: $violationType,
                newValues: [
                    'url'              => $request->fullUrl(),
                    'method'           => $request->method(),
                    'violation_type'   => $violationType,
                    'attempted_org_id' => $request->input('organization_id'),
                ],
            );
        } catch (\Throwable $e) {
            Log::error('AuditService failed in ValidateTenantIntegrity', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'error'   => 'forbidden',
            'message' => 'Accès refusé : ressource appartenant à une autre organisation.',
            'code'    => 'CROSS_TENANT_ACCESS',
        ], Response::HTTP_FORBIDDEN);
    }
}
