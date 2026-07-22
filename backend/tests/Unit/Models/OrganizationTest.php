<?php

/**
 * OrganizationTest — Tests unitaires du modèle Organization
 *
 * Teste : statut licence, période de grâce, plan courant.
 */

use App\Models\License;
use App\Models\Organization;
use App\Models\Plan;
use Carbon\Carbon;

beforeEach(function () {
    $this->plan = $this->getOrCreateDefaultPlan();
});

it('returns active status when license valid', function () {
    $org = $this->createOrganization(['slug' => 'org-active-' . uniqid()], 'active');

    License::factory()->create([
        'organization_id' => $org->id,
        'plan_id'         => $this->plan->id,
        'payment_id'      => random_int(10000, 99999),
        'status'          => 'active',
        'starts_at'       => Carbon::now()->subDays(5),
        'expires_at'      => Carbon::now()->addDays(25)->endOfDay(),
        'grace_ends_at'   => Carbon::now()->addDays(32)->endOfDay(),
    ]);

    $org->refresh();
    $status = $org->getLicenseStatus();

    expect($status)->toBe('active');
    expect($org->hasActiveLicense())->toBeTrue();
});

it('returns grace period status when expired within 7 days', function () {
    $org = $this->createOrganization(['slug' => 'org-grace-' . uniqid()], 'active');

    $expiresAt = Carbon::now()->subDays(3); // Expirée il y a 3 jours

    License::factory()->create([
        'organization_id' => $org->id,
        'plan_id'         => $this->plan->id,
        'payment_id'      => random_int(10000, 99999),
        'status'          => 'active',
        'starts_at'       => $expiresAt->copy()->subMonth(),
        'expires_at'      => $expiresAt,
        'grace_ends_at'   => $expiresAt->copy()->addDays(7), // Grâce encore valide
    ]);

    $org->refresh();
    $status = $org->getLicenseStatus();

    expect($status)->toBe('grace');
    expect($org->hasActiveLicense())->toBeTrue(); // La grâce compte comme active
});

it('returns expired status after grace period', function () {
    $org = $this->createOrganization(['slug' => 'org-expired-' . uniqid()], 'active');

    $expiresAt   = Carbon::now()->subDays(15);
    $graceEndsAt = $expiresAt->copy()->addDays(7); // Grace terminée il y a 8 jours

    License::factory()->create([
        'organization_id' => $org->id,
        'plan_id'         => $this->plan->id,
        'payment_id'      => random_int(10000, 99999),
        'status'          => 'active',
        'starts_at'       => $expiresAt->copy()->subMonth(),
        'expires_at'      => $expiresAt,
        'grace_ends_at'   => $graceEndsAt,
    ]);

    $org->refresh();
    $status = $org->getLicenseStatus();

    expect($status)->toBe('expired');
    expect($org->hasActiveLicense())->toBeFalse();
});

it('returns correct current plan', function () {
    // Org en trial
    $trialOrg = $this->createOrganization(['slug' => 'org-trial-' . uniqid()], 'trial');
    expect($trialOrg->getCurrentPlan())->toBe('trial');

    // Org avec licence active
    $activeOrg = $this->createOrganization(['slug' => 'org-plan-' . uniqid()], 'active');
    $this->createActiveLicense($activeOrg);
    $activeOrg->refresh();

    $plan = $activeOrg->getCurrentPlan();
    expect($plan)->toBe('starter'); // Le plan par défaut dans getOrCreateDefaultPlan()
});
