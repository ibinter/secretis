<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * UserResource — Transformation API des utilisateurs
 *
 * Sécurité : exclut systématiquement les données sensibles :
 *  - password (hash bcrypt)
 *  - remember_token
 *  - last_login_ip (RGPD)
 *  - failed_login_attempts, locked_until (données de sécurité internes)
 *
 * Les tokens Sanctum ne sont JAMAIS exposés dans les Resources.
 */
class UserResource extends JsonResource
{
    private bool $detailed = false;
    private bool $includeSelf = false; // Données supplémentaires pour l'utilisateur lui-même

    public function withDetail(): self
    {
        $this->detailed = true;
        return $this;
    }

    /** Inclut des données supplémentaires disponibles uniquement pour soi-même */
    public function asSelf(): self
    {
        $this->includeSelf = true;
        $this->detailed    = true;
        return $this;
    }

    /**
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // ── Champs publics minimaux ───────────────────────────────────────
        $base = [
            'id'     => $this->id,
            'name'   => $this->name,
            'email'  => $this->email,
            'avatar' => $this->avatar,
            'status' => $this->status,

            // Département (résumé)
            'department' => $this->whenLoaded('department', fn() =>
                $this->department ? [
                    'id'   => $this->department->id,
                    'name' => $this->department->name,
                ] : null
            ),
        ];

        if (! $this->detailed) {
            return $base;
        }

        // ── Mode détail ───────────────────────────────────────────────────
        $detail = array_merge($base, [
            'organization_id' => $this->organization_id,
            'department_id'   => $this->department_id,
            'is_active'       => $this->resource->isActive(),
            'is_admin'        => $this->resource->isAdmin(),

            // Rôles via Spatie Permission (noms seulement)
            'roles' => $this->whenLoaded('roles', fn() =>
                $this->roles->pluck('name')->values()
            ),

            // Permissions directes (sans celles héritées des rôles)
            'direct_permissions' => $this->whenLoaded('permissions', fn() =>
                $this->permissions->pluck('name')->values()
            ),

            // Organisation (résumé)
            'organization' => $this->whenLoaded('organization', fn() =>
                $this->organization ? [
                    'id'   => $this->organization->id,
                    'name' => $this->organization->name,
                    'slug' => $this->organization->slug,
                ] : null
            ),

            'created_at' => $this->created_at->toIso8601String(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
        ]);

        // ── Données personnelles (soi-même seulement) ─────────────────────
        if ($this->includeSelf) {
            $detail['preferences'] = $this->preferences ?? [];
            $detail['email_verified_at'] = $this->email_verified_at?->toIso8601String();
            // NE PAS inclure : password, remember_token, last_login_ip, locked_until, failed_login_attempts
        }

        return $detail;
    }
}
