<?php

/**
 * BudgetApprovalTest — Tests Feature du cycle d'approbation budgétaire
 *
 * Couvre : soumission, approbation, blocage modification,
 *          révision avec snapshot, validation du motif de révision.
 */

use App\Models\Budget;
use App\Models\BudgetLine;
use App\Models\BudgetRevision;
use App\Models\FiscalYear;
use App\Models\Organization;
use App\Models\User;
use App\Services\BudgetService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();

    $this->org       = $this->createOrganization(['slug' => 'budget-approval-' . uniqid()], 'active');
    $this->preparer  = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->approver  = $this->createUserWithRole($this->org, 'admin_org');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    $this->fy = FiscalYear::factory()->create([
        'organization_id' => $this->org->id,
        'name'            => 'FY 2026',
        'start_date'      => '2026-01-01',
        'end_date'        => '2026-12-31',
        'status'          => 'open',
    ]);

    $this->service = app(BudgetService::class);
});

// =============================================================================
// SOUMISSION
// =============================================================================

it('creates budget and submits for approval', function () {
    test()->actingAs($this->preparer);

    $budget = $this->service->createBudget([
        'organization_id' => $this->org->id,
        'name'            => 'Budget Marketing Q3 2026',
        'fiscal_year_id'  => $this->fy->id,
        'type'            => 'operationnel',
        'created_by'      => $this->preparer->id,
        'lines'           => [
            [
                'account_number' => '623000',
                'account_name'   => 'Publicité & communication',
                'q1_amount'      => 0,
                'q2_amount'      => 0,
                'q3_amount'      => 2_500_000,
                'q4_amount'      => 1_000_000,
                'is_income'      => false,
                'category'       => 'fonctionnement',
            ],
        ],
    ]);

    expect($budget->status)->toBe('draft');

    $this->service->submitBudget($budget, $this->preparer);

    expect($budget->fresh()->status)->toBe('submitted');
});

// =============================================================================
// APPROBATION
// =============================================================================

it('approves budget by authorized user', function () {
    $budget = Budget::factory()->create([
        'organization_id' => $this->org->id,
        'fiscal_year_id'  => $this->fy->id,
        'status'          => 'submitted',
        'created_by'      => $this->preparer->id,
    ]);

    $line = BudgetLine::factory()->create([
        'budget_id'     => $budget->id,
        'annual_amount' => 500_000,
        'is_locked'     => false,
    ]);

    test()->actingAs($this->approver);
    $this->service->approveBudget($budget, $this->approver);

    expect($budget->fresh()->status)->toBe('approved')
        ->and($budget->fresh()->approved_by)->toBe($this->approver->id)
        ->and($line->fresh()->is_locked)->toBeTrue();
});

// =============================================================================
// BLOCAGE MODIFICATION DIRECTE
// =============================================================================

it('refuses modification of approved budget lines directly', function () {
    $budget = Budget::factory()->create([
        'organization_id' => $this->org->id,
        'fiscal_year_id'  => $this->fy->id,
        'status'          => 'approved',
    ]);

    $line = BudgetLine::factory()->create([
        'budget_id'     => $budget->id,
        'annual_amount' => 200_000,
        'is_locked'     => true,
    ]);

    test()->actingAs($this->preparer);

    $this->service->updateBudgetLine($line, ['annual_amount' => 999_999]);
})->throws(\LogicException::class);

// =============================================================================
// RÉVISION AVEC SNAPSHOT
// =============================================================================

it('creates budget revision with snapshot', function () {
    $budget = Budget::factory()->create([
        'organization_id' => $this->org->id,
        'fiscal_year_id'  => $this->fy->id,
        'status'          => 'approved',
    ]);

    $line1 = BudgetLine::factory()->create([
        'budget_id'     => $budget->id,
        'account_number' => '601000',
        'annual_amount' => 300_000,
        'is_locked'     => true,
    ]);
    $line2 = BudgetLine::factory()->create([
        'budget_id'     => $budget->id,
        'account_number' => '602000',
        'annual_amount' => 150_000,
        'is_locked'     => true,
    ]);

    test()->actingAs($this->preparer);

    $revision = $this->service->createRevision(
        budget:       $budget,
        requestedBy:  $this->preparer,
        reason:       'Hausse imprévue des prix matières premières',
        changes:      [
            ['line_id' => $line1->id, 'new_amount' => 400_000],
        ],
    );

    expect($revision)->toBeInstanceOf(BudgetRevision::class)
        ->and($revision->reason)->not->toBeEmpty();

    // Le snapshot des lignes d'avant doit être sauvegardé
    expect($revision->snapshot)->not->toBeNull();
    $snapshot = is_string($revision->snapshot)
        ? json_decode($revision->snapshot, true)
        : $revision->snapshot;

    $snapshotIds = collect($snapshot)->pluck('id')->toArray();
    expect($snapshotIds)->toContain($line1->id);
});

// =============================================================================
// MOTIF DE RÉVISION OBLIGATOIRE
// =============================================================================

it('requires revision reason', function () {
    $budget = Budget::factory()->create([
        'organization_id' => $this->org->id,
        'fiscal_year_id'  => $this->fy->id,
        'status'          => 'approved',
    ]);

    BudgetLine::factory()->create([
        'budget_id'     => $budget->id,
        'annual_amount' => 100_000,
        'is_locked'     => true,
    ]);

    test()->actingAs($this->preparer);

    $this->service->createRevision(
        budget:      $budget,
        requestedBy: $this->preparer,
        reason:      '',   // motif vide
        changes:     [],
    );
})->throws(\InvalidArgumentException::class);
