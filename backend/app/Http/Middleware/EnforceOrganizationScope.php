<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnforceOrganizationScope — Vérification stricte du périmètre organisation.
 *
 * Garantit que :
 *  1. L'utilisateur authentifié possède un organization_id non null.
 *  2. Tout organization_id passé en query string ou body correspond
 *     exactement à celui de l'utilisateur (prévient l'injection de tenant).
 *  3. Tout modèle Eloquent résolu via route model binding appartient
 *     à la même organisation.
 *
 * Les super-admins (rôle superadmin_ibig) sont exemptés de toutes ces
 * vérifications pour permettre l'administration cross-tenant.
 *
 * Toute violation est loggée dans le canal « security » et, au-delà
 * du seuil VIOLATION_THRESHOLD, génère une alerte critique.
 *
 * Enregistrement dans bootstrap/app.php :
 *   $middleware->api(append: [EnforceOrganizationScope::class])
 */
class EnforceOrganizationScope
{
    /**
     * Noms de paramètres reconnus comme tenant injections.
     */
    private const ORG_PARAM_NAMES = [
        'organization_id',
        'org_id',
        'tenant_id',
    ];

    /**
     * Nombre de violations par IP avant alerte de niveau critical.
     */
    private const VIOLATION_THRESHOLD = 3;

    public function handle(Request $request, Closure $next): Response
    {
        // Routes publiques ou non authentifiées : on laisse passer
        if (! Auth::check()) {
            return $next($request);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Super-admins IBIG SOFT : exemptés du scope organisation
        if ($user->hasRole('superadmin_ibig') || $user->hasRole('super-admin')) {
            return $next($request);
        }

        // 1. L'utilisateur doit avoir un organization_id valide
        if (empty($user->organization_id)) {
            $this->logViolation($request, $user, 'missing_organization_id', [
                'detail' => 'Utilisateur sans organization_id tente d\'accéder à une ressource protégée.',
            ]);

            return $this->forbidden('Votre compte n\'est pas rattaché à une organisation.');
        }

        $userOrgId = (int) $user->organization_id;

        // 2. Vérifier l'injection via query string et body
        foreach (self::ORG_PARAM_NAMES as $paramName) {
            $injected = $request->input($paramName) ?? $request->query($paramName);

            if ($injected !== null && (int) $injected !== $userOrgId) {
                $this->logViolation($request, $user, 'organization_id_injection', [
                    'param_name'     => $paramName,
                    'injected_value' => $injected,
                    'user_org_id'    => $userOrgId,
                ]);

                return $this->forbidden('Accès refusé — périmètre organisation');
            }
        }

        // 3. Vérifier les modèles résolus via route model binding
        $routeParams = $request->route()?->parameters() ?? [];

        foreach ($routeParams as $paramName => $paramValue) {
            if (! ($paramValue instanceof Model)) {
                continue;
            }

            $modelOrgId = $this->extractOrgId($paramValue);

            if ($modelOrgId === null) {
                // Modèle sans colonne organization_id : non concerné
                continue;
            }

            if ($modelOrgId !== $userOrgId) {
                $this->logViolation($request, $user, 'cross_org_model_access', [
                    'param_name'   => $paramName,
                    'model_class'  => get_class($paramValue),
                    'model_id'     => $paramValue->getKey(),
                    'model_org_id' => $modelOrgId,
                    'user_org_id'  => $userOrgId,
                ]);

                // 403 et non 404 pour prévenir l'énumération
                return $this->forbidden('Accès refusé — périmètre organisation');
            }
        }

        return $next($request);
    }

    /**
     * Extrait l'organization_id d'un modèle Eloquent.
     * Retourne null si le modèle n'est pas scopé par organisation.
     */
    private function extractOrgId(Model $model): ?int
    {
        // Vérifie attribut direct
        if (isset($model->organization_id)) {
            return (int) $model->organization_id;
        }

        // Vérifie via getAttribute pour les modèles utilisant des accessors
        $attr = $model->getAttribute('organization_id');
        if ($attr !== null) {
            return (int) $attr;
        }

        return null;
    }

    /**
     * Construit une réponse 403 JSON.
     */
    private function forbidden(string $message = 'Accès refusé — périmètre organisation'): Response
    {
        return response()->json([
            'error'   => 'forbidden',
            'message' => $message,
            'code'    => 'ORGANIZATION_SCOPE_VIOLATION',
        ], Response::HTTP_FORBIDDEN);
    }

    /**
     * Loggue une violation dans le canal security et déclenche une alerte
     * critique si le seuil de tentatives par IP est dépassé.
     */
    private function logViolation(
        Request $request,
        \App\Models\User $user,
        string $reason,
        array $context = []
    ): void {
        $ip           = $request->ip();
        $cacheKey     = 'org_scope_violations:' . sha1($ip);
        $violations   = cache()->increment($cacheKey);
        cache()->put($cacheKey, $violations, now()->addHour());

        $level = $violations >= self::VIOLATION_THRESHOLD ? 'critical' : 'warning';

        Log::channel('security')->{$level}('EnforceOrganizationScope: violation détectée', array_merge([
            'reason'           => $reason,
            'user_id'          => $user->id,
            'user_email'       => $user->email,
            'user_org_id'      => $user->organization_id,
            'violations_count' => $violations,
            'method'           => $request->method(),
            'url'              => $request->fullUrl(),
            'ip'               => $ip,
            'user_agent'       => $request->userAgent(),
        ], $context));

        if ($violations >= self::VIOLATION_THRESHOLD) {
            Log::channel('security')->critical(
                'ALERTE CRITIQUE — Tentatives répétées de violation de périmètre organisation',
                [
                    'ip'               => $ip,
                    'user_id'          => $user->id,
                    'violations_count' => $violations,
                    'action_requise'   => 'Vérifier immédiatement l\'activité de cet utilisateur et cette IP.',
                ]
            );

            // Déclencher notification super-admin si le service est disponible
            if (app()->bound(\App\Services\IntrusionDetectionService::class)) {
                app(\App\Services\IntrusionDetectionService::class)->recordSuspiciousActivity(
                    $user,
                    'org_scope_violation',
                    ['ip' => $ip, 'reason' => $reason, 'violations' => $violations]
                );
            }
        }
    }
}
