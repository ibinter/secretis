<?php

use App\Models\License;
use App\Models\Payment;
use App\Services\LicenseService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seedForTests();
    $this->licenseService = app(LicenseService::class);
});

// =============================================================================
// ACCÈS ROUTES PREMIUM
// =============================================================================

test('accès route premium avec licence active retourne 200', function () {
    $org  = $this->createOrganization(['slug' => 'org-active-license'], 'active');
    $this->createActiveLicense($org);
    $user = $this->createUserWithRole($org, 'agent');

    $this->actingAsUserInOrganization($user);

    // Route protégée par EnsureValidLicense middleware
    $response = $this->getJson('/api/agenda/events');

    $response->assertStatus(200);
});

test('accès route premium avec licence expirée retourne 402 avec info renouvellement', function () {
    $org = $this->createOrganization(['slug' => 'org-expired'], 'expired');
    $this->createExpiredLicense($org);
    $user = $this->createUserWithRole($org, 'agent');

    $this->actingAsUserInOrganization($user);

    $response = $this->getJson('/api/agenda/events');

    $response->assertStatus(402)
             ->assertJsonStructure(['error', 'message', 'renew_url']);

    expect($response->json('error'))->toBe('license_expired');
});

test('accès route premium avec licence suspendue retourne 403', function () {
    $org = $this->createOrganization(['slug' => 'org-suspended'], 'suspended');
    $user = $this->createUserWithRole($org, 'agent');

    $this->actingAsUserInOrganization($user);

    $response = $this->getJson('/api/agenda/events');

    $response->assertStatus(403)
             ->assertJsonStructure(['error', 'message', 'support_url']);

    expect($response->json('error'))->toBe('account_suspended');
});

test('accès route premium en période de grâce retourne 200', function () {
    $org = $this->createOrganization(['slug' => 'org-grace'], 'active');
    $this->createGraceLicense($org); // Expirée il y a 3j, grâce de 7j → encore valide
    $user = $this->createUserWithRole($org, 'agent');

    $this->actingAsUserInOrganization($user);

    $response = $this->getJson('/api/agenda/events');

    $response->assertStatus(200);
});

test('route de renouvellement accessible même avec licence expirée', function () {
    $org  = $this->createOrganization(['slug' => 'org-renew-access'], 'expired');
    $this->createExpiredLicense($org);
    $user = $this->createUserWithRole($org, 'agent');

    $this->actingAsUserInOrganization($user);

    // La route license.renew est exclue du middleware
    $response = $this->getJson('/api/license/renew');

    // Pas de 402 sur cette route (peut retourner 200 ou autre selon la logique)
    $response->assertStatus(fn($status) => $status !== 402);
});

// =============================================================================
// ACTIVATION LICENCE
// =============================================================================

test('activation licence passe le statut à active', function () {
    $org     = $this->createOrganization(['slug' => 'org-to-activate'], 'trial');
    $plan    = $this->getOrCreateDefaultPlan();
    $payment = Payment::factory()->create([
        'organization_id' => $org->id,
        'amount'          => $plan->price,
        'status'          => 'completed',
    ]);

    $license = $this->licenseService->activate(
        organizationId: $org->id,
        planId: $plan->id,
        paymentId: $payment->id,
        durationMonths: 1,
    );

    expect($license->status)->toBe('active');
    expect($license->organization_id)->toBe($org->id);
    expect($license->expires_at)->toBeInstanceOf(Carbon::class);
    expect($license->expires_at->isFuture())->toBeTrue();

    // L'organisation a son statut mis à jour
    $org->refresh();
    expect($org->status)->toBe('active');
});

test('activation définit correctement les dates serveur (pas client)', function () {
    $org     = $this->createOrganization(['slug' => 'org-server-dates'], 'trial');
    $plan    = $this->getOrCreateDefaultPlan();
    $payment = Payment::factory()->create([
        'organization_id' => $org->id,
        'status'          => 'completed',
    ]);

    $before = Carbon::now()->subSecond();
    $license = $this->licenseService->activate($org->id, $plan->id, $payment->id, 1);
    $after   = Carbon::now()->addSecond();

    // starts_at est dans la fenêtre temporelle du test (serveur, pas client)
    expect($license->starts_at->between($before, $after))->toBeTrue();

    // expires_at est environ 1 mois dans le futur
    $expectedExpiry = Carbon::now()->addMonth();
    expect($license->expires_at->diffInHours($expectedExpiry))->toBeLessThan(24);

    // grace_ends_at est 7 jours après expires_at
    $graceDiff = $license->expires_at->diffInDays($license->grace_ends_at);
    expect($graceDiff)->toBe(7);
});

// =============================================================================
// IDEMPOTENCE — Même paiement ne peut activer 2 fois
// =============================================================================

test('idempotence : même payment_id ne peut pas activer deux licences distinctes', function () {
    $org     = $this->createOrganization(['slug' => 'org-idempotent'], 'trial');
    $plan    = $this->getOrCreateDefaultPlan();
    $payment = Payment::factory()->create([
        'organization_id' => $org->id,
        'status'          => 'completed',
    ]);

    // Première activation
    $license1 = $this->licenseService->activate($org->id, $plan->id, $payment->id, 1);

    // Deuxième appel avec le même payment_id
    $license2 = $this->licenseService->activate($org->id, $plan->id, $payment->id, 1);

    // Doit retourner la même licence (idempotent)
    expect($license1->id)->toBe($license2->id);

    // Une seule licence créée en BDD pour ce payment_id
    $count = License::where('payment_id', $payment->id)->count();
    expect($count)->toBe(1);
});

// =============================================================================
// ISOLATION MULTI-TENANT
// =============================================================================

test('organisation A ne peut pas accéder aux données de organisation B', function () {
    $orgA = $this->createOrganization(['slug' => 'org-a-isolation'], 'trial');
    $orgB = $this->createOrganization(['slug' => 'org-b-isolation'], 'trial');

    $userA = $this->createUserWithRole($orgA, 'admin_org');

    // Créer un événement pour org B
    $eventB = \App\Models\Event::factory()->create([
        'organization_id' => $orgB->id,
        'title'           => 'Événement secret org B',
    ]);

    $this->actingAsUserInOrganization($userA);

    // L'utilisateur A tente d'accéder à l'événement B par son ID
    $response = $this->getJson("/api/agenda/events/{$eventB->id}");

    // Doit être 404 (pas 403, pour ne pas révéler l'existence)
    $response->assertStatus(404);
});

test('injection organization_id dans le body est ignorée (toujours résolu depuis le tenant)', function () {
    $orgA = $this->createOrganization(['slug' => 'org-a-inject'], 'trial');
    $orgB = $this->createOrganization(['slug' => 'org-b-inject'], 'trial');

    $userA = $this->createUserWithRole($orgA, 'admin_org');

    $this->actingAsUserInOrganization($userA);

    // Tentative d'injection : on essaie de créer un événement pour org B
    $response = $this->postJson('/api/agenda/events', [
        'title'           => 'Événement injecté',
        'organization_id' => $orgB->id, // Tentative d'injection
        'start_at'        => now()->addDay()->toIso8601String(),
        'end_at'          => now()->addDay()->addHour()->toIso8601String(),
    ]);

    if ($response->status() === 201) {
        // L'événement créé doit appartenir à org A, pas B
        $eventId = $response->json('data.id') ?? $response->json('id');
        $event   = \App\Models\Event::find($eventId);

        expect($event?->organization_id)->toBe($orgA->id)
            ->not->toBe($orgB->id);
    } else {
        // Ou le serveur a rejeté la requête (aussi acceptable)
        $response->assertStatus(fn($s) => in_array($s, [201, 422, 403]));
    }
});

test('accès superadmin IBIG peut lire les données de toutes les orgs', function () {
    $orgA      = $this->createOrganization(['slug' => 'org-sa-a'], 'trial');
    $orgB      = $this->createOrganization(['slug' => 'org-sa-b'], 'trial');
    $superAdmin = $this->createSuperAdmin();

    // Créer des données dans org A et B
    $this->createActiveLicense($orgA);
    $this->createActiveLicense($orgB);

    $this->actingAsUserInOrganization($superAdmin);

    // Un superadmin peut accéder à une route de gestion de toutes les orgs
    $response = $this->getJson('/api/admin/organizations');

    $response->assertStatus(200);

    $orgIds = collect($response->json('data'))->pluck('id')->toArray();
    expect($orgIds)->toContain($orgA->id);
    expect($orgIds)->toContain($orgB->id);
});
