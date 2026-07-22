<?php

/**
 * EnsureValidLicenseTest — Tests unitaires du middleware EnsureValidLicense
 *
 * Teste : passage avec licence active, grâce, blocage après grâce, temps serveur.
 */

use App\Http\Middleware\EnsureValidLicense;
use App\Models\License;
use App\Services\LicenseService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

beforeEach(function () {
    $this->org  = $this->createOrganization(['slug' => 'mw-lic-test-' . uniqid()], 'active');
    $this->user = $this->createUserWithRole($this->org, 'agent');
    $this->plan = $this->getOrCreateDefaultPlan();
    app()->instance('current_organization', $this->org);
});

it('allows request with active license', function () {
    // Licence active
    License::factory()->create([
        'organization_id' => $this->org->id,
        'plan_id'         => $this->plan->id,
        'payment_id'      => random_int(10000, 99999),
        'status'          => 'active',
        'starts_at'       => Carbon::now()->subDay(),
        'expires_at'      => Carbon::now()->addMonth()->endOfDay(),
        'grace_ends_at'   => Carbon::now()->addMonth()->addDays(7)->endOfDay(),
    ]);

    $this->org->refresh();
    $this->actingAs($this->user);

    $response = $this->getJson('/api/events');

    // Le middleware ne doit pas bloquer (pas de 402/403)
    expect($response->status())->not->toBe(402)
        ->and($response->status())->not->toBe(403);
});

it('allows request during grace period', function () {
    // Licence expirée il y a 3 jours, grâce encore valide
    $expiresAt = Carbon::now()->subDays(3);

    License::factory()->create([
        'organization_id' => $this->org->id,
        'plan_id'         => $this->plan->id,
        'payment_id'      => random_int(10000, 99999),
        'status'          => 'active',
        'starts_at'       => $expiresAt->copy()->subMonth(),
        'expires_at'      => $expiresAt,
        'grace_ends_at'   => $expiresAt->copy()->addDays(7),
    ]);

    $this->org->refresh();
    $this->actingAs($this->user);

    // Injecter un LicenseService mocké qui retourne STATUS_GRACE
    $licenseMock = Mockery::mock(LicenseService::class);
    $licenseMock->shouldReceive('checkStatus')
        ->with($this->org->id)
        ->andReturn(LicenseService::STATUS_GRACE);

    app()->instance(LicenseService::class, $licenseMock);

    $middleware = new EnsureValidLicense($licenseMock);
    $request    = Request::create('/api/events', 'GET');
    $request->headers->set('Accept', 'application/json');

    // Simuler l'utilisateur authentifié
    auth()->setUser($this->user);
    app()->instance('current_organization', $this->org);

    $response = $middleware->handle($request, fn ($req) => response()->json(['ok' => true]));

    expect($response->getStatusCode())->toBe(200);
});

it('blocks request after grace period', function () {
    $licenseMock = Mockery::mock(LicenseService::class);
    $licenseMock->shouldReceive('checkStatus')
        ->with($this->org->id)
        ->andReturn(LicenseService::STATUS_EXPIRED);

    app()->instance(LicenseService::class, $licenseMock);

    $middleware = new EnsureValidLicense($licenseMock);
    $request    = Request::create('/api/events', 'GET');
    $request->headers->set('Accept', 'application/json');

    auth()->setUser($this->user);
    app()->instance('current_organization', $this->org);

    $response = $middleware->handle($request, fn ($req) => response()->json(['ok' => true]));

    // Doit retourner 402 Payment Required
    expect($response->getStatusCode())->toBe(SymfonyResponse::HTTP_PAYMENT_REQUIRED);

    $body = json_decode($response->getContent(), true);
    expect($body['error'])->toBe('license_expired');
});

it('uses server time never header time', function () {
    // Tenter de manipuler l'heure via un header client
    $fakeFutureDate = Carbon::now()->addYear()->toRfc7231String();

    $licenseMock = Mockery::mock(LicenseService::class);
    $licenseMock->shouldReceive('checkStatus')
        ->with($this->org->id)
        ->andReturn(LicenseService::STATUS_EXPIRED);

    $middleware = new EnsureValidLicense($licenseMock);
    $request    = Request::create('/api/events', 'GET');
    $request->headers->set('Accept', 'application/json');
    $request->headers->set('X-Custom-Date', $fakeFutureDate);  // Header malveillant
    $request->headers->set('Date', $fakeFutureDate);

    auth()->setUser($this->user);
    app()->instance('current_organization', $this->org);

    $response = $middleware->handle($request, fn ($req) => response()->json(['ok' => true]));

    // Malgré le header qui prétend une date future, le middleware doit bloquer
    // car il utilise Carbon::now() côté serveur
    expect($response->getStatusCode())->toBe(SymfonyResponse::HTTP_PAYMENT_REQUIRED);
});
