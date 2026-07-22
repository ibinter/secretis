<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

/**
 * AuditService — Journal d'audit immuable
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
