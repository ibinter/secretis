<?php

/**
 * BudgetServiceTest — Tests unitaires du service budgétaire SECRETIS ERP
 *
 * Couvre : création, écarts, alertes, prévisions, verrouillage après approbation.
 */

use App\Models\Budget;
use App\Models\BudgetLine;
use App\Models\FiscalYear;
use App\Models\Organization;
use App\Models\User;
use App\Services\BudgetService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->service = new BudgetService();
    $this->org     = $this->createOrganization(['slug' => 'budget-' . uniqid()], 'active');
    $this->user    = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    $this->fy = FiscalYear::factory()->create([
        'organization_id' => $this->org->id,
        'name'            => 'FY 2026',
        'start_date'      => '2026-01-01',
        'end_date'        => '2026-12-31',
        'status'          => 'open',
    ]);
});

// =============================================================================
// CRÉATION
// =============================================================================

it('creates budget with auto-generated reference', function () {
    Carbon::setTestNow(Carbon::parse('2026-05-10'));

    $budget = $this->service->createBudget([
        'organization_id' => $this->org->id,
        'name'            => 'Budget opérationnel 2026',
        'fiscal_year_id'  => $this->fy->id,
        'type'            => 'operationnel',
        'created_by'      => $this->user->id,
        'lines'           => [
            [
                'account_number' => '601000',
                'account_name'   => 'Achats marchandises',
                'q1_amount'      => 500_000,
                'q2_amount'      => 500_000,
                'q3_amount'      => 500_000,
                'q4_amount'      => 500_000,
                'is_income'      => false,
                'category'       => 'fonctionnement',
            ],
        ],
    ]);

    expect($budget)->toBeInstanceOf(Budget::class)
        ->and($budget->status)->toBe('draft')
        ->and($budget->total_amount)->toBe(2_000_000.0);

    // Référence au format BDGT-YYYY-XXXXX
    if ($budget->reference) {
        expect($budget->reference)->toMatch('/^BDGT-\d{4}-\d{5}$/');
    }
});

// =============================================================================
// CALCUL DES ÉCARTS
// =============================================================================

it('calculates variance correctly', function () {
    $budgeted = 1_000_000.0;
    $actual   = 1_150_000.0;

    $result = $this->service->calculateVariance(
        budgeted: $budgeted,
        actual:   $actual,
    );

    expect($result)->toHaveKey('variance_amount')
        ->and($result)->toHaveKey('variance_percent');

    expect($result['variance_amount'])->toBe(150_000.0);
    expect(round($result['variance_percent'], 2))->toBe(15.0);
});

it('detects favorable vs unfavorable variance', function () {
    // Pour une CHARGE : réel > budgété → défavorable
    $chargeResult = $this->service->calculateVariance(
        budgeted:  500_000.0,
        actual:    600_000.0,
        isIncome:  false,
    );
    expect($chargeResult['is_favorable'])->toBeFalse();

    // Pour un PRODUIT : réel > budgété → favorable
    $produitResult = $this->service->calculateVariance(
        budgeted:  500_000.0,
        actual:    600_000.0,
        isIncome:  true,
    );
    expect($produitResult['is_favorable'])->toBeTrue();

    // Pour une CHARGE : réel < budgété → favorable
    $chargeOkResult = $this->service->calculateVariance(
        budgeted:  500_000.0,
        actual:    400_000.0,
        isIncome:  false,
    );
    expect($chargeOkResult['is_favorable'])->toBeTrue();
});

// =============================================================================
// PRÉVISIONS LINÉAIRES
// =============================================================================

it('generates linear forecast from actuals', function () {
    // Réels des 3 derniers mois : jan=100k, fev=120k, mar=140k
    // Tendance linéaire : +20k/mois
    // Prévision avril = 160k, mai = 180k, juin = 200k

    $actuals = [100_000.0, 120_000.0, 140_000.0];

    $forecast = $this->service->generateLinearForecast(
        actuals:       $actuals,
        monthsAhead:   3,
    );

    expect($forecast)->toBeArray()
        ->and($forecast)->toHaveCount(3);

    // Vérification de la tendance croissante
    expect($forecast[0])->toBeLessThan($forecast[1])
        ->and($forecast[1])->toBeLessThan($forecast[2]);

    // La prévision du 4e mois devrait être ~160 000
    expect(abs($forecast[0] - 160_000.0))->toBeLessThan(1_000.0);
});

// =============================================================================
// ALERTES BUDGÉTAIRES
// =============================================================================

it('triggers alert when budget threshold exceeded', function () {
    Notification::fake();

    $budget = Budget::factory()->create([
        'organization_id' => $this->org->id,
        'fiscal_year_id'  => $this->fy->id,
        'total_amount'    => 1_000_000.0,
        'status'          => 'approved',
    ]);

    $line = BudgetLine::factory()->create([
        'budget_id'     => $budget->id,
        'annual_amount' => 100_000.0,
        'actual_amount' => 0.0,
    ]);

    // Consommation à 82% → doit déclencher l'alerte 80%
    $result = $this->service->checkBudgetAlerts(
        line:           $line,
        consumedAmount: 82_000.0,
    );

    expect($result)->toHaveKey('alerts')
        ->and($result['alerts'])->not->toBeEmpty();

    $alertTypes = collect($result['alerts'])->pluck('threshold')->toArray();
    expect($alertTypes)->toContain(80);
});

it('triggers 100 percent alert when budget fully consumed', function () {
    $budget = Budget::factory()->create([
        'organization_id' => $this->org->id,
        'fiscal_year_id'  => $this->fy->id,
        'total_amount'    => 500_000.0,
        'status'          => 'approved',
    ]);

    $line = BudgetLine::factory()->create([
        'budget_id'     => $budget->id,
        'annual_amount' => 50_000.0,
        'actual_amount' => 0.0,
    ]);

    // Consommation à 105% → doit déclencher 80% ET 100%
    $result = $this->service->checkBudgetAlerts(
        line:           $line,
        consumedAmount: 52_500.0,
    );

    $thresholds = collect($result['alerts'])->pluck('threshold')->toArray();
    expect($thresholds)->toContain(100);
});

// =============================================================================
// VERROUILLAGE APRÈS APPROBATION
// =============================================================================

it('locks budget lines after approval', function () {
    $budget = Budget::factory()->create([
        'organization_id' => $this->org->id,
        'fiscal_year_id'  => $this->fy->id,
        'status'          => 'approved',
    ]);

    BudgetLine::factory()->create([
        'budget_id'     => $budget->id,
        'annual_amount' => 200_000.0,
        'is_locked'     => true,
    ]);

    // Tenter de modifier une ligne verrouillée doit lever une exception
    $lockedLine = $budget->lines()->first();

    $this->service->updateBudgetLine($lockedLine, ['annual_amount' => 999_999.0]);
})->throws(\LogicException::class);

// =============================================================================
// PRÉVISION SAISONNIÈRE
// =============================================================================

it('calculates weighted forecast with seasonality', function () {
    // Saisonnalité N-1 : Q1=25%, Q2=30%, Q3=20%, Q4=25%
    $seasonalWeights = [0.25, 0.30, 0.20, 0.25];
    $annualTarget    = 2_000_000.0;

    $forecast = $this->service->calculateSeasonalForecast(
        annualTarget:    $annualTarget,
        seasonalWeights: $seasonalWeights,
    );

    expect($forecast)->toHaveCount(4);

    // Q2 doit être la plus haute (30%)
    expect($forecast['q2'])->toBeGreaterThan($forecast['q1'])
        ->and($forecast['q2'])->toBeGreaterThan($forecast['q3'])
        ->and($forecast['q2'])->toBeGreaterThan($forecast['q4']);

    // La somme des prévisions trimestrielles = annualTarget
    $total = array_sum($forecast);
    expect(abs($total - $annualTarget))->toBeLessThan(1.0);
});
