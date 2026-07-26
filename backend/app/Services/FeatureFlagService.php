<?php

namespace App\Services;

use App\Models\FeatureFlag;
use App\Models\Organization;
use Illuminate\Support\Facades\Cache;

/**
 * FeatureFlagService — Gestion des feature flags avec rollout progressif
 *
 * Les états sont mis en cache Redis (TTL 5 minutes) pour éviter
 * une requête DB à chaque vérification de flag.
 *
 * ACCÈS RESTREINT : La mutation des flags (enable/disable) est réservée
 * aux SuperAdmins IBIG via FeatureFlagController.
 */
class FeatureFlagService
{
    private const CACHE_TTL = 300; // 5 minutes

    // ─────────────────────────────────────────────────────────────────────────
    // LECTURE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Vérifie si un feature flag est actif pour une organisation donnée.
     *
     * Ordre de priorité :
     *   1. Flag inactif globalement → false
     *   2. Activation globale (is_global = true) → true
     *   3. Org dans target_org_ids → true
     *   4. Plan de l'org dans target_plans → true
     *   5. Rollout progressif (enabled_percent) → hash déterministe de l'org_id
     *   6. Sinon → false
     */
    public function isEnabled(string $slug, Organization $org): bool
    {
        $cacheKey = "ff:{$slug}:org:{$org->id}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($slug, $org) {
            $flag = FeatureFlag::where('slug', $slug)->first();

            if (!$flag || !$flag->is_active) {
                return false;
            }

            // Activation globale
            if ($flag->is_global) {
                return true;
            }

            // Ciblage par org
            $targetOrgIds = $flag->target_org_ids ?? [];
            if (in_array($org->id, $targetOrgIds, true)) {
                return true;
            }

            // Ciblage par plan
            $targetPlans = $flag->target_plans ?? [];
            $orgPlan     = $org->getCurrentPlan();
            if (!empty($targetPlans) && in_array($orgPlan, $targetPlans, true)) {
                return true;
            }

            // Rollout progressif : déterministe par org_id
            if ($flag->enabled_percent > 0) {
                // Bucket : hash de l'org_id → 0-99
                $bucket = crc32("ff_{$slug}_{$org->id}") % 100;
                $bucket = abs($bucket); // crc32 peut retourner négatif
                return $bucket < $flag->enabled_percent;
            }

            return false;
        });
    }

    /**
     * Retourne tous les feature flags avec leur état.
     *
     * @return array
     */
    public function getAll(): array
    {
        return FeatureFlag::orderBy('name')
            ->get()
            ->map(fn ($flag) => [
                'id'              => $flag->id,
                'slug'            => $flag->slug,
                'name'            => $flag->name,
                'description'     => $flag->description,
                'is_active'       => $flag->is_active,
                'is_global'       => $flag->is_global,
                'target_org_ids'  => $flag->target_org_ids ?? [],
                'target_plans'    => $flag->target_plans ?? [],
                'enabled_percent' => $flag->enabled_percent,
                'created_at'      => $flag->created_at?->toDateTimeString(),
                'updated_at'      => $flag->updated_at?->toDateTimeString(),
                // Statistiques
                'orgs_affected'   => $this->countAffectedOrgs($flag),
            ])
            ->toArray();
    }

    /**
     * Estime le nombre d'organisations affectées par un flag.
     */
    private function countAffectedOrgs(FeatureFlag $flag): int
    {
        if (!$flag->is_active) {
            return 0;
        }

        if ($flag->is_global) {
            return Organization::active()->count();
        }

        $count = 0;

        // Orgs ciblées directement
        $directOrgs = count($flag->target_org_ids ?? []);

        // Orgs ciblées par plan
        if (!empty($flag->target_plans)) {
            $planOrgs = Organization::active()
                ->whereHas('license', fn ($q) => $q->whereIn('plan_id', $flag->target_plans)->where('status', 'active'))
                ->count();
            $count += $planOrgs;
        }

        // Rollout progressif
        if ($flag->enabled_percent > 0) {
            $totalActive = Organization::active()->count();
            $count += (int) round($totalActive * $flag->enabled_percent / 100);
        }

        return $count + $directOrgs;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MUTATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Active le flag pour une organisation spécifique.
     */
    public function enableForOrg(string $slug, int $orgId): void
    {
        $flag = $this->findOrFail($slug);

        $ids = $flag->target_org_ids ?? [];
        if (!in_array($orgId, $ids, true)) {
            $ids[] = $orgId;
            $flag->update(['target_org_ids' => $ids]);
        }

        $this->clearCache($slug, $orgId);
    }

    /**
     * Désactive le flag pour une organisation spécifique.
     */
    public function disableForOrg(string $slug, int $orgId): void
    {
        $flag = $this->findOrFail($slug);

        $ids = array_values(array_filter($flag->target_org_ids ?? [], fn ($id) => $id !== $orgId));
        $flag->update(['target_org_ids' => $ids]);

        $this->clearCache($slug, $orgId);
    }

    /**
     * Configure le rollout progressif d'un flag (0-100%).
     *
     * @param int $percent Pourcentage des organisations qui verront le flag (0 = désactivé)
     */
    public function setGlobalRollout(string $slug, int $percent): void
    {
        $percent = max(0, min(100, $percent));
        $flag    = $this->findOrFail($slug);

        $flag->update([
            'enabled_percent' => $percent,
            'is_active'       => $percent > 0 || $flag->is_global || !empty($flag->target_org_ids) || !empty($flag->target_plans),
        ]);

        // Invalider tout le cache pour ce flag
        $this->clearAllCacheForFlag($slug);
    }

    /**
     * Bascule l'état actif/inactif global d'un flag.
     */
    public function toggle(string $slug): FeatureFlag
    {
        $flag = $this->findOrFail($slug);
        $flag->update(['is_active' => !$flag->is_active]);

        $this->clearAllCacheForFlag($slug);

        return $flag->fresh();
    }

    /**
     * Active le flag globalement pour toutes les organisations.
     */
    public function enableGlobal(string $slug): void
    {
        $flag = $this->findOrFail($slug);
        $flag->update(['is_global' => true, 'is_active' => true]);
        $this->clearAllCacheForFlag($slug);
    }

    /**
     * Désactive le flag globalement.
     */
    public function disableGlobal(string $slug): void
    {
        $flag = $this->findOrFail($slug);
        $flag->update(['is_global' => false]);
        $this->clearAllCacheForFlag($slug);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CACHE
    // ─────────────────────────────────────────────────────────────────────────

    private function clearCache(string $slug, int $orgId): void
    {
        Cache::forget("ff:{$slug}:org:{$orgId}");
    }

    private function clearAllCacheForFlag(string $slug): void
    {
        // Invalider le cache de toutes les orgs pour ce flag
        // En production, utiliser Cache::tags si le driver le supporte
        Organization::active()->chunk(100, function ($orgs) use ($slug) {
            foreach ($orgs as $org) {
                Cache::forget("ff:{$slug}:org:{$org->id}");
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private function findOrFail(string $slug): FeatureFlag
    {
        return FeatureFlag::where('slug', $slug)->firstOrFail();
    }
}
