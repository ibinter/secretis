<?php

/**
 * CacheServiceTest — Tests unitaires du service de cache tagué par organisation/module
 *
 * Couvre : stockage avec tags, oubli de clé, flush org, flush module, TTL.
 */

use App\Services\CacheService;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
});

// =============================================================================
// Stockage avec tags
// =============================================================================

it('stores value with org and module tags', function () {
    $service = app(CacheService::class);

    $service->put(orgId: 1, module: 'courrier', key: 'recent_list', value: ['item1', 'item2'], ttl: 300);

    $result = $service->get(orgId: 1, module: 'courrier', key: 'recent_list');

    expect($result)->toBe(['item1', 'item2']);
});

it('different orgs have isolated cache keys', function () {
    $service = app(CacheService::class);

    $service->put(orgId: 1, module: 'taches', key: 'count', value: 42, ttl: 300);
    $service->put(orgId: 2, module: 'taches', key: 'count', value: 999, ttl: 300);

    expect($service->get(orgId: 1, module: 'taches', key: 'count'))->toBe(42);
    expect($service->get(orgId: 2, module: 'taches', key: 'count'))->toBe(999);
});

it('returns null for non-existent key', function () {
    $service = app(CacheService::class);

    expect($service->get(orgId: 1, module: 'agenda', key: 'inexistant_xyz'))->toBeNull();
});

// =============================================================================
// Oubli d'une clé
// =============================================================================

it('forgets a specific key', function () {
    $service = app(CacheService::class);

    $service->put(orgId: 1, module: 'courrier', key: 'stats', value: ['total' => 50], ttl: 300);
    expect($service->get(orgId: 1, module: 'courrier', key: 'stats'))->not->toBeNull();

    $service->forget(orgId: 1, module: 'courrier', key: 'stats');

    expect($service->get(orgId: 1, module: 'courrier', key: 'stats'))->toBeNull();
});

it('forgetting one key does not affect other keys in same org', function () {
    $service = app(CacheService::class);

    $service->put(orgId: 1, module: 'courrier', key: 'key_a', value: 'value_a', ttl: 300);
    $service->put(orgId: 1, module: 'courrier', key: 'key_b', value: 'value_b', ttl: 300);

    $service->forget(orgId: 1, module: 'courrier', key: 'key_a');

    expect($service->get(orgId: 1, module: 'courrier', key: 'key_a'))->toBeNull();
    expect($service->get(orgId: 1, module: 'courrier', key: 'key_b'))->toBe('value_b');
});

// =============================================================================
// Flush organisation
// =============================================================================

it('flushes all keys for an organization', function () {
    $service = app(CacheService::class);

    $service->put(orgId: 5, module: 'agenda',  key: 'events',  value: ['e1'], ttl: 300);
    $service->put(orgId: 5, module: 'courrier', key: 'letters', value: ['l1'], ttl: 300);
    $service->put(orgId: 5, module: 'taches',   key: 'tasks',   value: ['t1'], ttl: 300);

    // Cette organisation a des données
    expect($service->get(orgId: 5, module: 'agenda', key: 'events'))->not->toBeNull();

    $service->flushOrganization(orgId: 5);

    expect($service->get(orgId: 5, module: 'agenda',  key: 'events'))->toBeNull();
    expect($service->get(orgId: 5, module: 'courrier', key: 'letters'))->toBeNull();
    expect($service->get(orgId: 5, module: 'taches',   key: 'tasks'))->toBeNull();
});

it('flush organization does not affect other organizations', function () {
    $service = app(CacheService::class);

    $service->put(orgId: 10, module: 'agenda', key: 'events', value: 'org10-data', ttl: 300);
    $service->put(orgId: 11, module: 'agenda', key: 'events', value: 'org11-data', ttl: 300);

    $service->flushOrganization(orgId: 10);

    expect($service->get(orgId: 10, module: 'agenda', key: 'events'))->toBeNull();
    expect($service->get(orgId: 11, module: 'agenda', key: 'events'))->toBe('org11-data');
});

// =============================================================================
// Flush module (toutes les organisations)
// =============================================================================

it('flushes all keys for a module across orgs', function () {
    $service = app(CacheService::class);

    $service->put(orgId: 1, module: 'reporting', key: 'dashboard', value: 'data1', ttl: 300);
    $service->put(orgId: 2, module: 'reporting', key: 'dashboard', value: 'data2', ttl: 300);
    $service->put(orgId: 1, module: 'agenda',    key: 'slots',     value: 'ag1',   ttl: 300);

    $service->flushModule(module: 'reporting');

    expect($service->get(orgId: 1, module: 'reporting', key: 'dashboard'))->toBeNull();
    expect($service->get(orgId: 2, module: 'reporting', key: 'dashboard'))->toBeNull();

    // Le module agenda ne doit pas être affecté
    expect($service->get(orgId: 1, module: 'agenda', key: 'slots'))->toBe('ag1');
});

// =============================================================================
// TTL
// =============================================================================

it('respects ttl constants', function () {
    $service = app(CacheService::class);

    // Vérifier les constantes de TTL exposées par le service
    expect($service::TTL_SHORT)->toBeInt()->toBeGreaterThan(0);   // ex: 300s
    expect($service::TTL_MEDIUM)->toBeInt()->toBeGreaterThan(0);  // ex: 1800s
    expect($service::TTL_LONG)->toBeInt()->toBeGreaterThan(0);    // ex: 86400s

    expect($service::TTL_SHORT)->toBeLessThan($service::TTL_MEDIUM);
    expect($service::TTL_MEDIUM)->toBeLessThan($service::TTL_LONG);
});

it('stored value expires after ttl', function () {
    $service = app(CacheService::class);

    // Stocker avec un TTL de 1 seconde
    $service->put(orgId: 99, module: 'test', key: 'expiring', value: 'expires_soon', ttl: 1);

    expect($service->get(orgId: 99, module: 'test', key: 'expiring'))->toBe('expires_soon');

    // Avancer l'horloge de 2 secondes
    sleep(2);

    expect($service->get(orgId: 99, module: 'test', key: 'expiring'))->toBeNull();
})->skip(fn () => ! in_array(config('cache.default'), ['redis', 'memcached']), 'TTL test requires Redis or Memcached');

it('remember returns cached value on second call', function () {
    $service  = app(CacheService::class);
    $callCount = 0;

    $first = $service->remember(
        orgId: 1, module: 'agenda', key: 'remember_test', ttl: 300,
        callback: function () use (&$callCount) {
            $callCount++;
            return 'computed_value';
        }
    );

    $second = $service->remember(
        orgId: 1, module: 'agenda', key: 'remember_test', ttl: 300,
        callback: function () use (&$callCount) {
            $callCount++;
            return 'computed_value';
        }
    );

    expect($first)->toBe('computed_value');
    expect($second)->toBe('computed_value');
    expect($callCount)->toBe(1); // Le callback ne doit être appelé qu'une fois
});
