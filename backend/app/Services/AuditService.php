<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * AuditService — Journal d'audit immuable (section 27.2)
 *
 * SECURITE : La table audit_logs est en INSERT ONLY.
 * - Aucune méthode update/delete n'est exposée ici.
 * - Le modèle AuditLog bloque les mises à jour via son boot().
 * - L'utilisateur DB de l'application n'a pas de droit UPDATE/DELETE
 *   sur audit_logs (à configurer dans PostgreSQL via GRANT).
 *
 * Toutes les insertions capturent automatiquement :
 *   - user_id (depuis Auth)
 *   - organization_id (depuis le contexte tenant)
 *   - IP de la requête
 *   - User-Agent
 *   - Timestamp serveur (created_at)
 *
 * Usage :
 *   app(AuditService::class)->log('create', 'ged', ['resource_type' => 'Document', ...]);
 *   app(AuditService::class)->logLogin($user);
 */
class AuditService
{
    /**
     * Enregistre un événement d'audit.
     *
     * @param  string     $action       Verbe d'action (ex: "created", "updated", "deleted", "access_denied")
     * @param  string     $module       Module concerné (ex: "agenda", "courrier", "billing")
     * @param  string     $resourceType Entité concernée (ex: "appointment", "letter", "user")
     * @param  int|string|null $resourceId   ID de la ressource
     * @param  array      $oldValues    État avant modification (vide si création)
     * @param  array      $newValues    État après modification (vide si suppression)
     * @param  int|null   $userId       Override de l'utilisateur (défaut : Auth::id())
     * @param  int|null   $organizationId Override du tenant (défaut : contexte courant)
     *
     * @throws \RuntimeException jamais — les erreurs d'audit sont loggées silencieusement
     *                           pour ne pas bloquer les opérations métier.
     */
    public function log(
        string $action,
        string $module,
        string $resourceType,
        int|string|null $resourceId = null,
        array $oldValues = [],
        array $newValues = [],
        ?int $userId = null,
        ?int $organizationId = null,
    ): void {
        try {
            // Résolution du user_id — jamais depuis des données externes
            $resolvedUserId = $userId ?? Auth::id();

            // Résolution de l'organization_id depuis le contexte tenant
            $resolvedOrgId = $organizationId
                ?? app()->bound('current_organization')
                    ? app('current_organization')?->id
                    : Auth::user()?->organization_id;

            // Capture automatique du contexte réseau
            $request = Request::instance();

            // Nettoyer les valeurs sensibles avant de les logguer
            $safeOldValues = $this->sanitizeSensitiveFields($oldValues);
            $safeNewValues = $this->sanitizeSensitiveFields($newValues);

            AuditLog::create([
                'user_id'         => $resolvedUserId,
                'organization_id' => $resolvedOrgId,
                'action'          => $action,
                'module'          => $module,
                'resource_type'   => $resourceType,
                'resource_id'     => (string) $resourceId,
                'old_values'      => $safeOldValues ?: null,
                'new_values'      => $safeNewValues ?: null,
                'ip_address'      => $request->ip(),
                'user_agent'      => substr((string) $request->userAgent(), 0, 512),
                'session_id'      => session()->getId(),
                // created_at sera auto-rempli par Eloquent (timestamp serveur)
            ]);
        } catch (\Throwable $e) {
            // JAMAIS lever d'exception depuis l'audit — log dans les logs applicatifs
            Log::channel('audit_fallback')->error('AuditService::log failed', [
                'error'         => $e->getMessage(),
                'action'        => $action,
                'module'        => $module,
                'resource_type' => $resourceType,
                'resource_id'   => $resourceId,
            ]);
        }
    }

    /**
     * Raccourci pour logguer un événement de création.
     */
    public function logCreated(string $module, string $resourceType, int|string $resourceId, array $attributes = []): void
    {
        $this->log(
            action: 'created',
            module: $module,
            resourceType: $resourceType,
            resourceId: $resourceId,
            newValues: $attributes,
        );
    }

    /**
     * Raccourci pour logguer une mise à jour avec diff.
     */
    public function logUpdated(string $module, string $resourceType, int|string $resourceId, array $original, array $changes): void
    {
        // Ne logguer que les champs qui ont réellement changé
        $diff = array_filter(
            $changes,
            fn ($value, $key) => $original[$key] ?? null !== $value,
            ARRAY_FILTER_USE_BOTH
        );

        if (empty($diff)) {
            return; // Rien n'a changé, pas d'entrée inutile
        }

        $this->log(
            action: 'updated',
            module: $module,
            resourceType: $resourceType,
            resourceId: $resourceId,
            oldValues: array_intersect_key($original, $diff),
            newValues: $diff,
        );
    }

    /**
     * Raccourci pour logguer une suppression.
     */
    public function logDeleted(string $module, string $resourceType, int|string $resourceId, array $lastState = []): void
    {
        $this->log(
            action: 'deleted',
            module: $module,
            resourceType: $resourceType,
            resourceId: $resourceId,
            oldValues: $lastState,
        );
    }

    /**
     * Raccourci pour logguer un accès refusé.
     */
    public function logAccessDenied(string $module, string $resourceType, ?string $resourceId, array $context = []): void
    {
        $this->log(
            action: 'access_denied',
            module: $module,
            resourceType: $resourceType,
            resourceId: $resourceId,
            newValues: $context,
        );
    }

    // ── Nouveaux helpers sémantiques (section 27.2) ───────────────────────────

    /**
     * Connexion réussie d'un utilisateur.
     */
    public function logLogin(\App\Models\User $user): void
    {
        $this->log('login', 'auth', 'User', $user->id, [], ['email' => $user->email]);
    }

    /**
     * Déconnexion d'un utilisateur.
     */
    public function logLogout(\App\Models\User $user): void
    {
        $this->log('logout', 'auth', 'User', $user->id, [], []);
    }

    /**
     * Tentative de connexion échouée.
     */
    public function logFailedLogin(string $email): void
    {
        $this->log('login_failed', 'auth', 'User', null, [], ['email' => $email]);
    }

    /**
     * Création d'un modèle Eloquent avec ses attributs.
     */
    public function logCreate(Model $model, array $attributes = []): void
    {
        $this->log(
            'create',
            $this->moduleFromModel($model),
            class_basename($model),
            $model->getKey(),
            [],
            $this->sanitizeSensitiveFields($attributes ?: $model->getAttributes()),
        );
    }

    /**
     * Modification d'un modèle Eloquent (old → new).
     */
    public function logUpdate(Model $model, array $old, array $new): void
    {
        $this->log(
            'update',
            $this->moduleFromModel($model),
            class_basename($model),
            $model->getKey(),
            $this->sanitizeSensitiveFields($old),
            $this->sanitizeSensitiveFields($new),
        );
    }

    /**
     * Suppression d'un modèle Eloquent.
     */
    public function logDelete(Model $model): void
    {
        $this->log(
            'delete',
            $this->moduleFromModel($model),
            class_basename($model),
            $model->getKey(),
            $this->sanitizeSensitiveFields($model->getAttributes()),
            [],
        );
    }

    /**
     * Export de données.
     */
    public function logExport(string $type, array $filters, int $count): void
    {
        $this->log('export', $this->moduleFromType($type), $type, null, [], [
            'filters' => $filters,
            'count'   => $count,
        ]);
    }

    /**
     * Action sur un paiement / commande.
     */
    public function logPayment(\App\Models\Order $order, string $action): void
    {
        $this->log($action, 'payments', 'Order', $order->id, [], [
            'amount' => $order->total ?? null,
        ]);
    }

    /**
     * Changement de licence / abonnement.
     */
    public function logLicenseChange(Organization $org, array $old, array $new, string $reason): void
    {
        $this->log('license_change', 'licenses', 'Organization', $org->id, $old, array_merge($new, ['reason' => $reason]));
    }

    /**
     * Accès à une ressource sensible.
     */
    public function logSensitiveAccess(string $resource, string $action): void
    {
        $this->log($action, 'security', $resource, null, [], []);
    }

    // ── Consultation ──────────────────────────────────────────────────────────

    /**
     * Journal paginé pour un espace client (admin uniquement).
     */
    public function getForOrganization(Organization $org, array $filters = []): LengthAwarePaginator
    {
        $query = AuditLog::query()->where('organization_id', $org->id)->latest();
        $this->applyFilters($query, $filters);
        return $query->paginate(50);
    }

    /**
     * Journal paginé pour le SuperAdmin IBIG (toutes les organisations).
     */
    public function getForSuperAdmin(array $filters = []): LengthAwarePaginator
    {
        $query = AuditLog::query()->with('organization')->latest();
        $this->applyFilters($query, $filters);
        return $query->paginate(100);
    }

    /**
     * Export CSV filtré du journal d'audit.
     */
    public function exportCsv(array $filters = []): StreamedResponse
    {
        $user  = Auth::user();
        $query = AuditLog::query()->latest();

        if ($user && ! $user->hasRole('superadmin_ibig')) {
            $query->where('organization_id', $user->organization_id);
        }

        $this->applyFilters($query, $filters);

        $filename = 'audit-log-' . now()->format('Y-m-d-His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF"); // BOM UTF-8 pour Excel

            fputcsv($handle, [
                'Date/Heure', 'Utilisateur', 'Rôle', 'Action', 'Module',
                'Type ressource', 'ID ressource', 'Libellé ressource',
                'IP', 'Sévérité', 'Résultat', 'Session support', 'Notes',
            ], ';');

            $query->chunk(500, function ($logs) use ($handle) {
                foreach ($logs as $log) {
                    fputcsv($handle, [
                        $log->created_at->format('d/m/Y H:i:s'),
                        $log->user_name ?? ($log->user_id ? "User#{$log->user_id}" : '—'),
                        $log->user_role ?? '—',
                        $log->action,
                        $log->module,
                        $log->resource_type,
                        $log->resource_id,
                        $log->resource_label,
                        $log->ip_address,
                        $log->severity ?? 'info',
                        $log->result ?? 'success',
                        $log->is_support_session ? 'Oui' : 'Non',
                        $log->notes,
                    ], ';');
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    // ── Helpers internes ──────────────────────────────────────────────────────

    private function applyFilters(\Illuminate\Database\Eloquent\Builder $query, array $filters): void
    {
        if (! empty($filters['module']))           { $query->where('module', $filters['module']); }
        if (! empty($filters['action']))           { $query->where('action', $filters['action']); }
        if (! empty($filters['user_id']))          { $query->where('user_id', $filters['user_id']); }
        if (! empty($filters['severity']))         { $query->where('severity', $filters['severity']); }
        if (! empty($filters['organization_id'])) { $query->where('organization_id', $filters['organization_id']); }
        if (! empty($filters['is_sensitive']))     { $query->where('is_sensitive', true); }
        if (! empty($filters['is_support_session'])) { $query->where('is_support_session', true); }
        if (! empty($filters['date_from']))        { $query->where('created_at', '>=', $filters['date_from']); }
        if (! empty($filters['date_to']))          { $query->where('created_at', '<=', $filters['date_to'] . ' 23:59:59'); }
        if (! empty($filters['search'])) {
            $term = '%' . $filters['search'] . '%';
            $query->where(fn($q) => $q->where('user_name', 'LIKE', $term)
                                      ->orWhere('resource_label', 'LIKE', $term)
                                      ->orWhere('notes', 'LIKE', $term));
        }
    }

    private function moduleFromModel(Model $model): string
    {
        $map = [
            'Event'        => 'agenda',
            'Document'     => 'ged',
            'User'         => 'users',
            'Organization' => 'organizations',
            'Order'        => 'payments',
            'Invoice'      => 'comptabilite',
            'Employee'     => 'rh',
            'Leave'        => 'rh',
            'Task'         => 'taches',
            'Contact'      => 'contacts',
            'Supplier'     => 'fournisseurs',
            'Visitor'      => 'accueil',
        ];
        return $map[class_basename($model)] ?? 'general';
    }

    private function moduleFromType(string $type): string
    {
        $map = ['Document' => 'ged', 'Event' => 'agenda', 'User' => 'users'];
        return $map[$type] ?? 'general';
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Masque les champs sensibles avant l'insertion en base.
     * Ne jamais stocker les mots de passe, tokens, secrets dans l'audit log.
     */
    private function sanitizeSensitiveFields(array $values): array
    {
        $sensitiveKeys = [
            'password',
            'password_confirmation',
            'token',
            'api_key',
            'secret',
            'card_number',
            'cvv',
            'pin',
            'remember_token',
        ];

        foreach ($sensitiveKeys as $key) {
            if (array_key_exists($key, $values)) {
                $values[$key] = '[REDACTED]';
            }
        }

        return $values;
    }
}
