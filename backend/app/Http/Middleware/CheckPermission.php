<?php

namespace App\Http\Middleware;

use App\Services\AuditService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * CheckPermission — Middleware RBAC multi-niveaux
 *
 * Usage dans les routes :
 *   ->middleware('permission:agenda.view')
 *   ->middleware('permission:courrier.create,courrier.edit')   // OR logic
 *   ->middleware('permission:agenda.delete|all')              // AND logic (pipe)
 *
 * Niveaux de contrôle :
 *   1. Menu      — accès visible au menu de navigation
 *   2. Route     — accès à l'URL/endpoint
 *   3. Contrôleur — vérifié dans le middleware avant le contrôleur
 *   4. Service   — vérifié par LicenseService / modules métier
 *   5. API       — vérifié sur les endpoints API REST/JSON
 */
class CheckPermission
{
    public function __construct(private AuditService $auditService) {}

    /**
     * @param  string  $permissions  Permissions séparées par virgule (OR) ou pipe (AND).
     *                               Ex: "agenda.view,courrier.view" = doit avoir l'une des deux
     *                               Ex: "courrier.create|courrier.edit" = doit avoir les deux
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        if (! Auth::check()) {
            return $this->unauthorized($request, 'Non authentifié');
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Les super-admins IBIG ont tous les droits (niveau plateforme)
        if ($user->hasRole('superadmin_ibig')) {
            return $next($request);
        }

        // Vérifier que l'utilisateur est dans le bon tenant
        $organization = app('current_organization');
        if ($organization && $user->organization_id !== $organization->id) {
            $this->logUnauthorizedAccess($request, $user, $permissions, 'cross_tenant');
            return $this->forbidden($request, 'Accès inter-tenant refusé');
        }

        // Résoudre la logique OR / AND des permissions
        [$orPermissions, $andPermissions] = $this->parsePermissions($permissions);

        $hasAccess = $this->checkOrPermissions($user, $orPermissions)
            && $this->checkAndPermissions($user, $andPermissions);

        if (! $hasAccess) {
            $this->logUnauthorizedAccess($request, $user, $permissions, 'permission_denied');
            return $this->forbidden($request, 'Permission insuffisante');
        }

        return $next($request);
    }

    /**
     * Sépare les permissions OR (virgule) et AND (pipe).
     * Retourne [orPermissions[], andPermissions[]]
     */
    private function parsePermissions(array $permissions): array
    {
        $or  = [];
        $and = [];

        foreach ($permissions as $permission) {
            if (str_contains($permission, '|')) {
                // Pipe = toutes ces permissions sont requises (AND)
                array_push($and, ...explode('|', $permission));
            } else {
                // Virgule (argument séparé) = l'une suffit (OR)
                $or[] = $permission;
            }
        }

        return [$or, $and];
    }

    /**
     * L'utilisateur doit avoir AU MOINS UNE des permissions OR.
     * Si la liste est vide, la condition est vraie (pas de contrainte OR).
     */
    private function checkOrPermissions(\App\Models\User $user, array $permissions): bool
    {
        if (empty($permissions)) {
            return true;
        }

        foreach ($permissions as $permission) {
            if ($user->can($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * L'utilisateur doit avoir TOUTES les permissions AND.
     * Si la liste est vide, la condition est vraie.
     */
    private function checkAndPermissions(\App\Models\User $user, array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (! $user->can($permission)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Logue la tentative d'accès non autorisé dans audit_logs.
     * NE PAS lever d'exception ici — on loggue et on renvoie 403.
     */
    private function logUnauthorizedAccess(
        Request $request,
        \App\Models\User $user,
        array $permissions,
        string $reason
    ): void {
        // Log structuré pour SIEM / alerting
        Log::channel('security')->warning('Accès non autorisé', [
            'user_id'        => $user->id,
            'organization_id' => $user->organization_id,
            'route'          => $request->route()?->getName(),
            'url'            => $request->fullUrl(),
            'method'         => $request->method(),
            'permissions'    => $permissions,
            'reason'         => $reason,
            'ip'             => $request->ip(),
            'user_agent'     => $request->userAgent(),
        ]);

        // Insertion dans audit_logs (insert-only, voir AuditService)
        try {
            $this->auditService->log(
                action: 'access_denied',
                module: $this->extractModule($permissions),
                resourceType: 'route',
                resourceId: $request->route()?->getName() ?? $request->path(),
                oldValues: [],
                newValues: [
                    'attempted_permissions' => $permissions,
                    'reason'                => $reason,
                    'url'                   => $request->fullUrl(),
                ],
            );
        } catch (\Throwable $e) {
            // Ne jamais laisser l'audit bloquer la réponse de sécurité
            Log::error('AuditService::log failed in CheckPermission', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Extrait le nom du module depuis la permission (ex: "agenda.view" → "agenda").
     */
    private function extractModule(array $permissions): string
    {
        if (empty($permissions)) {
            return 'unknown';
        }

        return explode('.', $permissions[0])[0] ?? 'unknown';
    }

    private function unauthorized(Request $request, string $message): Response
    {
        if ($request->expectsJson()) {
            return response()->json(['error' => 'unauthenticated', 'message' => $message], 401);
        }

        return redirect()->route('login');
    }

    private function forbidden(Request $request, string $message): Response
    {
        if ($request->expectsJson()) {
            return response()->json(['error' => 'forbidden', 'message' => $message], 403);
        }

        return redirect()->route('dashboard')
            ->with('error', 'Vous n\'avez pas la permission d\'effectuer cette action.');
    }
}
