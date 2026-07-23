<?php

/**
 * SupportTicketsTest — Tests Feature du module Support Tickets
 *
 * Couvre : création, messages, multitenancy, fermeture, évaluation, superadmin.
 */

use App\Models\SupportTicket;
use App\Models\TicketMessage;
use App\Models\User;

beforeEach(function () {
    $this->seedForTests();
});

// =============================================================================
// Création de ticket
// =============================================================================

it('user can create a support ticket', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $response = $this->postJson('/api/v1/support/tickets', [
        'subject'  => 'Impossible de se connecter au module comptabilité',
        'message'  => 'Depuis hier, j\'obtiens une erreur 500 sur /comptabilite.',
        'priority' => 'high',
        'category' => 'technical',
    ]);

    $response->assertStatus(201)
             ->assertJsonStructure([
                 'data' => ['id', 'ticket_number', 'subject', 'status', 'priority', 'category'],
             ]);

    expect($response->json('data.status'))->toBe('open');
    $this->assertDatabaseHas('support_tickets', [
        'organization_id' => $org->id,
        'user_id'         => $user->id,
        'subject'         => 'Impossible de se connecter au module comptabilité',
    ]);
});

it('ticket creation requires subject and message', function () {
    actingAsOrg('agent');

    $this->postJson('/api/v1/support/tickets', [])
         ->assertStatus(422)
         ->assertJsonValidationErrors(['subject', 'message']);
});

// =============================================================================
// Numéro de ticket auto-généré
// =============================================================================

it('ticket number is auto-generated with correct format', function () {
    ['org' => $org] = actingAsOrg('agent');

    $response = $this->postJson('/api/v1/support/tickets', [
        'subject'  => 'Test format numéro ticket',
        'message'  => 'Vérification du format du numéro de ticket.',
        'priority' => 'low',
        'category' => 'other',
    ]);

    $response->assertStatus(201);
    $ticketNumber = $response->json('data.ticket_number');

    // Format attendu : TKT-YYYYMMDD-XXXXXX
    expect($ticketNumber)->toMatch('/^TKT-\d{8}-[A-Z0-9]{6}$/');
});

// =============================================================================
// Ajout de message
// =============================================================================

it('user can add message to their ticket', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $ticket = SupportTicket::factory()->open()->forOrganization($org->id)->create([
        'user_id' => $user->id,
    ]);

    $response = $this->postJson("/api/v1/support/tickets/{$ticket->id}/messages", [
        'content' => 'Voici les logs d\'erreur supplémentaires demandés.',
    ]);

    $response->assertStatus(201)
             ->assertJsonStructure(['data' => ['id', 'content', 'created_at']]);

    $this->assertDatabaseHas('ticket_messages', [
        'ticket_id' => $ticket->id,
        'user_id'   => $user->id,
        'content'   => 'Voici les logs d\'erreur supplémentaires demandés.',
        'is_internal' => false,
    ]);
});

// =============================================================================
// Isolation multitenancy
// =============================================================================

it('user cannot see tickets from another organization', function () {
    // Org A avec ticket
    $orgA  = $this->createOrganization(['slug' => 'support-org-a-' . uniqid()], 'active');
    $this->createActiveLicense($orgA);
    $userA = $this->createUserWithRole($orgA, 'agent');
    $ticketA = SupportTicket::factory()->forOrganization($orgA->id)->create(['user_id' => $userA->id]);

    // Org B (utilisateur connecté)
    ['org' => $orgB, 'user' => $userB] = actingAsOrg('agent');

    // L'utilisateur B ne doit pas voir le ticket de A
    $this->getJson("/api/v1/support/tickets/{$ticketA->id}")
         ->assertStatus(403);

    // La liste ne doit pas contenir le ticket de A
    $response = $this->getJson('/api/v1/support/tickets');
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->not->toContain($ticketA->id);
});

// =============================================================================
// Fermeture de ticket
// =============================================================================

it('user can close their ticket', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $ticket = SupportTicket::factory()->open()->forOrganization($org->id)->create([
        'user_id' => $user->id,
    ]);

    $response = $this->patchJson("/api/v1/support/tickets/{$ticket->id}/close");

    $response->assertStatus(200)
             ->assertJson(['data' => ['status' => 'closed']]);

    $this->assertDatabaseHas('support_tickets', [
        'id'     => $ticket->id,
        'status' => 'closed',
    ]);
});

// =============================================================================
// Évaluation (satisfaction)
// =============================================================================

it('user can rate resolved ticket 1-5 stars', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $ticket = SupportTicket::factory()->forOrganization($org->id)->create([
        'user_id' => $user->id,
        'status'  => 'resolved',
    ]);

    $response = $this->postJson("/api/v1/support/tickets/{$ticket->id}/rate", [
        'rating'  => 5,
        'comment' => 'Excellent support, problème résolu en 2 heures !',
    ]);

    $response->assertStatus(200)
             ->assertJson(['data' => ['satisfaction_rating' => 5]]);

    $this->assertDatabaseHas('support_tickets', [
        'id'                  => $ticket->id,
        'satisfaction_rating' => 5,
        'satisfaction_comment'=> 'Excellent support, problème résolu en 2 heures !',
    ]);
});

it('rating must be between 1 and 5', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $ticket = SupportTicket::factory()->forOrganization($org->id)->create([
        'user_id' => $user->id,
        'status'  => 'resolved',
    ]);

    $this->postJson("/api/v1/support/tickets/{$ticket->id}/rate", ['rating' => 0])
         ->assertStatus(422);

    $this->postJson("/api/v1/support/tickets/{$ticket->id}/rate", ['rating' => 6])
         ->assertStatus(422);
});

it('user cannot rate an open ticket', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $ticket = SupportTicket::factory()->open()->forOrganization($org->id)->create([
        'user_id' => $user->id,
    ]);

    $this->postJson("/api/v1/support/tickets/{$ticket->id}/rate", ['rating' => 4])
         ->assertStatus(422);
});

// =============================================================================
// SuperAdmin — accès global
// =============================================================================

it('superadmin can see all tickets', function () {
    // Créer 2 tickets dans des organisations distinctes
    $orgA  = $this->createOrganization(['slug' => 'sa-org-a-' . uniqid()], 'active');
    $userA = $this->createUserWithRole($orgA, 'agent');
    $tA    = SupportTicket::factory()->forOrganization($orgA->id)->create(['user_id' => $userA->id]);

    $orgB  = $this->createOrganization(['slug' => 'sa-org-b-' . uniqid()], 'active');
    $userB = $this->createUserWithRole($orgB, 'agent');
    $tB    = SupportTicket::factory()->forOrganization($orgB->id)->create(['user_id' => $userB->id]);

    // Connecter le superadmin
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    $response = $this->getJson('/api/v1/admin/support/tickets');
    $response->assertStatus(200);

    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($tA->id)
               ->toContain($tB->id);
});

it('superadmin can assign ticket to agent', function () {
    $orgA   = $this->createOrganization(['slug' => 'sa-assign-' . uniqid()], 'active');
    $userA  = $this->createUserWithRole($orgA, 'agent');
    $ticket = SupportTicket::factory()->open()->forOrganization($orgA->id)->create(['user_id' => $userA->id]);

    $agent      = $this->createUserWithRole($orgA, 'agent');
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    $response = $this->patchJson("/api/v1/admin/support/tickets/{$ticket->id}/assign", [
        'agent_id' => $agent->id,
    ]);

    $response->assertStatus(200)
             ->assertJson(['data' => ['assigned_to' => $agent->id]]);

    $this->assertDatabaseHas('support_tickets', [
        'id'          => $ticket->id,
        'assigned_to' => $agent->id,
        'status'      => 'in_progress',
    ]);
});

// =============================================================================
// Notes internes
// =============================================================================

it('internal notes are not visible to client', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $ticket = SupportTicket::factory()->open()->forOrganization($org->id)->create([
        'user_id' => $user->id,
    ]);

    // Le superadmin ajoute une note interne
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    TicketMessage::create([
        'ticket_id'   => $ticket->id,
        'user_id'     => $superAdmin->id,
        'content'     => 'Note interne confidentielle : client à risque de churn.',
        'is_internal' => true,
    ]);

    // Le client relit ses messages
    $this->actingAs($user);

    $response = $this->getJson("/api/v1/support/tickets/{$ticket->id}/messages");
    $response->assertStatus(200);

    $internalMessages = collect($response->json('data'))
        ->filter(fn ($m) => str_contains($m['content'] ?? '', 'confidentielle'));

    expect($internalMessages)->toBeEmpty();
});
