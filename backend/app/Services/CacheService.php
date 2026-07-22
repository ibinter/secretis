<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * CacheService — Stratégie de cache multi-niveaux pour SECRETIS ERP
 *
 * Architecture L1/L2 :
 *  - L1 (array en mémoire PHP) : valide pour la durée de la request courante.
 *    Zéro latence réseau. Idéal pour éviter les doublons de cache dans une
 *    même request (ex. : permissions vérifiées plusieurs fois).
 *  - L2 (Redis via Cache driver Laravel) : persisté entre les requests.
 *    TTL adapté selon la volatilité de la donnée.
 *
 * Stratégie d'invalidation :
 *  - Invalidation par tag (Cache::tags) : tous les caches d'une organisation
 *    ou d'un utilisateur peuvent être invalidés atomiquement.
 *  - Les invalidations lourdes (flush de tags) sont déléguées à des jobs
 *    pour ne pas bloquer la réponse HTTP.
 *
 * Usage :
 *   $data = app(CacheService::class)->cacheOrganizationData(
 *       orgId: $org->id,
 *       key: 'departments.list',
 *       callback: fn() => Department::forOrg($org->id)->get()->toArray(),
 *       ttl: 1800
 *   );
 */
class CacheService
{
    /** L1 : cache mémoire valide pour la request courante */
    private array $l1Cache = [];

    /** Préfixe global pour tous les caches SECRETIS (évite les collisions) */
    private const KEY_PREFIX = 'secretis:';

    // =========================================================================
    // Cache de données d'organisation
    // =========================================================================

    /**
     * Cache une donnée relative à une organisation.
     *
     * La clé est scopée à l'organisation pour faciliter l'invalidation.
     * L1 → L2 → callback (miss)
     *
     * @param  int      $orgId    Identifiant de l'organisation (tenant)
     * @param  string   $key      Sous-clé descriptive (ex: 'departments.list')
     * @param  callable $callback Fonction qui génère la donnée si absent du cache
     * @param  int      $ttl      Durée de vie en secondes (défaut : 1h)
     * @return mixed
     */
    public function cacheOrganizationData(int $orgId, string $key, callable $callback, int $ttl = 3600): mixed
    {
        $fullKey = $this->orgKey($orgId, $key);

        // ── L1 : mémoire PHP ────────────────────────────────────────────────
        if (array_key_exists($fullKey, $this->l1Cache)) {
            return $this->l1Cache[$fullKey];
        }

        // ── L2 : Redis ──────────────────────────────────────────────────────
        $value = $this->getFromRedis(
            key:      $fullKey,
            tags:     [$this->orgTag($orgId)],
            callback: $callback,
            ttl:      $ttl
        );

        $this->l1Cache[$fullKey] = $value;

        return $value;
    }

    // =========================================================================
    // Cache des permissions utilisateur
    // =========================================================================

    /**
     * Cache les permissions/rôles d'un utilisateur.
     *
     * TTL court (300s) car les changements de rôle doivent être pris en compte
     * rapidement. Invalidé explicitement par invalidateUserCache().
     *
     * @param  int      $userId   Identifiant de l'utilisateur
     * @param  callable $callback Retourne les permissions (tableau de strings)
     * @return array
     */
    public function cacheUserPermissions(int $userId, callable $callback): array
    {
        $key = $this->userKey($userId, 'permissions');

        if (array_key_exists($key, $this->l1Cache)) {
            return $this->l1Cache[$key];
        }

        $permissions = $this->getFromRedis(
            key:      $key,
            tags:     [$this->userTag($userId)],
            callback: $callback,
            ttl:      300  // 5 minutes — doit refléter rapidement les changements RBAC
        );

        $this->l1Cache[$key] = $permissions;

        return is_array($permissions) ? $permissions : [];
    }

    // =========================================================================
    // Cache des KPIs du dashboard
    // =========================================================================

    /**
     * Cache les KPIs calculés pour le dashboard d'une organisation.
     *
     * TTL 300s : les métriques ne doivent pas être recalculées à chaque page view
     * mais doivent rester relativement à jour (tolérance ~5 minutes).
     *
     * @param  int      $orgId
     * @param  callable $callback Retourne un tableau de KPIs
     * @return array
     */
    public function cacheDashboardKpis(int $orgId, callable $callback): array
    {
        $key = $this->orgKey($orgId, 'dashboard.kpis');

        if (array_key_exists($key, $this->l1Cache)) {
            return $this->l1Cache[$key];
        }

        $kpis = $this->getFromRedis(
            key:      $key,
            tags:     [$this->orgTag($orgId), 'kpis'],
            callback: $callback,
            ttl:      300
        );

        $this->l1Cache[$key] = $kpis;

        return is_array($kpis) ? $kpis : [];
    }

    // =========================================================================
    // Cache des événements calendrier
    // =========================================================================

    /**
     * Cache les événements d'un calendrier pour une plage de dates donnée.
     *
     * TTL 60s : le calendrier est interactif, les événements doivent être
     * relativement frais. La clé inclut la plage de dates pour éviter les
     * collisions entre différentes vues (semaine, mois…).
     *
     * @param  int      $orgId
     * @param  Carbon   $start
     * @param  Carbon   $end
     * @param  callable $callback Retourne un tableau d'événements
     * @return array
     */
    public function cacheCalendarEvents(int $orgId, Carbon $start, Carbon $end, callable $callback): array
    {
        // La clé intègre la plage de dates pour une granularité maximale
        $rangeKey = $start->format('Ymd') . '_' . $end->format('Ymd');
        $key      = $this->orgKey($orgId, "calendar.events.{$rangeKey}");

        if (array_key_exists($key, $this->l1Cache)) {
            return $this->l1Cache[$key];
        }

        $events = $this->getFromRedis(
            key:      $key,
            tags:     [$this->orgTag($orgId), "org:{$orgId}:calendar"],
            callback: $callback,
            ttl:      60  // 1 minute — données interactives, fraîcheur importante
        );

        $this->l1Cache[$key] = $events;

        return is_array($events) ? $events : [];
    }

    // =========================================================================
    // Invalidation
    // =========================================================================

    /**
     * Invalide TOUS les caches d'une organisation.
     *
     * Utilisé après une opération qui impacte l'ensemble des données de l'org
     * (ex: changement de paramètres, import massif…).
     * L'invalidation Redis est atomique grâce aux tags.
     */
    public function invalidateOrganizationCache(int $orgId): void
    {
        try {
            Cache::tags([$this->orgTag($orgId)])->flush();
            $this->flushL1ByPrefix($this->orgKey($orgId, ''));
            Log::debug("[CacheService] Cache org #{$orgId} invalidé.");
        } catch (\Exception $e) {
            // Ne pas bloquer si Redis est indisponible
            Log::error("[CacheService] Erreur invalidation org #{$orgId}: " . $e->getMessage());
        }
    }

    /**
     * Invalide les caches d'un utilisateur (permissions, préférences…).
     */
    public function invalidateUserCache(int $userId): void
    {
        try {
            Cache::tags([$this->userTag($userId)])->flush();
            $this->flushL1ByPrefix($this->userKey($userId, ''));
            Log::debug("[CacheService] Cache user #{$userId} invalidé.");
        } catch (\Exception $e) {
            Log::error("[CacheService] Erreur invalidation user #{$userId}: " . $e->getMessage());
        }
    }

    /**
     * Invalide uniquement les événements calendrier d'une organisation.
     * Appelé par l'observer Event.
     */
    public function invalidateCalendarCache(int $orgId): void
    {
        try {
            Cache::tags(["org:{$orgId}:calendar"])->flush();
            $this->flushL1ByPrefix($this->orgKey($orgId, 'calendar.'));
        } catch (\Exception $e) {
            Log::error("[CacheService] Erreur invalidation calendrier org #{$orgId}: " . $e->getMessage());
        }
    }

    /**
     * Invalide les KPIs d'une organisation.
     * Appelé quand une tâche, un courrier ou une réunion est créé/modifié.
     */
    public function invalidateDashboardCache(int $orgId): void
    {
        try {
            Cache::tags([$this->orgTag($orgId), 'kpis'])->flush();
            $this->flushL1ByPrefix($this->orgKey($orgId, 'dashboard.'));
        } catch (\Exception $e) {
            Log::error("[CacheService] Erreur invalidation dashboard org #{$orgId}: " . $e->getMessage());
        }
    }

    // =========================================================================
    // Helpers internes
    // =========================================================================

    /**
     * Récupère ou stocke une valeur dans Redis avec des tags.
     *
     * @param  string   $key
     * @param  string[] $tags     Tags Redis pour l'invalidation groupée
     * @param  callable $callback Générateur de la valeur (appelé en cas de miss)
     * @param  int      $ttl      TTL en secondes
     */
    private function getFromRedis(string $key, array $tags, callable $callback, int $ttl): mixed
    {
        try {
            // Cache::tags() requiert un driver qui supporte les tags (Redis, Memcached)
            return Cache::tags($tags)->remember($key, $ttl, $callback);
        } catch (\Exception $e) {
            // Fallback sans tags si le driver ne les supporte pas (file, database)
            Log::warning("[CacheService] Tags non supportés, fallback sans tags: " . $e->getMessage());
            return Cache::remember($key, $ttl, $callback);
        }
    }

    /**
     * Construit la clé Redis pour une organisation.
     * Format : secretis:org:42:departments.list
     */
    private function orgKey(int $orgId, string $subKey): string
    {
        return self::KEY_PREFIX . "org:{$orgId}:{$subKey}";
    }

    /**
     * Construit la clé Redis pour un utilisateur.
     * Format : secretis:user:7:permissions
     */
    private function userKey(int $userId, string $subKey): string
    {
        return self::KEY_PREFIX . "user:{$userId}:{$subKey}";
    }

    /** Tag Redis pour une organisation */
    private function orgTag(int $orgId): string
    {
        return "org:{$orgId}";
    }

    /** Tag Redis pour un utilisateur */
    private function userTag(int $userId): string
    {
        return "user:{$userId}";
    }

    /**
     * Vide les entrées L1 dont la clé commence par un préfixe donné.
     * Moins précis qu'un flush Redis mais suffisant pour le L1 mémoire.
     */
    private function flushL1ByPrefix(string $prefix): void
    {
        foreach (array_keys($this->l1Cache) as $key) {
            if (str_starts_with((string) $key, $prefix)) {
                unset($this->l1Cache[$key]);
            }
        }
    }
}
