<?php

use App\Models\Event;
use App\Models\MailRegistry;
use App\Models\Calendar;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seedForTests();

    // Deux organisations totalement distinctes
    $this->orgA = $this->createOrganization(['slug' => 'org-a-mt'], 'trial');
    $this->orgB = $this->createOrganization(['slug' => 'org-b-mt'], 'trial');

    // Un admin dans chaque organisation
    $this->adminA = $this->createUserWithRole($this->orgA, 'admin_org');
    $this->adminB = $this->createUserWithRole($this->orgB, 'admin_org');

    // Calendrier pour org A
    $this->calA = Calendar::create([
        'organization_id' => $this->orgA->id,
        'user_id'         => $this->adminA->id,
        'name'            => 'Agenda A',
        'color'           => '#3B82F6',
        'type'            => 'personal',
        'is_default'      => true,
    ]);

    // Données pour org B
    $start = Carbon::now()->addDays(5)->startOfHour();
    $this->eventB = Event::create([
        'organization_id' => $this->orgB->id,
        'calendar_id'     => Calendar::create([
            'organization_id' => $this->orgB->id,
            'user_id'         => $this->adminB->id,
            'name'            => 'Agenda B',
            'color'           => '#EF4444',
            'type'            => 'personal',
            'is_default'      => true,
        ])->id,
        'creator_id'      => $this->adminB->id,
        'title'           => 'Événement confidentiel de org B',
        'start_at'        => $start,
        'end_at'          => $start->copy()->addHour(),
    ]);

    $this->courrierB = MailRegistry::create([
        'organization_id' => $this->orgB->id,
        'type'            => 'incoming',
        'reference'       => 'REF-ENTRANT-2026-B-001',
        'subject'         => 'Courrier confidentiel org B',
        'status'          => 'pending',
        'created_by_id'   => $this->adminB->id,
    ]);
});

// =============================================================================
// CRITIQUE : Lecture cross-tenant impossible
// =============================================================================

test('CRITIQUE : user org A ne peut pas lire les événements de org B', function () {
    $this->actingAsUserInOrganization($this->adminA);

    // Tentative d'accès direct par ID
    $response = $this->getJson("/api/agenda/events/{$this->eventB->id}");
    $response->assertStatus(404);

    // Tentative via listing (ne doit pas apparaître dans la liste)
    $listResponse = $this->getJson('/api/agenda/events');
    $listResponse->assertStatus(200);

    $eventIds = collect($listResponse->json('data'))->pluck('id')->toArray();
    expect($eventIds)->not->toContain($this->eventB->id);
});

test('CRITIQUE : user org A ne peut pas lire le courrier de org B', function () {
    $this->actingAsUserInOrganization($this->adminA);

    $response = $this->getJson("/api/courrier/{$this->courrierB->id}");
    $response->assertStatus(404);

    $listResponse = $this->getJson('/api/courrier');
    $listResponse->assertStatus(200);

    $ids = collect($listResponse->json('data'))->pluck('id')->toArray();
    expect($ids)->not->toContain($this->courrierB->id);
});

// =============================================================================
// CRITIQUE : Modification cross-tenant impossible
// =============================================================================

test('CRITIQUE : user org A ne peut pas modifier un événement de org B', function () {
    $this->actingAsUserInOrganization($this->adminA);

    $response = $this->putJson("/api/agenda/events/{$this->eventB->id}", [
        'title' => 'COMPROMIS PAR ORG A',
    ]);

    // 404 ou 403 — dans les deux cas, pas de modification
    $response->assertStatus(fn($s) => in_array($s, [403, 404]));

    // L'événement n'a pas été modifié
    $this->eventB->refresh();
    expect($this->eventB->title)->toBe('Événement confidentiel de org B');
});

test('CRITIQUE : user org A ne peut pas changer le statut du courrier de org B', function () {
    $this->actingAsUserInOrganization($this->adminA);

    $response = $this->patchJson("/api/courrier/{$this->courrierB->id}/status", [
        'status' => 'archived',
    ]);

    $response->assertStatus(fn($s) => in_array($s, [403, 404]));

    // Le statut n'a pas changé
    $this->courrierB->refresh();
    expect($this->courrierB->status)->toBe('pending');
});

// =============================================================================
// CRITIQUE : Suppression cross-tenant impossible
// =============================================================================

test('CRITIQUE : user org A ne peut pas supprimer un événement de org B', function () {
    $this->actingAsUserInOrganization($this->adminA);

    $response = $this->deleteJson("/api/agenda/events/{$this->eventB->id}");

    $response->assertStatus(fn($s) => in_array($s, [403, 404]));

    // L'événement existe toujours en BDD
    $this->assertDatabaseHas('events', ['id' => $this->eventB->id]);
    expect(Event::find($this->eventB->id))->not->toBeNull();
});

test('CRITIQUE : user org A ne peut pas supprimer le courrier de org B', function () {
    $this->actingAsUserInOrganization($this->adminA);

    $response = $this->deleteJson("/api/courrier/{$this->courrierB->id}");

    $response->assertStatus(fn($s) => in_array($s, [403, 404]));

    $this->assertDatabaseHas('mail_registry', ['id' => $this->courrierB->id]);
});

// =============================================================================
// INJECTION organization_id — Ignorée, toujours résolu depuis le tenant
// =============================================================================

test('injection organization_id dans le body est ignorée', function () {
    $this->actingAsUserInOrganization($this->adminA);

    $start = Carbon::now()->addDays(10)->startOfHour();

    $response = $this->postJson('/api/agenda/events', [
        'title'           => 'Événement injecté',
        'organization_id' => $this->orgB->id, // Injection : on essaie de créer pour org B
        'start_at'        => $start->toIso8601String(),
        'end_at'          => $start->copy()->addHour()->toIso8601String(),
        'calendar_id'     => $this->calA->id,
    ]);

    if ($response->status() === 201) {
        $createdId = $response->json('data.id') ?? $response->json('id');
        $event     = Event::find($createdId);

        // L'événement DOIT appartenir à org A (tenant résolu), pas org B (injecté)
        expect($event->organization_id)->toBe($this->orgA->id)
                                       ->not->toBe($this->orgB->id);
    } else {
        // Rejet de la requête = aussi acceptable
        $response->assertStatus(fn($s) => in_array($s, [422, 403, 201]));
    }
});

test('injection organization_id dans query string ignorée', function () {
    $this->actingAsUserInOrganization($this->adminA);

    // Tenter de lire les événements de org B via query string
    $response = $this->getJson("/api/agenda/events?organization_id={$this->orgB->id}");

    $response->assertStatus(200);

    // Tous les résultats doivent être de org A
    $events = collect($response->json('data'));
    $events->each(function ($event) {
        expect($event['organization_id'] ?? $this->orgA->id)->toBe($this->orgA->id);
    });

    // L'événement de org B n'apparaît pas
    $ids = $events->pluck('id')->toArray();
    expect($ids)->not->toContain($this->eventB->id);
});

// =============================================================================
// SCOPE AUTOMATIQUE — Toutes les requêtes filtrées par organization_id
// =============================================================================

test('scope automatique : toutes les requêtes sont filtrées par organization_id du tenant', function () {
    // Créer des données dans les deux organisations
    $start = Carbon::now()->addDays(15)->startOfHour();

    Event::create([
        'organization_id' => $this->orgA->id,
        'calendar_id'     => $this->calA->id,
        'creator_id'      => $this->adminA->id,
        'title'           => 'Événement org A',
        'start_at'        => $start,
        'end_at'          => $start->copy()->addHour(),
    ]);

    // org A ne voit que ses événements
    $this->actingAsUserInOrganization($this->adminA);
    $responseA = $this->getJson('/api/agenda/events');
    $responseA->assertStatus(200);

    $idsForA = collect($responseA->json('data'))->pluck('id')->toArray();

    // Changer pour org B
    $this->actingAsUserInOrganization($this->adminB);
    $responseB = $this->getJson('/api/agenda/events');
    $responseB->assertStatus(200);

    $idsForB = collect($responseB->json('data'))->pluck('id')->toArray();

    // L'événement de org B est dans la liste B
    expect($idsForB)->toContain($this->eventB->id);

    // L'événement de org B n'est PAS dans la liste A
    expect($idsForA)->not->toContain($this->eventB->id);

    // Les deux listes sont disjointes sur le critère cross-org
    $intersection = array_intersect($idsForA, $idsForB);
    expect($intersection)->toBeEmpty();
});

// =============================================================================
// SUPERADMIN IBIG — Accès à toutes les orgs
// =============================================================================

test('superadmin IBIG peut accéder aux données de toutes les organisations', function () {
    $superAdmin = $this->createSuperAdmin();

    // Le superadmin n'a pas de tenant fixe → accès global
    $this->actingAs($superAdmin);

    // Accès aux événements de org A
    $responseA = $this->getJson("/api/admin/organizations/{$this->orgA->id}/events");
    $responseA->assertStatus(200);

    // Accès aux événements de org B
    $responseB = $this->getJson("/api/admin/organizations/{$this->orgB->id}/events");
    $responseB->assertStatus(200);

    // Événement de B visible dans le contexte de B
    $idsB = collect($responseB->json('data'))->pluck('id')->toArray();
    expect($idsB)->toContain($this->eventB->id);
});

test('superadmin peut lister toutes les organisations', function () {
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    $response = $this->getJson('/api/admin/organizations');
    $response->assertStatus(200);

    $orgIds = collect($response->json('data'))->pluck('id')->toArray();
    expect($orgIds)->toContain($this->orgA->id);
    expect($orgIds)->toContain($this->orgB->id);
});
