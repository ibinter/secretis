<?php

use App\Models\License;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seedForTests();
    Storage::fake('private');

    $this->org  = $this->createOrganization(['slug' => 'org-payments'], 'trial');
    $this->plan = $this->getOrCreateDefaultPlan();

    // Clé secrète CinetPay de test (en production : depuis .env)
    $this->cinetpaySecret = config('services.cinetpay.secret_key', 'TEST_SECRET_KEY_SECRETIS');
});

// =============================================================================
// WEBHOOK CINETPAY — Signature valide → paiement traité
// =============================================================================

test('webhook CinetPay avec signature valide traite le paiement et active la licence', function () {
    $transactionId = 'TXN-' . uniqid();

    $payload = [
        'cpm_site_id'       => config('services.cinetpay.site_id', 'TEST_SITE'),
        'cpm_trans_id'      => $transactionId,
        'cpm_trans_date'    => now()->format('Y-m-d H:i:s'),
        'cpm_amount'        => (string) $this->plan->price,
        'cpm_currency'      => 'XOF',
        'cpm_payment_config' => 'PROD',
        'cpm_page_action'   => 'PAYMENT',
        'cpm_version'       => 'V1',
        'cpm_payment_stage' => 'PROD',
        'cel_phone_num'     => '+2250700000000',
        'cpm_phone_prefixe' => 'CI',
        'cpm_language'      => 'fr',
        'cpm_error_message' => 'SUCCESSFUL',
        'cpm_result'        => '00', // 00 = succès CinetPay
        'cpm_custom'        => json_encode([
            'organization_id' => $this->org->id,
            'plan_id'         => $this->plan->id,
            'duration_months' => 1,
        ]),
    ];

    // Calculer la signature HMAC valide
    $signature = $this->computeCinetPaySignature($payload, $this->cinetpaySecret);
    $payload['cpm_site_id_key'] = $signature;

    $response = $this->postJson('/api/webhooks/cinetpay', $payload);

    $response->assertStatus(200);

    // Le paiement est enregistré en BDD
    $this->assertDatabaseHas('payments', [
        'transaction_id' => $transactionId,
        'status'         => 'completed',
    ]);

    // La licence est activée pour l'organisation
    $this->assertDatabaseHas('licenses', [
        'organization_id' => $this->org->id,
        'status'          => 'active',
    ]);
});

// =============================================================================
// WEBHOOK CINETPAY — Signature invalide → 403 + log
// =============================================================================

test('webhook CinetPay avec signature invalide retourne 403 et est loggué', function () {
    Log::spy();

    $payload = [
        'cpm_site_id'        => config('services.cinetpay.site_id', 'TEST_SITE'),
        'cpm_trans_id'       => 'TXN-FAKE-' . uniqid(),
        'cpm_amount'         => '15000',
        'cpm_currency'       => 'XOF',
        'cpm_result'         => '00',
        'cpm_site_id_key'    => 'INVALID_SIGNATURE_TAMPERED', // Signature falsifiée
        'cpm_custom'         => json_encode(['organization_id' => $this->org->id]),
    ];

    $response = $this->postJson('/api/webhooks/cinetpay', $payload);

    $response->assertStatus(403);

    // La tentative est loggée comme avertissement de sécurité
    Log::shouldHaveReceived('warning')
        ->withArgs(fn($msg) => str_contains($msg, 'signature') || str_contains($msg, 'webhook'));

    // Aucun paiement enregistré
    $this->assertDatabaseMissing('payments', [
        'transaction_id' => $payload['cpm_trans_id'],
    ]);
});

// =============================================================================
// IDEMPOTENCE WEBHOOK — Même payload deux fois → traité une seule fois
// =============================================================================

test('idempotence webhook : même payload envoyé deux fois est traité une seule fois', function () {
    $transactionId = 'TXN-IDEMPOTENT-' . uniqid();

    $payload = $this->buildValidCinetPayPayload($transactionId);

    // Premier appel
    $response1 = $this->postJson('/api/webhooks/cinetpay', $payload);
    $response1->assertStatus(200);

    // Deuxième appel identique (retry webhook CinetPay)
    $response2 = $this->postJson('/api/webhooks/cinetpay', $payload);
    $response2->assertStatus(200);

    // Une seule entrée en BDD
    $paymentCount = Payment::where('transaction_id', $transactionId)->count();
    expect($paymentCount)->toBe(1);

    // Une seule licence active
    $licenseCount = License::where('organization_id', $this->org->id)
        ->where('status', 'active')
        ->count();
    expect($licenseCount)->toBe(1);
});

// =============================================================================
// PAIEMENT MANUEL — Licence NON activée sans validation admin
// =============================================================================

test('paiement manuel ne active pas la licence sans validation admin', function () {
    $manualProof = UploadedFile::fake()->create('virement_bancaire.pdf', 200, 'application/pdf');

    $response = $this->actingAs($this->createUserWithRole($this->org, 'admin_org'))
                     ->postJson('/api/payments/manual', [
                         'plan_id'           => $this->plan->id,
                         'duration_months'   => 1,
                         'payment_proof'     => $manualProof,
                         'payment_reference' => 'VIR-2026-001',
                     ]);

    $response->assertStatus(201); // Paiement soumis avec succès

    // Le statut du paiement doit être "pending_review" (pas "completed")
    $this->assertDatabaseHas('payments', [
        'status'          => 'pending_review',
        'organization_id' => $this->org->id,
    ]);

    // La licence n'est PAS encore activée
    $this->assertDatabaseMissing('licenses', [
        'organization_id' => $this->org->id,
        'status'          => 'active',
    ]);

    // L'organisation est toujours en trial
    $this->org->refresh();
    expect($this->org->status)->toBe('trial');
});

// =============================================================================
// VALIDATION ADMIN — Licence activée après validation
// =============================================================================

test('validation admin du paiement manuel active la licence', function () {
    $adminUser = $this->createUserWithRole($this->org, 'admin_org');
    $superAdmin = $this->createSuperAdmin();

    // Créer un paiement en attente de validation
    $payment = Payment::create([
        'organization_id'   => $this->org->id,
        'plan_id'           => $this->plan->id,
        'amount'            => $this->plan->price,
        'currency'          => 'XOF',
        'status'            => 'pending_review',
        'payment_method'    => 'manual',
        'transaction_id'    => 'MANUAL-' . uniqid(),
        'duration_months'   => 1,
    ]);

    // Le superadmin valide le paiement
    $this->actingAsUserInOrganization($superAdmin);

    $response = $this->postJson("/api/admin/payments/{$payment->id}/validate", [
        'notes' => 'Virement vérifié et confirmé',
    ]);

    $response->assertStatus(200);

    // Le paiement est maintenant "completed"
    $payment->refresh();
    expect($payment->status)->toBe('completed');

    // La licence est activée
    $this->assertDatabaseHas('licenses', [
        'organization_id' => $this->org->id,
        'status'          => 'active',
    ]);
});

// =============================================================================
// PREUVE DE PAIEMENT — Stockée dans storage privé
// =============================================================================

test('preuve de paiement stockée dans storage privé, pas dans public', function () {
    $adminUser = $this->createUserWithRole($this->org, 'admin_org');
    $this->actingAs($adminUser);

    $proofFile = UploadedFile::fake()->create('preuve_virement.pdf', 300, 'application/pdf');

    $response = $this->postJson('/api/payments/manual', [
        'plan_id'           => $this->plan->id,
        'duration_months'   => 1,
        'payment_proof'     => $proofFile,
        'payment_reference' => 'VIR-2026-PROOF-001',
    ]);

    $response->assertStatus(201);

    $proofPath = $response->json('data.proof_path');

    // La preuve est dans le disk privé
    Storage::disk('private')->assertExists($proofPath);

    // Le chemin ne doit pas exposer le fichier publiquement
    expect($proofPath)->not->toStartWith('public/');

    // Tentative d'accès direct via URL publique → 403 ou 404
    $publicUrl = '/storage/' . $proofPath;
    $this->get($publicUrl)->assertStatus(fn($s) => in_array($s, [403, 404]));
});

// =============================================================================
// INVOICE PDF — Générée après paiement réussi
// =============================================================================

test('invoice PDF générée automatiquement après paiement CinetPay réussi', function () {
    $transactionId = 'TXN-INVOICE-' . uniqid();
    $payload       = $this->buildValidCinetPayPayload($transactionId);

    $response = $this->postJson('/api/webhooks/cinetpay', $payload);
    $response->assertStatus(200);

    // La facture est générée dans le storage privé
    $payment = Payment::where('transaction_id', $transactionId)->first();
    expect($payment)->not->toBeNull();

    // Vérifier que la facture existe dans storage (path dans le paiement)
    if ($payment->invoice_path) {
        Storage::disk('private')->assertExists($payment->invoice_path);
    }

    // Accès à la facture via l'API — nécessite authentification
    $adminUser = $this->createUserWithRole($this->org, 'admin_org');
    $this->actingAs($adminUser);

    $invoiceResponse = $this->get("/api/payments/{$payment->id}/invoice");

    $invoiceResponse->assertStatus(200)
                    ->assertHeader('Content-Type', 'application/pdf');
});

// =============================================================================
// Helpers privés
// =============================================================================

/**
 * Calcule la signature CinetPay HMAC-SHA256.
 */
function computeCinetPaySignature(array $payload, string $secret): string
{
    ksort($payload);
    $stringToSign = implode('', array_values($payload));
    return hash_hmac('sha256', $stringToSign, $secret);
}

/**
 * Construit un payload CinetPay valide avec signature pour les tests.
 */
function buildValidCinetPayPayload(string $transactionId): array
{
    $org    = test()->org;
    $plan   = test()->plan;
    $secret = test()->cinetpaySecret;

    $payload = [
        'cpm_site_id'        => config('services.cinetpay.site_id', 'TEST_SITE'),
        'cpm_trans_id'       => $transactionId,
        'cpm_trans_date'     => now()->format('Y-m-d H:i:s'),
        'cpm_amount'         => (string) $plan->price,
        'cpm_currency'       => 'XOF',
        'cpm_payment_config' => 'PROD',
        'cpm_page_action'    => 'PAYMENT',
        'cpm_version'        => 'V1',
        'cpm_result'         => '00',
        'cpm_error_message'  => 'SUCCESSFUL',
        'cpm_custom'         => json_encode([
            'organization_id' => $org->id,
            'plan_id'         => $plan->id,
            'duration_months' => 1,
        ]),
    ];

    ksort($payload);
    $signature = hash_hmac('sha256', implode('', array_values($payload)), $secret);
    $payload['cpm_site_id_key'] = $signature;

    return $payload;
}
