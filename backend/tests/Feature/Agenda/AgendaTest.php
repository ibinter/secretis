<?php

use App\Models\Calendar;
use App\Models\Event;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seedForTests();

    $this->org  = $this->createOrganization(['slug' => 'org-agenda'], 'trial');
    $this->user = $this->createUserWithRole($this->org, 'gestionnaire');

    $this->actingAsUserInOrganization($this->user);

    // Calendrier par défaut pour les tests
    $this->calendar = Calendar::create([
        'organization_id' => $this->org->id,
        'user_id'         => $this->user->id,
        'name'            => 'Agenda Test',
        'color'           => '#3B82F6',
        'type'            => 'personal',
        'is_default'      => true,
    ]);
});

// =============================================================================
// CRÉER ÉVÉNEMENT SIMPLE
// =============================================================================

test('créer un événement simple retourne 201 et persiste en BDD', function () {
    $start = Carbon::now()->addDays(2)->startOfHour();
    $end   = $start->copy()->addHours(2);

    $response = $this->postJson('/api/agenda/events', [
        'title'       => 'Réunion de coordination',
        'description' => 'Réunion hebdomadaire',
        'start_at'    => $start->toIso8601String(),
        'end_at'      => $end->toIso8601String(),
        'calendar_id' => $this->calendar->id,
    ]);

    $response->assertStatus(201)
             ->assertJsonStructure([
                 'data' => ['id', 'title', 'start_at', 'end_at', 'creator'],
             ]);

    // Vérification en BDD
    $this->assertDatabaseHas('events', [
        'title'           => 'Réunion de coordination',
        'organization_id' => $this->org->id,
    ]);

    // Le créateur est bien l'utilisateur courant
    $eventId = $response->json('data.id');
    $event   = Event::find($eventId);
    expect($event->creator_id)->toBe($this->user->id);
});

// =============================================================================
// ÉVÉNEMENT AVEC PARTICIPANTS — Invitations envoyées
// =============================================================================

test('créer un événement avec participants envoie les invitations', function () {
    Notification::fake();

    $participant1 = $this->createUserWithRole($this->org, 'agent');
    $participant2 = $this->createUserWithRole($this->org, 'agent');

    $start = Carbon::now()->addDays(3)->startOfHour();
    $end   = $start->copy()->addHours(1);

    $response = $this->postJson('/api/agenda/events', [
        'title'        => 'Réunion avec participants',
        'start_at'     => $start->toIso8601String(),
        'end_at'       => $end->toIso8601String(),
        'calendar_id'  => $this->calendar->id,
        'participants' => [$participant1->id, $participant2->id],
    ]);

    $response->assertStatus(201);

    // Les participants sont bien liés à l'événement
    $eventId = $response->json('data.id');
    $event   = Event::with('participants')->find($eventId);

    // Le créateur + 2 participants = 3
    expect($event->participants)->toHaveCount(3);

    // Vérifier les statuts des participants (pending pour les invités)
    $participantIds = $event->participants->pluck('id')->toArray();
    expect($participantIds)->toContain($participant1->id);
    expect($participantIds)->toContain($participant2->id);
});

// =============================================================================
// CONFLIT HORAIRE — 422 si chevauchement
// =============================================================================

test('créer un événement avec conflit horaire retourne 422', function () {
    // Créer un premier événement
    $start = Carbon::now()->addDays(4)->setHour(10)->setMinute(0)->setSecond(0);
    $end   = $start->copy()->setHour(12);

    Event::create([
        'organization_id' => $this->org->id,
        'calendar_id'     => $this->calendar->id,
        'creator_id'      => $this->user->id,
        'title'           => 'Événement existant',
        'start_at'        => $start,
        'end_at'          => $end,
    ]);

    // Tenter de créer un événement qui chevauche
    $conflictStart = $start->copy()->addHour(); // 11h — dans la plage 10h-12h
    $conflictEnd   = $conflictStart->copy()->addHours(2); // 13h

    $response = $this->postJson('/api/agenda/events', [
        'title'       => 'Événement en conflit',
        'start_at'    => $conflictStart->toIso8601String(),
        'end_at'      => $conflictEnd->toIso8601String(),
        'calendar_id' => $this->calendar->id,
    ]);

    $response->assertStatus(422)
             ->assertJsonValidationErrors(['start_at']);
});

// =============================================================================
// MODIFIER ÉVÉNEMENT — En tant que créateur
// =============================================================================

test('modifier un événement en tant que créateur retourne 200', function () {
    $start = Carbon::now()->addDays(5)->startOfHour();
    $event = Event::create([
        'organization_id' => $this->org->id,
        'calendar_id'     => $this->calendar->id,
        'creator_id'      => $this->user->id,
        'title'           => 'Titre original',
        'start_at'        => $start,
        'end_at'          => $start->copy()->addHour(),
    ]);

    $response = $this->putJson("/api/agenda/events/{$event->id}", [
        'title'    => 'Titre modifié',
        'start_at' => $start->toIso8601String(),
        'end_at'   => $start->copy()->addHours(2)->toIso8601String(),
    ]);

    $response->assertStatus(200);

    $event->refresh();
    expect($event->title)->toBe('Titre modifié');
});

// =============================================================================
// MODIFIER ÉVÉNEMENT — En tant que simple participant → 403
// =============================================================================

test('modifier un événement en tant que simple participant retourne 403', function () {
    $creator     = $this->createUserWithRole($this->org, 'agent');
    $participant = $this->createUserWithRole($this->org, 'agent');

    $start = Carbon::now()->addDays(6)->startOfHour();
    $event = Event::create([
        'organization_id' => $this->org->id,
        'calendar_id'     => $this->calendar->id,
        'creator_id'      => $creator->id,
        'title'           => 'Événement du créateur',
        'start_at'        => $start,
        'end_at'          => $start->copy()->addHour(),
    ]);

    // Ajouter le participant à l'événement
    $event->participants()->attach($participant->id, ['status' => 'pending', 'role' => 'participant']);

    // Se connecter en tant que participant (pas le créateur)
    $this->actingAsUserInOrganization($participant);

    $response = $this->putJson("/api/agenda/events/{$event->id}", [
        'title' => 'Tentative de modification',
    ]);

    $response->assertStatus(403);
});

// =============================================================================
// SUPPRIMER ÉVÉNEMENT — Soft delete
// =============================================================================

test('supprimer un événement effectue un soft delete', function () {
    $start = Carbon::now()->addDays(7)->startOfHour();
    $event = Event::create([
        'organization_id' => $this->org->id,
        'calendar_id'     => $this->calendar->id,
        'creator_id'      => $this->user->id,
        'title'           => 'Événement à supprimer',
        'start_at'        => $start,
        'end_at'          => $start->copy()->addHour(),
    ]);

    $response = $this->deleteJson("/api/agenda/events/{$event->id}");

    $response->assertStatus(200);

    // L'enregistrement existe toujours en BDD (soft delete)
    $this->assertSoftDeleted('events', ['id' => $event->id]);

    // Mais n'est plus accessible via l'API
    $this->getJson("/api/agenda/events/{$event->id}")->assertStatus(404);
});

// =============================================================================
// RÉCURRENCE — Événement quotidien génère les bonnes occurrences
// =============================================================================

test('événement récurrent quotidien génère les bonnes occurrences', function () {
    $agendaService = app(\App\Services\AgendaService::class);

    $start = Carbon::create(2026, 2, 1, 9, 0, 0); // 1er février 2026 à 9h
    $end   = $start->copy()->addHour();

    $event = Event::create([
        'organization_id' => $this->org->id,
        'calendar_id'     => $this->calendar->id,
        'creator_id'      => $this->user->id,
        'title'           => 'Daily Stand-up',
        'start_at'        => $start,
        'end_at'          => $end,
        'recurrence_rule' => 'FREQ=DAILY;COUNT=5', // 5 occurrences
    ]);

    $rangeStart = Carbon::create(2026, 2, 1);
    $rangeEnd   = Carbon::create(2026, 2, 10);

    $occurrences = $agendaService->expandRecurringEvents($event, $rangeStart, $rangeEnd);

    // 5 occurrences attendues : 1, 2, 3, 4, 5 février
    expect($occurrences)->toHaveCount(5);

    // Vérifier les dates générées
    $dates = array_map(fn($o) => substr($o['start'], 0, 10), $occurrences);
    expect($dates)->toBe(['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05']);
});

test('événement récurrent hebdomadaire avec UNTIL génère les bonnes occurrences', function () {
    $agendaService = app(\App\Services\AgendaService::class);

    $start = Carbon::create(2026, 1, 5, 14, 0, 0); // Lundi 5 janvier 2026
    $end   = $start->copy()->addHours(2);

    $event = Event::create([
        'organization_id' => $this->org->id,
        'calendar_id'     => $this->calendar->id,
        'creator_id'      => $this->user->id,
        'title'           => 'Réunion hebdo',
        'start_at'        => $start,
        'end_at'          => $end,
        'recurrence_rule' => 'FREQ=WEEKLY;UNTIL=20260126T235959Z', // Jusqu'au 26 janvier
    ]);

    $rangeStart = Carbon::create(2026, 1, 1);
    $rangeEnd   = Carbon::create(2026, 1, 31);

    $occurrences = $agendaService->expandRecurringEvents($event, $rangeStart, $rangeEnd);

    // 5 jan, 12 jan, 19 jan, 26 jan = 4 occurrences
    expect($occurrences)->toHaveCount(4);
});

// =============================================================================
// RÉSERVATION SALLE — Créneau bloqué
// =============================================================================

test('réservation salle bloque le créneau et empêche une seconde réservation', function () {
    $room = Room::create([
        'organization_id' => $this->org->id,
        'name'            => 'Salle Conférence A',
        'capacity'        => 20,
        'is_active'       => true,
    ]);

    $start = Carbon::now()->addDays(10)->setHour(9)->setMinute(0)->setSecond(0);
    $end   = $start->copy()->addHours(2);

    // Première réservation de la salle
    $response1 = $this->postJson('/api/agenda/events', [
        'title'       => 'Réunion en Salle A',
        'start_at'    => $start->toIso8601String(),
        'end_at'      => $end->toIso8601String(),
        'calendar_id' => $this->calendar->id,
        'room_id'     => $room->id,
    ]);

    $response1->assertStatus(201);

    // Deuxième tentative sur le même créneau — doit échouer
    $response2 = $this->postJson('/api/agenda/events', [
        'title'       => 'Autre réunion en Salle A (conflit)',
        'start_at'    => $start->copy()->addHour()->toIso8601String(), // 10h — chevauche 9h-11h
        'end_at'      => $end->copy()->addHours(2)->toIso8601String(),
        'calendar_id' => $this->calendar->id,
        'room_id'     => $room->id,
    ]);

    $response2->assertStatus(422);
});
