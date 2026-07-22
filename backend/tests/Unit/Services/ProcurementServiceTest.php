<?php

/**
 * ProcurementServiceTest — Tests unitaires du service Achats / Fournisseurs
 *
 * Couvre : numérotation DA, scoring fournisseur, sélection gagnant,
 *          création bon de commande, statut réception partielle.
 */

use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptLine;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use App\Models\PurchaseRequest;
use App\Models\Quotation;
use App\Models\QuotationLine;
use App\Models\Rfq;
use App\Models\Supplier;
use App\Services\ProcurementService;
use Carbon\Carbon;

beforeEach(function () {
    $this->service = new ProcurementService();
    $this->org     = $this->createOrganization(['slug' => 'procurement-' . uniqid()], 'active');
    $this->user    = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    $this->supplier = Supplier::factory()->create([
        'organization_id' => $this->org->id,
        'name'            => 'Fournisseur Alpha SARL',
    ]);
});

// =============================================================================
// NUMÉROTATION AUTOMATIQUE DA
// =============================================================================

it('generates unique da reference', function () {
    Carbon::setTestNow(Carbon::parse('2026-03-10'));

    $pr1 = $this->service->createPurchaseRequest([
        'organization_id' => $this->org->id,
        'title'           => 'Matériel informatique',
        'requested_by'    => $this->user->id,
        'items'           => [
            ['description' => 'Laptop', 'qty' => 2, 'unit_price_est' => 500_000],
        ],
    ]);

    $pr2 = $this->service->createPurchaseRequest([
        'organization_id' => $this->org->id,
        'title'           => 'Fournitures bureau',
        'requested_by'    => $this->user->id,
        'items'           => [],
    ]);

    expect($pr1->pr_number)->toMatch('/^DA-2026-\d{5}$/')
        ->and($pr2->pr_number)->toMatch('/^DA-2026-\d{5}$/')
        ->and($pr1->pr_number)->not->toBe($pr2->pr_number);
});

// =============================================================================
// SCORE FINANCIER
// =============================================================================

it('calculates financial score correctly', function () {
    // Score financier = prix_min / prix_soumissionnaire × 100
    // Meilleur prix : 800 000 XOF (score = 100)
    // Soumissionnaire : 1 000 000 XOF (score = 80)

    $score = $this->service->calculateFinancialScore(
        supplierPrice: 1_000_000.0,
        minPrice:        800_000.0,
    );

    expect(round($score, 2))->toBe(80.0);
});

it('gives maximum financial score to lowest bidder', function () {
    $score = $this->service->calculateFinancialScore(
        supplierPrice: 800_000.0,
        minPrice:      800_000.0,
    );

    expect($score)->toBe(100.0);
});

// =============================================================================
// SCORE PONDÉRÉ
// =============================================================================

it('calculates weighted total score', function () {
    // Poids : technique 40%, financier 60%
    // Note technique : 85/100
    // Note financière : 80/100
    // Score total = (85 × 0.4) + (80 × 0.6) = 34 + 48 = 82

    $total = $this->service->calculateWeightedScore(
        scores:  ['technique' => 85.0, 'financier' => 80.0],
        weights: ['technique' => 40.0, 'financier' => 60.0],
    );

    expect(abs($total - 82.0))->toBeLessThan(0.01);
});

it('rejects weights that do not sum to 100', function () {
    $this->service->calculateWeightedScore(
        scores:  ['technique' => 85.0, 'financier' => 80.0],
        weights: ['technique' => 30.0, 'financier' => 50.0], // = 80, pas 100
    );
})->throws(\InvalidArgumentException::class);

// =============================================================================
// SÉLECTION DU GAGNANT
// =============================================================================

it('selects correct winner from quotations', function () {
    $rfq = Rfq::factory()->create(['organization_id' => $this->org->id]);

    $supplierA = Supplier::factory()->create(['organization_id' => $this->org->id]);
    $supplierB = Supplier::factory()->create(['organization_id' => $this->org->id]);

    $quoteA = Quotation::factory()->create([
        'rfq_id'       => $rfq->id,
        'supplier_id'  => $supplierA->id,
        'total_score'  => 82.5,
    ]);
    $quoteB = Quotation::factory()->create([
        'rfq_id'       => $rfq->id,
        'supplier_id'  => $supplierB->id,
        'total_score'  => 91.0,
    ]);

    $winner = $this->service->selectWinner($rfq);

    expect($winner->id)->toBe($quoteB->id)
        ->and($winner->total_score)->toBe(91.0);
});

// =============================================================================
// CRÉATION BON DE COMMANDE
// =============================================================================

it('creates purchase order from selected quotation', function () {
    $rfq = Rfq::factory()->create(['organization_id' => $this->org->id]);

    $quotation = Quotation::factory()->create([
        'rfq_id'      => $rfq->id,
        'supplier_id' => $this->supplier->id,
        'total_score' => 88.0,
        'status'      => 'selected',
    ]);

    // Lignes du devis
    QuotationLine::factory()->create([
        'quotation_id'  => $quotation->id,
        'description'   => 'Ordinateur portable',
        'qty'           => 3,
        'unit_price'    => 650_000,
        'total_price'   => 1_950_000,
    ]);
    QuotationLine::factory()->create([
        'quotation_id'  => $quotation->id,
        'description'   => 'Souris sans fil',
        'qty'           => 3,
        'unit_price'    => 15_000,
        'total_price'   => 45_000,
    ]);

    $po = $this->service->createPurchaseOrder($quotation, $this->user);

    expect($po)->toBeInstanceOf(PurchaseOrder::class)
        ->and($po->supplier_id)->toBe($this->supplier->id)
        ->and($po->lines)->toHaveCount(2);

    $descriptions = $po->lines->pluck('description')->toArray();
    expect($descriptions)->toContain('Ordinateur portable')
        ->and($descriptions)->toContain('Souris sans fil');
});

// =============================================================================
// STATUT RÉCEPTION
// =============================================================================

it('calculates goods receipt status correctly', function () {
    $po = PurchaseOrder::factory()->create([
        'organization_id' => $this->org->id,
        'supplier_id'     => $this->supplier->id,
        'status'          => 'sent',
    ]);

    $poLine = PurchaseOrderLine::factory()->create([
        'purchase_order_id' => $po->id,
        'qty_ordered'       => 10,
        'qty_received'      => 0,
    ]);

    $receipt = GoodsReceipt::factory()->create([
        'purchase_order_id' => $po->id,
        'organization_id'   => $this->org->id,
        'status'            => 'draft',
    ]);

    GoodsReceiptLine::factory()->create([
        'goods_receipt_id'    => $receipt->id,
        'purchase_order_line_id' => $poLine->id,
        'qty_received'        => 6,
    ]);

    $status = $this->service->calculateReceiptStatus($receipt);

    // 6 reçus sur 10 commandés → partiel
    expect($status)->toBe('partiel');
});

it('returns completed status when all items received', function () {
    $po = PurchaseOrder::factory()->create([
        'organization_id' => $this->org->id,
        'supplier_id'     => $this->supplier->id,
    ]);

    $poLine = PurchaseOrderLine::factory()->create([
        'purchase_order_id' => $po->id,
        'qty_ordered'       => 5,
        'qty_received'      => 0,
    ]);

    $receipt = GoodsReceipt::factory()->create([
        'purchase_order_id' => $po->id,
        'organization_id'   => $this->org->id,
        'status'            => 'draft',
    ]);

    GoodsReceiptLine::factory()->create([
        'goods_receipt_id'       => $receipt->id,
        'purchase_order_line_id' => $poLine->id,
        'qty_received'           => 5,
    ]);

    $status = $this->service->calculateReceiptStatus($receipt);
    expect($status)->toBe('complet');
});
