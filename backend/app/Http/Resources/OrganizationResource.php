<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * OrganizationResource — Transformation API des organisations (tenants)
 *
 * N'expose pas les données internes de licence (prix, conditions) vers les users normaux.
 * Le SuperAdmin peut accéder à plus de détails via OrganizationAdminResource (à étendre).
 */
class OrganizationResource extends JsonResource
{
    private bool $withLicense = false;

    /** Inclut les détails de licence (SuperAdmin uniquement) */
    public function withLicenseDetails(): self
    {
        $this->withLicense = true;
        return $this;
    }

    /**
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $base = [
            'id'       => $this->id,
            'name'     => $this->name,
            'slug'     => $this->slug,
            'email'    => $this->email,
            'phone'    => $this->phone,
            'address'  => $this->address,
            'country'  => $this->country,
            'timezone' => $this->timezone,
            'status'   => $this->status,

            // Statut de licence calculé côté serveur
            'license_status'       => $this->resource->getLicenseStatus(),
            'has_active_license'   => $this->resource->hasActiveLicense(),
            'current_plan'         => $this->resource->getCurrentPlan(),
            'remaining_trial_days' => $this->resource->getRemainingTrialDays(),

            // Modules activés (issu des settings, pas de données sensibles)
            'enabled_modules' => $this->resource->getSetting('enabled_modules', []),

            // Méta
            'created_at' => $this->created_at->toIso8601String(),
        ];

        // ── Détails de licence (SuperAdmin) ───────────────────────────────
        if ($this->withLicense) {
            $base['license'] = $this->whenLoaded('license', fn() =>
                $this->license ? [
                    'id'         => $this->license->id,
                    'plan'       => $this->license->plan?->name,
                    'expires_at' => $this->license->expires_at?->toDateString(),
                    'seats'      => $this->license->max_users,
                    'is_active'  => $this->license->isActive(),
                ] : null
            );

            $base['users_count']      = $this->whenLoaded('users', fn() => $this->users->count());
            $base['departments_count']= $this->whenLoaded('departments', fn() => $this->departments->count());
            $base['trial_ends_at']    = $this->trial_ends_at?->toDateString();
            $base['settings']         = $this->settings ?? [];
        }

        return $base;
    }
}
