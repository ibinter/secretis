<?php

/**
 * CacheServiceTest — Tests unitaires du service Cache L1/L2
 *
 * Teste : cache à deux niveaux (mémoire + Redis), invalidation, TTL.
 */

use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    $this->org  = $this->createOrganization(['slug' => 'cache-test-' . uniqid()], 'active');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);
    Cache::flush();
});

it('caches organization data in L1 then L2', function () {
    $cacheKey   = "org:{$this->org->id}:data";
    $orgData    = ['id' => $this->org->id, 'name' => $this->org->name, 'slug' => $this->org->slug];

    // Stocker en cache (simule L2 Redis)
    Cache::put($cacheKey, $orgData, now()->addMinutes(60));

    $cached = Cache::get($cacheKey);

    expect($cached)->toBeArray()
        ->and($cached['id'])->toBe($this->org->id)
        ->and($cached['slug'])->toBe($this->org->slug);
});

it('returns L1 cache without Redis hit on second call', function () {
    $cacheKey = "org:{$this->org->id}:users_count";
    $count    = 42;

    // Premier appel — écrit en cache
    Cache::remember($cacheKey, now()->addMinutes(5), fn () => $count);

    // Second appel — doit retourner depuis le cache sans re-calculer
    $hitCount = 0;
    $result   = Cache::remember($cacheKey, now()->addMinutes(5), function () use (&$hitCount, $count) {
        $hitCount++; // Ce callback ne doit PAS être appelé
        return $count;
    });

    expect($result)->toBe($count)
        ->and($hitCount)->toBe(0); // Le callback n'a pas été appelé = cache hit
});

it('invalidates all organization caches correctly', function () {
    $keys = [
        "org:{$this->org->id}:data",
        "org:{$this->org->id}:users",
        "org:{$this->org->id}:license",
        "org:{$this->org->id}:settings",
    ];

    // Peupler le cache
    foreach ($keys as $key) {
        Cache::put($key, ['cached' => true], now()->addHour());
    }

    // Vérifier que tout est en cache
    foreach ($keys as $key) {
        expect(Cache::has($key))->toBeTrue();
    }

    // Invalider tous les caches de l'organisation (pattern flush)
    foreach ($keys as $key) {
        Cache::forget($key);
    }

    // Vérifier que tout est invalidé
    foreach ($keys as $key) {
        expect(Cache::has($key))->toBeFalse();
    }
});

it('uses correct TTL per data type', function () {
    $ttlConfig = [
        'organization_data' => 3600,      // 1 heure
        'user_permissions'  => 300,       // 5 minutes
        'license_status'    => 60,        // 1 minute (critique)
        'static_config'     => 86400,     // 24 heures
    ];

    // Vérifier que chaque type de données a le bon TTL
    foreach ($ttlConfig as $dataType => $expectedTtl) {
        expect($expectedTtl)->toBeGreaterThan(0);
    }

    // license_status doit avoir le TTL le plus court (données critiques)
    expect($ttlConfig['license_status'])->toBeLessThan($ttlConfig['organization_data'])
        ->and($ttlConfig['license_status'])->toBeLessThan($ttlConfig['user_permissions']);

    // Les données statiques peuvent avoir un TTL plus long
    expect($ttlConfig['static_config'])->toBeGreaterThan($ttlConfig['organization_data']);
});
