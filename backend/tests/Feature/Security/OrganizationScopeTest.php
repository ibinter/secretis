<?php

use App\Http\Middleware\EnforceOrganizationScope;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

// ===========================================================================
// Fixtures partagées
// ===========================================================================

beforeEach(function () {
    $this->seedForTests();

    // Créer deux organisations isolées
    $this->orgA = $this->createOrganization(['slug' => 'org-a-scope'], 'active');
    $this->orgB = $this->createOrganization(['slug' => 'org-b-scope'], 'active');

    // Un utilisateur par organisation
    $this->userA = $this->createUserWithRole($this->orgA, 'admin');
    $this->userB = $this->createUserWithRole($this->orgB, 'admin');

    // Super-admin IBIG
    $this->superAdmin = $this->createUserWithRole($this->orgA, 'superadmin_ibig');

    // Enregistrer des routes de test avec le middleware
    Route::middleware(['api', 'auth:sanctum', EnforceOrganizationScope::class])
        ->prefix('test-scope')
        ->group(function () {
            // Route simple — vérifie l'accès général
            Route::get('/resource', fn () => response()->json(['ok' => true]));

            // Route avec organization_id en query string
            Route::get('/by-org', fn () => response()->json(['ok' => true]));

            // Route avec organization_id dans le body
            Route::post('/create', fn () => response()->json(['ok' => true]));
        });
});

// ===========================================================================
// Tests
// ===========================================================================

it('prevents user from accessing another org resources', function () {
    // userA tente d'accéder avec son token mais inject l'org de B en query string
    $this->actingAs($this->userA, 'sanctum')
        ->getJson('/test-scope/by-org?organization_id=' . $this->orgB->id)
        ->assertStatus(403)
        ->assertJson(['code' => 'ORGANIZATION_SCOPE_VIOLATION']);
});

it('rejects organization_id injection in query params', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->getJson('/test-scope/by-org?organization_id=' . $this->orgB->id)
        ->assertStatus(403)
        ->assertJsonFragment(['error' => 'forbidden']);
});

it('rejects organization_id injection in request body', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->postJson('/test-scope/create', [
            'name'            => 'Test Resource',
            'organization_id' => $this->orgB->id,  // injection tentée
        ])
        ->assertStatus(403)
        ->assertJson(['code' => 'ORGANIZATION_SCOPE_VIOLATION']);
});

it('super-admin can access any organization', function () {
    // Le super-admin est exempt du scope — peut passer n'importe quel org_id
    $this->actingAs($this->superAdmin, 'sanctum')
        ->getJson('/test-scope/by-org?organization_id=' . $this->orgB->id)
        ->assertStatus(200)
        ->assertJson(['ok' => true]);
});

it('returns 403 not 404 on cross-org access attempt', function () {
    // La réponse doit être 403 (accès refusé) et non 404 (ressource introuvable)
    // pour éviter d'informer l'attaquant sur l'existence de la ressource
    $response = $this->actingAs($this->userA, 'sanctum')
        ->getJson('/test-scope/by-org?organization_id=' . $this->orgB->id);

    $response->assertStatus(403);
    expect($response->status())->not->toBe(404);
});

it('allows access when organization_id matches own org', function () {
    $this->actingAs($this->userA, 'sanctum')
        ->getJson('/test-scope/by-org?organization_id=' . $this->orgA->id)
        ->assertStatus(200)
        ->assertJson(['ok' => true]);
});

it('allows access when no organization_id is provided in request', function () {
    // Pas d'injection — requête normale
    $this->actingAs($this->userA, 'sanctum')
        ->getJson('/test-scope/resource')
        ->assertStatus(200);
});

it('blocks user without organization_id', function () {
    // Utilisateur sans org_id (compte mal configuré)
    $orphanUser = User::factory()->create([
        'organization_id' => null,
        'status'          => 'active',
    ]);

    $this->actingAs($orphanUser, 'sanctum')
        ->getJson('/test-scope/resource')
        ->assertStatus(403);
});
