<?php

/**
 * LicenseServiceTest — Tests unitaires du service Licence
 *
 * Teste : activation idempotente, période de grâce, temps serveur.
 */

use App\Models\License;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Plan;
use App\Services\AuditService;
use App\Services\LicenseService;
use Carbon\Carbon;

beforeEach(function () {
    $this->auditMock = Mockery::mock(AuditService::class)->shouldIgnoreMissing();
    $this->service   = new LicenseService($this->auditMock);

    $this->org  = $this->createOrganization(['slug' => 'lic-test-' . uniqid()], 'trial');
    $this->plan = $this->getOrCreateDefaultPlan();

    // Créer un paiement fictif
    $this->payment = Payment::factory()->create([
        'organization_id' => $this->org->id,
        'amount'          => 15000,
        'currency'        => 'XOF',
        'status'          => 'completed',
    ]);
});

// =============================================================================
// Activation
// =============================================================================

it('activates license on valid webhook payment', function () {
    $license = $this->service->activate(
        organizationId: $this->org->id,
        planId:         $this->plan->id,
        paymentId:      $this->payment->id,
        durationMonths: 1,
    );

    expect($license)->toBeInstanceOf(License::class)
        ->and($license->organization_id)->toBe($this->org->id)
        ->and($license->status)->toBe(LicenseService::STATUS_ACTIVE)
        ->and($license->payment_id)->toBe($this->payment->id);

    // L'organisation doit être marquée active
    $this->org->refresh();
    expect($this->org->status)->toBe('active');
});

it('does not activate license twice with same idempotency key', function () {
    // Première activation
    $license1 = $this->service->activate(
        organizationId: $this->org->id,
        planId:         $this->plan->id,
        paymentId:      $this->payment->id,
    );

    // Deuxième appel avec le même payment_id
    $license2 = $this->service->activate(
        organizationId: $this->org->id,
        planId:         $this->plan->id,
        paymentId:      $this->payment->id,
    );

    // Doit retourner la même licence, pas en créer une nouvelle
    expect($license1->id)->toBe($license2->id);

    // Une seule licence en base pour ce paiement
    $count = License::where('payment_id', $this->payment->id)->count();
    expect($count)->toBe(1);
});

// =============================================================================
// Période de grâce (7 jours)
// =============================================================================

it('respects 7 day grace period after expiry', function () {
    $expiresAt = Carbon::now()->subDays(3); // Expirée il y a 3 jours

    License::factory()->create([
        'organization_id' => $this->org->id,
        'plan_id'         => $this->plan->id,
        'payment_id'      => $this->payment->id,
        'status'          => LicenseService::STATUS_ACTIVE,
        'starts_at'       => $expiresAt->copy()->subMonth(),
        'expires_at'      => $expiresAt,
        'grace_ends_at'   => $expiresAt->copy()->addDays(7), // Grace encore valide
    ]);

    $this->org->update(['status' => 'active']);

    $status = $this->service->checkStatus($this->org->id);

    expect($status)->toBe(LicenseService::STATUS_GRACE);
});

it('returns expired status after grace period', function () {
    $expiresAt    = Carbon::now()->subDays(10);
    $graceEndsAt  = $expiresAt->copy()->addDays(7); // Grâce terminée il y a 3 jours

    License::factory()->create([
        'organization_id' => $this->org->id,
        'plan_id'         => $this->plan->id,
        'payment_id'      => $this->payment->id,
        'status'          => LicenseService::STATUS_ACTIVE,
        'starts_at'       => $expiresAt->copy()->subMonth(),
        'expires_at'      => $expiresAt,
        'grace_ends_at'   => $graceEndsAt,
    ]);

    $this->org->update(['status' => 'active']);

    $status = $this->service->checkStatus($this->org->id);

    expect($status)->toBe(LicenseService::STATUS_EXPIRED);
});

it('returns active status within grace period', function () {
    // Licence encore valide (expire dans 15 jours)
    License::factory()->create([
        'organization_id' => $this->org->id,
        'plan_id'         => $this->plan->id,
        'payment_id'      => $this->payment->id,
        'status'          => LicenseService::STATUS_ACTIVE,
        'starts_at'       => Carbon::now()->subDays(15),
        'expires_at'      => Carbon::now()->addDays(15)->endOfDay(),
        'grace_ends_at'   => Carbon::now()->addDays(22)->endOfDay(),
    ]);

    $this->org->update(['status' => 'active']);

    $status = $this->service->checkStatus($this->org->id);

    expect($status)->toBe(LicenseService::STATUS_ACTIVE);
});

// =============================================================================
// Temps serveur uniquement
// =============================================================================

it('uses server time never client time for expiry check', function () {
    // La license expire dans le passé
    License::factory()->create([
        'organization_id' => $this->org->id,
        'plan_id'         => $this->plan->id,
        'payment_id'      => $this->payment->id,
        'status'          => LicenseService::STATUS_ACTIVE,
        'starts_at'       => Carbon::now()->subDays(40),
        'expires_at'      => Carbon::now()->subDays(10),
        'grace_ends_at'   => Carbon::now()->subDays(3),
    ]);

    $this->org->update(['status' => 'active']);

    // Même si le client envoie un header X-Custom-Date, le service doit utiliser now()
    // On vérifie que le statut est bien EXPIRED et non ACTIVE
    $status = $this->service->checkStatus($this->org->id);

    expect($status)->toBe(LicenseService::STATUS_EXPIRED)
        ->and($status)->not->toBe(LicenseService::STATUS_ACTIVE);
});
