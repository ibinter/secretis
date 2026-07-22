<?php

/**
 * SyscohadaServiceTest — Tests unitaires du moteur comptable SYSCOHADA Révisé 2017
 *
 * Couvre : équilibre des écritures, balance, compte de résultat,
 *          bilan SYSCOHADA, déclaration TVA, clôture d'exercice,
 *          contrôle de validation duale.
 */

use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use App\Models\Organization;
use App\Models\TaxDeclaration;
use App\Models\User;
use App\Services\SyscohadaService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->service = new SyscohadaService();
    $this->org     = $this->createOrganization(['slug' => 'syscohada-' . uniqid()], 'active');
    $this->user    = $this->createUserWithRole($this->org, 'comptable');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    // Exercice fiscal ouvert
    $this->fy = FiscalYear::factory()->create([
        'organization_id' => $this->org->id,
        'name'            => 'Exercice 2026',
        'start_date'      => '2026-01-01',
        'end_date'        => '2026-12-31',
        'status'          => 'open',
    ]);

    // Comptes de base SYSCOHADA
    $this->account401 = ChartOfAccount::factory()->create([
        'organization_id' => $this->org->id,
        'account_number'  => '401000',
        'account_name'    => 'Fournisseurs',
        'account_type'    => 'passif',
        'is_active'       => true,
    ]);

    $this->account601 = ChartOfAccount::factory()->create([
        'organization_id' => $this->org->id,
        'account_number'  => '601000',
        'account_name'    => 'Achats de marchandises',
        'account_type'    => 'charge',
        'is_active'       => true,
    ]);

    $this->account411 = ChartOfAccount::factory()->create([
        'organization_id' => $this->org->id,
        'account_number'  => '411000',
        'account_name'    => 'Clients',
        'account_type'    => 'actif',
        'is_active'       => true,
    ]);

    $this->account701 = ChartOfAccount::factory()->create([
        'organization_id' => $this->org->id,
        'account_number'  => '701000',
        'account_name'    => 'Ventes de marchandises',
        'account_type'    => 'produit',
        'is_active'       => true,
    ]);
});

// =============================================================================
// ÉQUILIBRE DES ÉCRITURES
// =============================================================================

it('creates a balanced journal entry', function () {
    $entry = $this->service->createJournalEntry([
        'organization_id' => $this->org->id,
        'entry_date'      => '2026-03-15',
        'description'     => 'Achat marchandises',
        'journal_type'    => 'achats',
        'fiscal_year_id'  => $this->fy->id,
        'created_by'      => $this->user->id,
        'lines'           => [
            [
                'account_number' => '601000',
                'debit_amount'   => 500_000.00,
                'credit_amount'  => 0.00,
                'description'    => 'Achats marchandises',
            ],
            [
                'account_number' => '401000',
                'debit_amount'   => 0.00,
                'credit_amount'  => 500_000.00,
                'description'    => 'Fournisseur X',
            ],
        ],
    ]);

    expect($entry)->toBeInstanceOf(JournalEntry::class)
        ->and($entry->lines)->toHaveCount(2);

    $totalDebit  = $entry->lines->sum('debit_amount');
    $totalCredit = $entry->lines->sum('credit_amount');

    expect(abs($totalDebit - $totalCredit))->toBeLessThan(0.01);
});

it('rejects unbalanced journal entry', function () {
    $this->service->createJournalEntry([
        'organization_id' => $this->org->id,
        'entry_date'      => '2026-03-15',
        'description'     => 'Écriture déséquilibrée',
        'journal_type'    => 'divers',
        'fiscal_year_id'  => $this->fy->id,
        'created_by'      => $this->user->id,
        'lines'           => [
            [
                'account_number' => '601000',
                'debit_amount'   => 300_000.00,
                'credit_amount'  => 0.00,
                'description'    => 'Achats',
            ],
            [
                'account_number' => '401000',
                'debit_amount'   => 0.00,
                'credit_amount'  => 250_000.00, // <-- déséquilibre de 50 000
                'description'    => 'Fournisseur',
            ],
        ],
    ]);
})->throws(RuntimeException::class);

// =============================================================================
// BALANCE DE VÉRIFICATION
// =============================================================================

it('generates trial balance with correct totals', function () {
    // Créer deux écritures équilibrées
    foreach ([
        ['debit' => '601000', 'credit' => '401000', 'amount' => 200_000.00],
        ['debit' => '411000', 'credit' => '701000', 'amount' => 350_000.00],
    ] as $e) {
        $this->service->createJournalEntry([
            'organization_id' => $this->org->id,
            'entry_date'      => '2026-04-01',
            'description'     => 'Test balance',
            'journal_type'    => 'divers',
            'fiscal_year_id'  => $this->fy->id,
            'created_by'      => $this->user->id,
            'lines'           => [
                ['account_number' => $e['debit'],  'debit_amount' => $e['amount'], 'credit_amount' => 0],
                ['account_number' => $e['credit'],  'debit_amount' => 0, 'credit_amount' => $e['amount']],
            ],
        ]);
    }

    $balance = $this->service->generateTrialBalance($this->org->id, $this->fy->id);

    expect($balance)->toHaveKey('lines')
        ->and($balance)->toHaveKey('total_debit')
        ->and($balance)->toHaveKey('total_credit');

    // La somme totale débit doit égaler la somme totale crédit
    expect(abs($balance['total_debit'] - $balance['total_credit']))->toBeLessThan(0.01);
});

// =============================================================================
// COMPTE DE RÉSULTAT — SOLDES INTERMÉDIAIRES
// =============================================================================

it('calculates income statement soldes intermediaires correctly', function () {
    // Production : 1 000 000 XOF (compte 70x)
    // Achats consommés : 400 000 XOF (compte 60x)
    // Charges personnel : 200 000 XOF (compte 66x)
    // Valeur Ajoutée attendue : 1 000 000 - 400 000 = 600 000
    // EBE attendu : 600 000 - 200 000 = 400 000

    $result = $this->service->calculateSoldesIntermédiaires(
        organizationId: $this->org->id,
        fiscalYearId:   $this->fy->id,
        production:          1_000_000.00,
        achatsConsommes:       400_000.00,
        chargesPersonnel:      200_000.00,
        dotationsAmortissement: 50_000.00,
        chargesFinancieres:     30_000.00,
    );

    expect($result)->toHaveKey('valeur_ajoutee')
        ->and($result)->toHaveKey('ebe')
        ->and($result)->toHaveKey('resultat_exploitation');

    expect($result['valeur_ajoutee'])->toBe(600_000.00)
        ->and($result['ebe'])->toBe(400_000.00);
    // RE = EBE - Dotations = 400 000 - 50 000 = 350 000
    expect($result['resultat_exploitation'])->toBe(350_000.00);
});

// =============================================================================
// BILAN SYSCOHADA
// =============================================================================

it('generates balance sheet with actif equals passif', function () {
    $bilan = $this->service->generateBalanceSheet(
        organizationId: $this->org->id,
        fiscalYearId:   $this->fy->id,
    );

    expect($bilan)->toHaveKey('actif')
        ->and($bilan)->toHaveKey('passif')
        ->and($bilan)->toHaveKey('total_actif')
        ->and($bilan)->toHaveKey('total_passif');

    expect(abs($bilan['total_actif'] - $bilan['total_passif']))->toBeLessThan(0.01);
});

// =============================================================================
// DÉCLARATION TVA
// =============================================================================

it('calculates tva declaration correctly', function () {
    // TVA collectée : 180 000 XOF (18%)
    // TVA déductible : 72 000 XOF
    // TVA nette due : 108 000 XOF

    $result = $this->service->calculateTvaDeclaration(
        organizationId: $this->org->id,
        period:         '2026-04',
        tvaCollectee:   180_000.00,
        tvaDeductible:   72_000.00,
    );

    expect($result)->toHaveKey('tva_collectee')
        ->and($result)->toHaveKey('tva_deductible')
        ->and($result)->toHaveKey('tva_nette');

    expect($result['tva_collectee'])->toBe(180_000.00)
        ->and($result['tva_deductible'])->toBe(72_000.00)
        ->and($result['tva_nette'])->toBe(108_000.00);
});

// =============================================================================
// CLÔTURE D'EXERCICE
// =============================================================================

it('locks journal entries when fiscal year is closed', function () {
    // Clôturer l'exercice
    $this->fy->update(['status' => 'closed']);

    $this->service->createJournalEntry([
        'organization_id' => $this->org->id,
        'entry_date'      => '2026-12-31',
        'description'     => 'Tentative écriture post-clôture',
        'journal_type'    => 'divers',
        'fiscal_year_id'  => $this->fy->id,
        'created_by'      => $this->user->id,
        'lines'           => [
            ['account_number' => '601000', 'debit_amount' => 100_000, 'credit_amount' => 0],
            ['account_number' => '401000', 'debit_amount' => 0, 'credit_amount' => 100_000],
        ],
    ]);
})->throws(RuntimeException::class);

// =============================================================================
// CONTRÔLE DUAL DE VALIDATION
// =============================================================================

it('prevents duplicate entry validation by same user', function () {
    $entry = JournalEntry::factory()->create([
        'organization_id' => $this->org->id,
        'fiscal_year_id'  => $this->fy->id,
        'created_by'      => $this->user->id,
        'status'          => 'draft',
    ]);

    // Même utilisateur tente de valider sa propre écriture
    $this->service->validateJournalEntry($entry, $this->user);
})->throws(RuntimeException::class);
