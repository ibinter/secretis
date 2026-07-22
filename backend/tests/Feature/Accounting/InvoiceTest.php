<?php

/**
 * InvoiceTest — Tests de fonctionnalité Comptabilité / Facturation
 *
 * Teste : numérotation séquentielle, TVA 18%, paiement, rappels, export PDF.
 */

use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->org  = $this->createOrganization(['slug' => 'invoice-test-' . uniqid()], 'active');
    $this->user = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    $this->actingAs($this->user);
});

it('generates sequential invoice number per organization', function () {
    $org2   = $this->createOrganization(['slug' => 'invoice-org2-' . uniqid()], 'active');
    $this->createActiveLicense($org2);

    // Créer 3 factures pour org1
    $invoices = [];
    for ($i = 0; $i < 3; $i++) {
        $response = $this->postJson(route('accounting.invoices.store'), [
            'organization_id' => $this->org->id,
            'client_name'     => 'Client Test ' . $i,
            'amount_ht'       => 100000,
            'currency'        => 'XOF',
            'due_date'        => Carbon::now()->addDays(30)->toDateString(),
            'items'           => [
                ['description' => 'Service ' . $i, 'quantity' => 1, 'unit_price' => 100000],
            ],
        ]);
        $invoices[] = $response->json('data.invoice_number');
    }

    $year = Carbon::now()->year;

    // Les factures doivent être séquentielles pour cette organisation
    expect($invoices[0])->toMatch("/^FACT-{$this->org->id}-{$year}-0001$/");
    expect($invoices[1])->toMatch("/^FACT-{$this->org->id}-{$year}-0002$/");
    expect($invoices[2])->toMatch("/^FACT-{$this->org->id}-{$year}-0003$/");

    // La séquence repart à 1 pour org2
    $this->actingAs($this->createUserWithRole($org2, 'gestionnaire'));
    $resp2  = $this->postJson(route('accounting.invoices.store'), [
        'organization_id' => $org2->id,
        'client_name'     => 'Client Org2',
        'amount_ht'       => 50000,
        'currency'        => 'XOF',
        'due_date'        => Carbon::now()->addDays(30)->toDateString(),
        'items'           => [['description' => 'Prestation', 'quantity' => 1, 'unit_price' => 50000]],
    ]);

    expect($resp2->json('data.invoice_number'))->toMatch("/^FACT-{$org2->id}-{$year}-0001$/");
});

it('calculates tax correctly at 18 percent', function () {
    $amountHT = 100000; // 100 000 XOF HT
    $taxRate  = 18;     // TVA 18% en Côte d'Ivoire

    $response = $this->postJson(route('accounting.invoices.store'), [
        'organization_id' => $this->org->id,
        'client_name'     => 'Client TVA Test',
        'amount_ht'       => $amountHT,
        'tax_rate'        => $taxRate,
        'currency'        => 'XOF',
        'due_date'        => Carbon::now()->addDays(30)->toDateString(),
        'items'           => [
            ['description' => 'Prestation', 'quantity' => 1, 'unit_price' => $amountHT],
        ],
    ]);

    $invoice = $response->json('data');

    expect($invoice['amount_ht'])->toBe($amountHT);
    expect($invoice['tax_amount'])->toBe(18000);       // 100 000 × 18% = 18 000
    expect($invoice['amount_ttc'])->toBe(118000);      // 100 000 + 18 000 = 118 000
});

it('marks invoice as paid on payment receipt', function () {
    $response = $this->postJson(route('accounting.invoices.store'), [
        'organization_id' => $this->org->id,
        'client_name'     => 'Client Paiement',
        'amount_ht'       => 50000,
        'currency'        => 'XOF',
        'due_date'        => Carbon::now()->addDays(30)->toDateString(),
        'items'           => [['description' => 'Prestation', 'quantity' => 1, 'unit_price' => 50000]],
    ]);

    $invoiceId = $response->json('data.id');

    // Enregistrer le paiement
    $payResponse = $this->postJson(route('accounting.invoices.pay', $invoiceId), [
        'amount_paid'    => 59000, // 50 000 × 1.18
        'payment_method' => 'mobile_money',
        'payment_ref'    => 'MM_' . uniqid(),
        'paid_at'        => Carbon::now()->toDateTimeString(),
    ]);

    expect($payResponse->status())->toBe(200);
    expect($payResponse->json('data.status'))->toBe('paid');
    expect($payResponse->json('data.paid_at'))->not->toBeNull();
});

it('sends overdue reminder at correct intervals', function () {
    // Créer une facture échue depuis 7 jours
    $response = $this->postJson(route('accounting.invoices.store'), [
        'organization_id' => $this->org->id,
        'client_name'     => 'Client En Retard',
        'amount_ht'       => 75000,
        'currency'        => 'XOF',
        'due_date'        => Carbon::now()->subDays(7)->toDateString(),
        'items'           => [['description' => 'Prestation', 'quantity' => 1, 'unit_price' => 75000]],
    ]);

    $invoiceId = $response->json('data.id');

    // Déclencher le job de rappel
    $reminderResp = $this->postJson(route('accounting.invoices.send-reminder', $invoiceId));

    expect($reminderResp->status())->toBe(200)
        ->and($reminderResp->json('reminder_sent'))->toBeTrue();
});

it('exports invoice as valid PDF', function () {
    Storage::fake('private');

    $response = $this->postJson(route('accounting.invoices.store'), [
        'organization_id' => $this->org->id,
        'client_name'     => 'Client Export PDF',
        'amount_ht'       => 120000,
        'currency'        => 'XOF',
        'due_date'        => Carbon::now()->addDays(30)->toDateString(),
        'items'           => [['description' => 'Licence ERP', 'quantity' => 1, 'unit_price' => 120000]],
    ]);

    $invoiceId = $response->json('data.id');

    $pdfResponse = $this->get(route('accounting.invoices.pdf', $invoiceId));

    expect($pdfResponse->status())->toBe(200)
        ->and($pdfResponse->headers->get('Content-Type'))->toContain('application/pdf');
});
