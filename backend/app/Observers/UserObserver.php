<?php

namespace App\Observers;

use App\Models\User;
use App\Services\CacheService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * UserObserver — Invalidation du cache permissions + dashboard utilisateur
 *
 * Déclenché sur updated/deleted du modèle User.
 * Invalide :
 *   - Le cache de permissions Spatie (tag 'user:{id}')
 *   - Le cache dashboard de l'organisation (tag 'module:dashboard')
 *   - Les permissions Spatie mises en cache nativement par le package
 *
 * Enregistrement : voir AppServiceProvider::registerObservers()
 */
class UserObserver
{
    public function __construct(private readonly CacheService $cache) {}

    public function updated(User $user): void
    {
        // N'invalider que si un attribut lié aux permissions/accès a changé
        $permissionAttributes = ['role', 'organization_id', 'is_active', 'deleted_at'];
        $touchesPermissions   = $user->wasChanged($permissionAttributes);

        $this->invalidate($user, forcePermissions: $touchesPermissions);
    }

    public function deleted(User $user): void
    {
        $this->invalidate($user, forcePermissions: true);
    }

    public function restored(User $user): void
    {
        $this->invalidate($user, forcePermissions: true);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function invalidate(User $user, bool $forcePermissions): void
    {
        $userId = $user->id;
        $orgId  = $user->organization_id;

        dispatch(function () use ($userId, $orgId, $forcePermissions) {
            if ($forcePermissions) {
                // Invalide le cache de permissions SECRETIS (CacheService)
                $this->cache->invalidateUserCache($userId);

                // Invalide aussi le cache natif de Spatie Permission
                // Spatie stocke les permissions sous la clé : spatie.permission.cache
                // et dans les stores par modèle sous : 'spatie.permission.{guard}.{userId}'
                $spatieKey = config('permission.cache.key', 'spatie.permission.cache');
                Cache::forget($spatieKey);

                // Pour Spatie v6+ avec cache par utilisateur
                $guardName = config('auth.defaults.guard', 'web');
                Cache::forget("{$spatieKey}.{$guardName}.{$userId}");

                Log::debug("[UserObserver] Cache permissions vidé pour user#{$userId}.");
            }

            if ($orgId) {
                $this->cache->flushModule('dashboard');
                Log::debug("[UserObserver] Cache dashboard vidé pour org#{$orgId}.");
            }
        })->afterResponse();
    }
}
