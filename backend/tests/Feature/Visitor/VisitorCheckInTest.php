<?php

/**
 * VisitorCheckInTest — Tests Feature du module Réception Visiteurs (Vague 11)
 *
 * Couvre : check-in, notification hôte, blocage blacklist,
 *          validation code d'invitation, check-out, double check-out.
 */

use App\Jobs\NotifyHostVisitorArrived;
use App\Models\Organization;
use App\Models\User;
use App\Models\Visitor;
use App\Models\VisitorInvitation;
use App\Models\VisitorLog;
use App\Services\VisitorService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

beforeEach(function () {
    Queue::fake();

    $this->org  = $this->createOrganization(['slug' => 'visitor-' . uniqid()], 'active');
    $this->host = $this->createUserWithRole($this->org, 'agent');
    $this->receptionist = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);
    test()->actingAs($this->receptionist);

    $this->service = app(VisitorService::class);
});

// =============================================================================
// CHECK-IN
// =============================================================================

it('checks in visitor successfully', function () {
    $visitor = Visitor::factory()->create([
        'organization_id' => $this->org->id,
        'full_name'       => 'Jean-Baptiste Kouamé',
        'email'           => 'jb.kouame@extern.ci',
        'is_blacklisted'  => false,
    ]);

    $log = $this->service->checkIn(
        visitor:  $visitor,
        hostId:   $this->host->id,
        orgId:    $this->org->id,
        purpose:  'Réunion commerciale',
        checkInAt: Carbon::parse('2026-07-22 09:30:00'),
    );

    expect($log)->toBeInstanceOf(VisitorLog::class)
        ->and($log->visitor_id)->toBe($visitor->id)
        ->and($log->host_user_id)->toBe($this->host->id)
        ->and($log->check_in_at)->not->toBeNull()
        ->and($log->check_out_at)->toBeNull();
});

// =============================================================================
// NOTIFICATION HÔTE
// =============================================================================

it('notifies host on visitor arrival', function () {
    $visitor = Visitor::factory()->create([
        'organization_id' => $this->org->id,
        'is_blacklisted'  => false,
    ]);

    $this->service->checkIn(
        visitor:   $visitor,
        hostId:    $this->host->id,
        orgId:     $this->org->id,
        purpose:   'Livraison matériel',
        checkInAt: now(),
    );

    Queue::assertPushed(NotifyHostVisitorArrived::class, function ($job) use ($visitor) {
        return $job->visitor->id === $visitor->id
            && $job->hostId === $this->host->id;
    });
});

// =============================================================================
// BLOCAGE BLACKLIST
// =============================================================================

it('blocks blacklisted visitor check in', function () {
    $blacklisted = Visitor::factory()->create([
        'organization_id' => $this->org->id,
        'full_name'       => 'Individu Non Grata',
        'is_blacklisted'  => true,
        'blacklist_reason' => 'Comportement agressif lors de visite précédente',
    ]);

    $this->service->checkIn(
        visitor:   $blacklisted,
        hostId:    $this->host->id,
        orgId:     $this->org->id,
        purpose:   'Réclamation',
        checkInAt: now(),
    );
})->throws(\App\Exceptions\VisitorBlacklistedException::class);

// =============================================================================
// CODE D'INVITATION
// =============================================================================

it('validates invitation code and marks as used', function () {
    $invitationCode = Str::uuid()->toString();

    $invitation = VisitorInvitation::factory()->create([
        'organization_id' => $this->org->id,
        'host_user_id'    => $this->host->id,
        'code'            => $invitationCode,
        'is_used'         => false,
        'valid_from'      => Carbon::parse('2026-07-22 08:00:00'),
        'valid_until'     => Carbon::parse('2026-07-22 18:00:00'),
        'visitor_email'   => 'invite@extern.ci',
    ]);

    Carbon::setTestNow(Carbon::parse('2026-07-22 10:00:00'));

    $result = $this->service->validateInvitationCode(
        code:  $invitationCode,
        orgId: $this->org->id,
    );

    expect($result)->toHaveKey('valid')
        ->and($result['valid'])->toBeTrue()
        ->and($invitation->fresh()->is_used)->toBeTrue();
});

it('rejects expired invitation code', function () {
    Carbon::setTestNow(Carbon::parse('2026-07-22 20:00:00'));

    $invitation = VisitorInvitation::factory()->create([
        'organization_id' => $this->org->id,
        'host_user_id'    => $this->host->id,
        'code'            => Str::uuid()->toString(),
        'is_used'         => false,
        'valid_from'      => Carbon::parse('2026-07-22 08:00:00'),
        'valid_until'     => Carbon::parse('2026-07-22 18:00:00'),
    ]);

    $result = $this->service->validateInvitationCode(
        code:  $invitation->code,
        orgId: $this->org->id,
    );

    expect($result['valid'])->toBeFalse();
});

// =============================================================================
// CHECK-OUT
// =============================================================================

it('checks out visitor and records time', function () {
    $visitor = Visitor::factory()->create([
        'organization_id' => $this->org->id,
        'is_blacklisted'  => false,
    ]);

    $log = VisitorLog::factory()->create([
        'organization_id' => $this->org->id,
        'visitor_id'      => $visitor->id,
        'host_user_id'    => $this->host->id,
        'check_in_at'     => Carbon::parse('2026-07-22 09:30:00'),
        'check_out_at'    => null,
    ]);

    Carbon::setTestNow(Carbon::parse('2026-07-22 11:45:00'));

    $this->service->checkOut($log);

    $updated = $log->fresh();
    expect($updated->check_out_at)->not->toBeNull()
        ->and($updated->check_out_at->format('H:i'))->toBe('11:45');
});

// =============================================================================
// DOUBLE CHECK-OUT
// =============================================================================

it('prevents checkout of already checked out visitor', function () {
    $log = VisitorLog::factory()->create([
        'organization_id' => $this->org->id,
        'visitor_id'      => Visitor::factory()->create(['organization_id' => $this->org->id])->id,
        'host_user_id'    => $this->host->id,
        'check_in_at'     => Carbon::parse('2026-07-22 09:00:00'),
        'check_out_at'    => Carbon::parse('2026-07-22 10:00:00'), // déjà sorti
    ]);

    $this->service->checkOut($log);
})->throws(\LogicException::class);
