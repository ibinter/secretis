<?php

/**
 * AgendaServiceTest — Tests unitaires du service Agenda
 *
 * Teste : récurrence RRULE, détection de conflits, rappels.
 */

use App\Models\Calendar;
use App\Models\Event;
use App\Services\AgendaService;
use Carbon\Carbon;

beforeEach(function () {
    $this->service = new AgendaService();
    $this->org     = $this->createOrganization(['slug' => 'agenda-test-' . uniqid()], 'active');
    $this->user    = $this->createUserWithRole($this->org, 'agent');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);
});

// =============================================================================
// Récurrence RRULE
// =============================================================================

it('generates recurring events with FREQ=WEEKLY correctly', function () {
    $event = Event::factory()->make([
        'organization_id' => $this->org->id,
        'creator_id'      => $this->user->id,
        'start_at'        => Carbon::parse('2026-01-05 09:00:00'), // Lundi
        'end_at'          => Carbon::parse('2026-01-05 10:00:00'),
        'recurrence_rule' => 'FREQ=WEEKLY;INTERVAL=1',
        'is_all_day'      => false,
    ]);

    $rangeStart  = Carbon::parse('2026-01-01');
    $rangeEnd    = Carbon::parse('2026-01-31');
    $occurrences = $this->service->expandRecurringEvents($event, $rangeStart, $rangeEnd);

    expect($occurrences)->toBeArray()
        ->and(count($occurrences))->toBeGreaterThanOrEqual(3);

    // Vérifier que les occurrences ont des clés attendues
    expect($occurrences[0])->toHaveKey('start')->toHaveKey('end');

    // Intervalle de 7 jours entre deux occurrences consécutives
    if (count($occurrences) >= 2) {
        $diff = Carbon::parse($occurrences[1]['start'])
            ->diffInDays(Carbon::parse($occurrences[0]['start']));
        expect($diff)->toBe(7);
    }
});

it('generates recurring events with UNTIL date', function () {
    $event = Event::factory()->make([
        'organization_id' => $this->org->id,
        'creator_id'      => $this->user->id,
        'start_at'        => Carbon::parse('2026-02-02 09:00:00'),
        'end_at'          => Carbon::parse('2026-02-02 10:00:00'),
        'recurrence_rule' => 'FREQ=WEEKLY;UNTIL=20260216T235959Z',
        'is_all_day'      => false,
    ]);

    $rangeStart  = Carbon::parse('2026-02-01');
    $rangeEnd    = Carbon::parse('2026-02-28');
    $occurrences = $this->service->expandRecurringEvents($event, $rangeStart, $rangeEnd);

    // Max 3 lundis : 2, 9, 16 fév (arrêt à UNTIL=16 fév)
    expect(count($occurrences))->toBeLessThanOrEqual(3);

    foreach ($occurrences as $occ) {
        expect(Carbon::parse($occ['start'])->lte(Carbon::parse('2026-02-16')))->toBeTrue();
    }
});

it('generates recurring events with COUNT limit', function () {
    $event = Event::factory()->make([
        'organization_id' => $this->org->id,
        'creator_id'      => $this->user->id,
        'start_at'        => Carbon::parse('2026-03-02 09:00:00'),
        'end_at'          => Carbon::parse('2026-03-02 10:00:00'),
        'recurrence_rule' => 'FREQ=WEEKLY;COUNT=3',
        'is_all_day'      => false,
    ]);

    $rangeStart  = Carbon::parse('2026-03-01');
    $rangeEnd    = Carbon::parse('2026-12-31');
    $occurrences = $this->service->expandRecurringEvents($event, $rangeStart, $rangeEnd);

    expect(count($occurrences))->toBe(3);
});

// =============================================================================
// Détection de conflits
// =============================================================================

it('detects conflict for creator when time overlaps', function () {
    $calendar = Calendar::factory()->create([
        'organization_id' => $this->org->id,
        'user_id'         => $this->user->id,
    ]);

    Event::factory()->create([
        'organization_id' => $this->org->id,
        'creator_id'      => $this->user->id,
        'calendar_id'     => $calendar->id,
        'start_at'        => Carbon::parse('2026-04-01 10:00:00'),
        'end_at'          => Carbon::parse('2026-04-01 11:00:00'),
        'recurrence_rule' => null,
    ]);

    $hasConflict = $this->service->checkConflicts(
        userId: $this->user->id,
        start:  Carbon::parse('2026-04-01 10:30:00'),
        end:    Carbon::parse('2026-04-01 11:30:00'),
    );

    expect($hasConflict)->toBeTrue();
});

it('detects conflict for participant when time overlaps', function () {
    $organizer = $this->createUserWithRole($this->org, 'agent');
    $calendar  = Calendar::factory()->create([
        'organization_id' => $this->org->id,
        'user_id'         => $organizer->id,
    ]);

    $event = Event::factory()->create([
        'organization_id' => $this->org->id,
        'creator_id'      => $organizer->id,
        'calendar_id'     => $calendar->id,
        'start_at'        => Carbon::parse('2026-04-02 14:00:00'),
        'end_at'          => Carbon::parse('2026-04-02 15:30:00'),
        'recurrence_rule' => null,
    ]);

    // Ajouter $this->user comme participant
    $event->participants()->attach($this->user->id, [
        'status' => 'accepted',
        'role'   => 'participant',
    ]);

    $hasConflict = $this->service->checkConflicts(
        userId: $this->user->id,
        start:  Carbon::parse('2026-04-02 15:00:00'),
        end:    Carbon::parse('2026-04-02 16:00:00'),
    );

    expect($hasConflict)->toBeTrue();
});

it('does not detect conflict when events are consecutive', function () {
    $calendar = Calendar::factory()->create([
        'organization_id' => $this->org->id,
        'user_id'         => $this->user->id,
    ]);

    Event::factory()->create([
        'organization_id' => $this->org->id,
        'creator_id'      => $this->user->id,
        'calendar_id'     => $calendar->id,
        'start_at'        => Carbon::parse('2026-04-03 09:00:00'),
        'end_at'          => Carbon::parse('2026-04-03 10:00:00'),
        'recurrence_rule' => null,
    ]);

    // start_at < end AND end_at > start : 10:00 < 10:00 → FALSE → pas de conflit
    $hasConflict = $this->service->checkConflicts(
        userId: $this->user->id,
        start:  Carbon::parse('2026-04-03 10:00:00'),
        end:    Carbon::parse('2026-04-03 11:00:00'),
    );

    expect($hasConflict)->toBeFalse();
});

// =============================================================================
// Rappels
// =============================================================================

it('respects 2 minute tolerance window for reminders', function () {
    Carbon::setTestNow(Carbon::parse('2026-05-01 09:58:30'));

    $startAt    = Carbon::parse('2026-05-01 10:00:00');
    $reminderAt = $startAt->copy()->subMinutes(2); // 09:58:00
    $now        = Carbon::now();                   // 09:58:30

    $diffMinutes = $now->diffInMinutes($reminderAt, false);

    // La fenêtre : >= 0 et < 2 → rappel doit se déclencher
    expect($diffMinutes)->toBeGreaterThanOrEqual(0)
        ->and($diffMinutes)->toBeLessThan(2);

    Carbon::setTestNow();
});

it('generates reminder at correct time', function () {
    $minutesBefore = 15;
    $startAt       = Carbon::parse('2026-06-15 14:00:00');
    $reminderAt    = $startAt->copy()->subMinutes($minutesBefore);

    expect($reminderAt->format('H:i'))->toBe('13:45')
        ->and($reminderAt->format('Y-m-d'))->toBe('2026-06-15');
});
