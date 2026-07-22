<?php

/**
 * QualityServiceTest — Tests unitaires du module Qualité ISO 9001
 *
 * Couvre : références NC, workflow statuts, récurrence, KPIs, NC auto depuis
 *          réclamation critique, vérification d'efficacité.
 */

use App\Models\CorrectiveAction;
use App\Models\CustomerComplaint;
use App\Models\Nonconformity;
use App\Models\QualityProcess;
use App\Models\User;
use App\Services\QualityService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->service = new QualityService();
    $this->org     = $this->createOrganization(['slug' => 'quality-' . uniqid()], 'active');
    $this->user    = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    $this->process = QualityProcess::factory()->create([
        'organization_id' => $this->org->id,
        'name'            => 'Production',
        'code'            => 'PROD',
    ]);
});

// =============================================================================
// RÉFÉRENCE NC
// =============================================================================

it('generates unique nc reference', function () {
    Carbon::setTestNow(Carbon::parse('2026-06-01'));

    $nc1 = $this->service->createNonconformity([
        'organization_id' => $this->org->id,
        'title'           => 'NC 1 — Produit défectueux',
        'description'     => 'Défaut de surface sur lot B47',
        'severity'        => 'mineure',
        'source'          => 'controle_production',
        'detected_by'     => $this->user->id,
    ]);

    $nc2 = $this->service->createNonconformity([
        'organization_id' => $this->org->id,
        'title'           => 'NC 2 — Délai non respecté',
        'description'     => 'Livraison client avec 5 jours de retard',
        'severity'        => 'majeure',
        'source'          => 'reclamation_client',
        'detected_by'     => $this->user->id,
    ]);

    expect($nc1->reference)->toMatch('/^NC-2026-\d{4}$/')
        ->and($nc2->reference)->toMatch('/^NC-2026-\d{4}$/')
        ->and($nc1->reference)->not->toBe($nc2->reference);
});

// =============================================================================
// WORKFLOW DE STATUTS
// =============================================================================

it('transitions nc status correctly', function () {
    $nc = Nonconformity::factory()->create([
        'organization_id' => $this->org->id,
        'status'          => 'ouvert',
        'process_id'      => $this->process->id,
    ]);

    // ouvert → analyse
    $this->service->transitionStatus($nc, 'analyse');
    expect($nc->fresh()->status)->toBe('analyse');

    // analyse → action
    $this->service->transitionStatus($nc, 'action');
    expect($nc->fresh()->status)->toBe('action');

    // action → vérification
    $this->service->transitionStatus($nc, 'vérification');
    expect($nc->fresh()->status)->toBe('vérification');

    // vérification → clos
    $this->service->transitionStatus($nc, 'clos');
    expect($nc->fresh()->status)->toBe('clos');
});

// =============================================================================
// DÉTECTION DE RÉCURRENCE
// =============================================================================

it('detects recurrent nonconformity', function () {
    Carbon::setTestNow(Carbon::parse('2026-07-15'));

    // Créer une NC antérieure sur le même processus/type il y a 3 mois
    Nonconformity::factory()->create([
        'organization_id' => $this->org->id,
        'process_id'      => $this->process->id,
        'source'          => 'controle_production',
        'severity'        => 'majeure',
        'status'          => 'clos',
        'created_at'      => Carbon::parse('2026-04-20'),
    ]);

    $isRecurrent = $this->service->isRecurrent(
        organizationId: $this->org->id,
        processId:      $this->process->id,
        source:         'controle_production',
        withinMonths:   6,
    );

    expect($isRecurrent)->toBeTrue();
});

it('does not flag as recurrent when outside 6 month window', function () {
    Carbon::setTestNow(Carbon::parse('2026-07-15'));

    // NC plus ancienne que 6 mois
    Nonconformity::factory()->create([
        'organization_id' => $this->org->id,
        'process_id'      => $this->process->id,
        'source'          => 'controle_production',
        'status'          => 'clos',
        'created_at'      => Carbon::parse('2026-01-01'),
    ]);

    $isRecurrent = $this->service->isRecurrent(
        organizationId: $this->org->id,
        processId:      $this->process->id,
        source:         'controle_production',
        withinMonths:   6,
    );

    expect($isRecurrent)->toBeFalse();
});

// =============================================================================
// KPIs QUALITÉ
// =============================================================================

it('calculates quality kpis correctly', function () {
    Carbon::setTestNow(Carbon::parse('2026-07-22'));

    // 4 NC dont 3 closes, délais : 5j, 10j, 15j, non close
    Nonconformity::factory()->create([
        'organization_id' => $this->org->id,
        'status'          => 'clos',
        'closed_at'       => Carbon::parse('2026-06-05'),
        'created_at'      => Carbon::parse('2026-05-31'),
    ]);
    Nonconformity::factory()->create([
        'organization_id' => $this->org->id,
        'status'          => 'clos',
        'closed_at'       => Carbon::parse('2026-06-10'),
        'created_at'      => Carbon::parse('2026-05-31'),
    ]);
    Nonconformity::factory()->create([
        'organization_id' => $this->org->id,
        'status'          => 'clos',
        'closed_at'       => Carbon::parse('2026-06-15'),
        'created_at'      => Carbon::parse('2026-05-31'),
    ]);
    Nonconformity::factory()->create([
        'organization_id' => $this->org->id,
        'status'          => 'ouvert',
        'created_at'      => Carbon::parse('2026-05-31'),
    ]);

    $kpis = $this->service->calculateKpis($this->org->id);

    expect($kpis)->toHaveKey('taux_cloture')
        ->and($kpis)->toHaveKey('delai_moyen_jours')
        ->and($kpis)->toHaveKey('total_nc');

    // 3 closes sur 4 total → 75%
    expect($kpis['taux_cloture'])->toBe(75.0);
    // Délai moyen : (5 + 10 + 15) / 3 = 10 jours
    expect($kpis['delai_moyen_jours'])->toBe(10.0);
    expect($kpis['total_nc'])->toBe(4);
});

// =============================================================================
// NC AUTOMATIQUE DEPUIS RÉCLAMATION CRITIQUE
// =============================================================================

it('auto creates nc from critical complaint', function () {
    $complaint = CustomerComplaint::factory()->create([
        'organization_id' => $this->org->id,
        'severity'        => 'critique',
        'status'          => 'ouvert',
        'description'     => 'Produit dangereux reçu — blessures client',
        'reported_by'     => $this->user->id,
    ]);

    $nc = $this->service->createNcFromComplaint($complaint);

    expect($nc)->toBeInstanceOf(Nonconformity::class)
        ->and($nc->organization_id)->toBe($this->org->id)
        ->and($nc->source)->toBe('reclamation_client')
        ->and($nc->severity)->toBe('critique')
        ->and($nc->reference)->toMatch('/^NC-\d{4}-\d{4}$/');
});

// =============================================================================
// VÉRIFICATION D'EFFICACITÉ
// =============================================================================

it('verifies nc effectiveness with rating', function () {
    $nc = Nonconformity::factory()->create([
        'organization_id' => $this->org->id,
        'status'          => 'vérification',
    ]);

    $action = CorrectiveAction::factory()->create([
        'nonconformity_id' => $nc->id,
        'status'           => 'terminé',
    ]);

    // Rating >= 3 → NC close
    $this->service->verifyEffectiveness($nc, $action, rating: 4);
    expect($nc->fresh()->status)->toBe('clos');
});

it('reopens nc when effectiveness rating is below 3', function () {
    $nc = Nonconformity::factory()->create([
        'organization_id' => $this->org->id,
        'status'          => 'vérification',
    ]);

    $action = CorrectiveAction::factory()->create([
        'nonconformity_id' => $nc->id,
        'status'           => 'terminé',
    ]);

    // Rating < 3 → NC réouverte
    $this->service->verifyEffectiveness($nc, $action, rating: 2);
    expect($nc->fresh()->status)->toBe('ouvert');
});
