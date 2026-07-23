<?php

use App\Http\Middleware\RateLimitByRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Cache\RateLimiter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

// ===========================================================================
// Fixtures partagées
// ===========================================================================

beforeEach(function () {
    $this->seedForTests();

    $this->org = $this->createOrganization(['slug' => 'org-ratelimit'], 'active');

    // Enregistrer une route de test soumise au rate limiting
    Route::middleware(['api', RateLimitByRole::class])
        ->get('/test-rate-limit', fn () => response()->json(['ok' => true]));

    // Vider tous les compteurs de rate limit avant chaque test
    app(RateLimiter::class)->clear('*');
});

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Effectue N requêtes sur la route de test.
 */
function hitRateLimitRoute(int $times, ?User $user = null): \Illuminate\Testing\TestResponse
{
    $test  = test();
    $lastResponse = null;

    for ($i = 0; $i < $times; $i++) {
        $request = $user
            ? $test->actingAs($user, 'sanctum')->getJson('/test-rate-limit')
            : $test->getJson('/test-rate-limit');
        $lastResponse = $request;
    }

    return $lastResponse;
}

// ===========================================================================
// Tests
// ===========================================================================

it('blocks after exceeding rate limit for role', function () {
    // visiteur_externe a une limite de 20 req/min
    $visitor = $this->createUserWithRole($this->org, 'visiteur_externe');

    // Effectuer 21 requêtes (au-dessus de la limite de 20)
    $response = hitRateLimitRoute(21, $visitor);

    $response->assertStatus(429);
});

it('returns retry_after header on 429', function () {
    $visitor = $this->createUserWithRole($this->org, 'visiteur_externe');

    $response = hitRateLimitRoute(21, $visitor);

    $response->assertStatus(429)
             ->assertJsonStructure(['error', 'message', 'retry_after'])
             ->assertHeader('Retry-After');

    // retry_after doit être un entier positif
    expect($response->json('retry_after'))->toBeGreaterThan(0);
});

it('different roles have different limits', function () {
    // admin a une limite de 300, visiteur_externe de 20
    $admin   = $this->createUserWithRole($this->org, 'admin');
    $visitor = $this->createUserWithRole($this->org, 'visiteur_externe');

    // visiteur_externe bloqué après 20 requêtes
    $visitorResponse = hitRateLimitRoute(21, $visitor);
    expect($visitorResponse->status())->toBe(429);

    // admin toujours autorisé après 21 requêtes (limite 300)
    // On utilise un client séparé pour ne pas partager les compteurs
    $adminResponse = $this->actingAs($admin, 'sanctum')->getJson('/test-rate-limit');
    expect($adminResponse->status())->toBe(200);
});

it('unauthenticated requests have lowest limit', function () {
    // Non authentifié : limite 30 req/min
    $response = hitRateLimitRoute(31);

    $response->assertStatus(429)
             ->assertJson(['error' => 'rate_limit_exceeded']);
});

it('adds rate limit headers on successful requests', function () {
    $user = $this->createUserWithRole($this->org, 'admin');

    $response = $this->actingAs($user, 'sanctum')->getJson('/test-rate-limit');

    $response->assertStatus(200)
             ->assertHeader('X-RateLimit-Limit')
             ->assertHeader('X-RateLimit-Remaining');

    // Remaining doit être inférieur à la limite
    $limit     = (int) $response->headers->get('X-RateLimit-Limit');
    $remaining = (int) $response->headers->get('X-RateLimit-Remaining');

    expect($remaining)->toBeLessThan($limit);
    expect($limit)->toBe(300); // admin = 300 req/min
});

it('super-admin has highest rate limit', function () {
    $superAdmin = $this->createUserWithRole($this->org, 'superadmin_ibig');

    $response = $this->actingAs($superAdmin, 'sanctum')->getJson('/test-rate-limit');

    $response->assertStatus(200);
    $limit = (int) $response->headers->get('X-RateLimit-Limit');

    // super-admin = 1000 req/min
    expect($limit)->toBe(1000);
});
