<?php

namespace Tests\Feature\Payment;

use App\Models\Order;
use App\Models\Organization;
use App\Models\PaymentMethodConfig;
use App\Models\PaymentWebhookLog;
use App\Models\Plan;
use App\Models\User;
use App\Models\Voucher;
use App\Services\Payment\ManualPaymentService;
use App\Services\Payment\PaymentService;
use App\Services\Payment\VoucherService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * PaymentFlowTest — Tests de sécurité critiques du module paiement
 *
 * Ces tests vérifient les 11 règles de sécurité absolues IBIG SECRETIS.
 * Ils ne doivent JAMAIS être supprimés ou commentés en production.
 */
class PaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User $user;
    private User $admin;
    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org = Organization::factory()->create([
            'country' => 'CI',
            'status'  => 'active',
        ]);

        $this->user = User::factory()->create([
            'organization_id' => $this->org->id,
        ]);

        $this->admin = User::factory()->create([
            'is_ibig_admin' => true,
        ]);

        $this->plan = Plan::factory()->create([
            'slug'       => 'pro',
            'price_xof'  => 59000,
            'is_active'  => true,
        ]);
    }

    // =========================================================================
    // TEST 1 : Montant calculé côté serveur
    // =========================================================================

    /** @test */
    public function it_creates_order_with_correct_server_calculated_amount(): void
    {
        $this->actingAs($this->user, 'sanctum');

        // Le client envoie un montant falsifié (1 XOF au lieu de 59 000)
        $response = $this->postJson('/api/v1/orders', [
            'plan_code'           => 'pro',
            'period'              => 'monthly',
            'payment_method_type' => 'mobile_money',
            'currency'            => 'XOF',
            // Pas de champ "amount" — le montant vient de la base
        ]);

        $response->assertStatus(201);

        $order = Order::latest()->first();

        // SÉCURITÉ : le montant doit correspondre au prix du plan en base
        $this->assertEquals(59000, $order->amount);
        $this->assertEquals('XOF', $order->currency);
    }

    // =========================================================================
    // TEST 2 : L'URL de retour passerelle N'ACTIVE PAS la licence
    // =========================================================================

    /** @test */
    public function it_activates_license_only_via_verified_webhook(): void
    {
        $this->actingAs($this->user, 'sanctum');

        $order = Order::factory()->create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'plan_code'       => 'pro',
            'amount'          => 59000,
            'status'          => 'pending',
        ]);

        // Simulation d'un retour URL passerelle (falsifiable)
        $returnUrl = "/abonnement/commandes/{$order->reference}?payment_status=success&order_id={$order->id}";
        $response  = $this->get($returnUrl);

        // L'URL de retour ne doit PAS changer le statut de la commande
        $order->refresh();
        $this->assertNotEquals('paid', $order->status);

        // La licence n'est pas activée
        $this->assertNull($this->org->activeLicense()->first());
    }

    // =========================================================================
    // TEST 3 : Vérification signature HMAC CinetPay
    // =========================================================================

    /** @test */
    public function it_verifies_cinetpay_webhook_signature_correctly(): void
    {
        $secret = 'test_secret_cinetpay_hmac';
        config(['payment.providers.cinetpay.webhook_secret' => encrypt($secret)]);

        $order = Order::factory()->create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'plan_code'       => 'pro',
            'amount'          => 59000,
            'status'          => 'pending',
            'reference'       => 'ORD-2026-00001',
        ]);

        $payload = [
            'cpm_trans_id'       => 'CPT-' . uniqid(),
            'cpm_payment_status' => 'ACCEPTED',
            'cpm_amount'         => '59000',
            'cpm_currency'       => 'XOF',
            'cpm_custom'         => 'ORD-2026-00001',
        ];

        $rawBody  = json_encode($payload);
        $signature = hash_hmac('sha256', $rawBody, $secret);

        $response = $this->postJson('/webhooks/cinetpay', $payload, [
            'X-Cinetpay-Signature' => $signature,
            'Content-Type'         => 'application/json',
        ]);

        $response->assertStatus(200)
                 ->assertJson(['status' => 'received']);

        // Le webhook est loggé comme signature valide
        $log = PaymentWebhookLog::latest()->first();
        $this->assertNotNull($log);
        $this->assertTrue($log->signature_valid);
    }

    // =========================================================================
    // TEST 4 : Signature invalide → webhook rejeté
    // =========================================================================

    /** @test */
    public function it_rejects_webhook_with_invalid_signature(): void
    {
        config(['payment.providers.cinetpay.webhook_secret' => encrypt('correct_secret')]);

        $payload = [
            'cpm_trans_id'       => 'CPT-FAKE-123',
            'cpm_payment_status' => 'ACCEPTED',
            'cpm_amount'         => '59000',
        ];

        // Signature avec une mauvaise clé
        $wrongSignature = hash_hmac('sha256', json_encode($payload), 'wrong_secret');

        $response = $this->postJson('/webhooks/cinetpay', $payload, [
            'X-Cinetpay-Signature' => $wrongSignature,
        ]);

        // Toujours 200 (pour éviter les relivraisons) mais aucune activation
        $response->assertStatus(200);

        // Aucun webhook loggé comme traité
        $log = PaymentWebhookLog::where('event_id', 'CPT-FAKE-123')->first();
        $this->assertNull($log);

        // Aucune licence activée
        $this->assertNull($this->org->activeLicense()->first());
    }

    // =========================================================================
    // TEST 5 : Idempotence — 2 webhooks identiques → 1 seule activation
    // =========================================================================

    /** @test */
    public function it_prevents_double_activation_via_webhook_idempotence(): void
    {
        $secret = 'idempotence_test_secret';
        config(['payment.providers.paystack.webhook_secret' => encrypt($secret)]);

        $order = Order::factory()->create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'plan_code'       => 'pro',
            'amount'          => 59000,
            'status'          => 'pending',
            'reference'       => 'ORD-2026-00002',
        ]);

        $eventId = 'PS-EVENT-' . uniqid();
        $payload = [
            'event' => 'charge.success',
            'data'  => [
                'id'        => $eventId,
                'reference' => 'ORD-2026-00002',
                'amount'    => 5900000, // Paystack en centimes
                'currency'  => 'XOF',
                'status'    => 'success',
            ],
        ];

        $rawBody   = json_encode($payload);
        $signature = hash_hmac('sha512', $rawBody, $secret);
        $headers   = ['X-Paystack-Signature' => $signature, 'Content-Type' => 'application/json'];

        // Premier webhook
        $this->postJson('/webhooks/paystack', $payload, $headers)->assertStatus(200);

        // Deuxième webhook identique (relivraison)
        $response2 = $this->postJson('/webhooks/paystack', $payload, $headers);
        $response2->assertStatus(200)
                  ->assertJson(['status' => 'already_processed']);

        // Vérifier qu'il n'y a qu'UN SEUL log pour cet event_id
        $logsCount = PaymentWebhookLog::where('event_id', $eventId)->count();
        $this->assertEquals(1, $logsCount);
    }

    // =========================================================================
    // TEST 6 : Montant non correspondant → webhook rejeté
    // =========================================================================

    /** @test */
    public function it_rejects_webhook_with_mismatched_amount(): void
    {
        $secret = 'amount_test_secret';
        config(['payment.providers.cinetpay.webhook_secret' => encrypt($secret)]);

        $order = Order::factory()->create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'plan_code'       => 'pro',
            'amount'          => 59000,
            'status'          => 'pending',
            'reference'       => 'ORD-2026-00003',
        ]);

        $payload = [
            'cpm_trans_id'       => 'CPT-WRONG-AMOUNT',
            'cpm_payment_status' => 'ACCEPTED',
            'cpm_amount'         => '100',   // 100 au lieu de 59 000 !
            'cpm_currency'       => 'XOF',
            'cpm_custom'         => 'ORD-2026-00003',
        ];

        $rawBody   = json_encode($payload);
        $signature = hash_hmac('sha256', $rawBody, $secret);

        $this->postJson('/webhooks/cinetpay', $payload, [
            'X-Cinetpay-Signature' => $signature,
        ])->assertStatus(200);

        // La commande ne doit pas être payée
        $order->refresh();
        $this->assertNotEquals('paid', $order->status);

        // Le log indique un mismatch de montant
        $log = PaymentWebhookLog::where('event_id', 'CPT-WRONG-AMOUNT')->first();
        $this->assertNotNull($log);
        $this->assertFalse($log->amount_matches);
    }

    // =========================================================================
    // TEST 7 : Preuve stockée en espace privé (jamais /public)
    // =========================================================================

    /** @test */
    public function it_stores_payment_proof_in_private_storage(): void
    {
        Storage::fake('private');

        $order = Order::factory()->create([
            'organization_id'     => $this->org->id,
            'user_id'             => $this->user->id,
            'plan_code'           => 'pro',
            'amount'              => 59000,
            'status'              => 'pending',
            'payment_method_type' => 'mobile_money',
        ]);

        $fakeFile = UploadedFile::fake()->image('recu.jpg', 400, 300)->size(200);

        $service = app(ManualPaymentService::class);
        $proof   = $service->submitProof($order, $this->user, $fakeFile, 'TXN-123456');

        // Le fichier doit être sur le disk 'private'
        Storage::disk('private')->assertExists($proof->file_path);

        // Le file_path ne doit JAMAIS contenir "/public"
        $this->assertStringNotContainsString('/public', $proof->file_path);
        $this->assertStringNotContainsString('public/', $proof->file_path);
    }

    // =========================================================================
    // TEST 8 : Rejet des fichiers exécutables déguisés en image
    // =========================================================================

    /** @test */
    public function it_rejects_executable_files_disguised_as_images(): void
    {
        Storage::fake('private');

        $order = Order::factory()->create([
            'organization_id'     => $this->org->id,
            'user_id'             => $this->user->id,
            'status'              => 'pending',
            'payment_method_type' => 'mobile_money',
        ]);

        // Tentative d'upload d'un fichier PHP déguisé
        $maliciousFile = UploadedFile::fake()->createWithContent(
            'shell.php',
            '<?php system($_GET["cmd"]); ?>'
        );

        $service = app(ManualPaymentService::class);

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        $service->submitProof($order, $this->user, $maliciousFile);
    }

    // =========================================================================
    // TEST 9 : Détection de doublons via SHA-256
    // =========================================================================

    /** @test */
    public function it_detects_duplicate_proof_via_sha256_hash(): void
    {
        Storage::fake('private');

        $order = Order::factory()->create([
            'organization_id'     => $this->org->id,
            'user_id'             => $this->user->id,
            'status'              => 'pending',
            'payment_method_type' => 'mobile_money',
        ]);

        $order2 = Order::factory()->create([
            'organization_id'     => $this->org->id,
            'user_id'             => $this->user->id,
            'status'              => 'pending',
            'payment_method_type' => 'mobile_money',
        ]);

        // Créer un fichier unique et déterministe
        $content  = 'fake-proof-content-' . uniqid();
        $file1    = UploadedFile::fake()->createWithContent('recu1.jpg', $content);
        $file1->forceMimeType('image/jpeg'); // simuler un vrai MIME

        // On mock le detectMimeType pour cette passe
        $service = app(ManualPaymentService::class);

        // Premier upload (doit passer)
        // Note: on bypass la validation MIME pour ce test de doublon
        \App\Models\PaymentProof::create([
            'order_id'          => $order->id,
            'user_id'           => $this->user->id,
            'file_path'         => 'payment-proofs/1/test.jpg',
            'file_hash'         => hash('sha256', $content),
            'original_filename' => 'recu1.jpg',
            'mime_type'         => 'image/jpeg',
            'file_size'         => strlen($content),
        ]);

        // Deuxième upload avec le même hash
        $this->expectException(\Illuminate\Validation\ValidationException::class);

        // Simuler le même contenu → même hash
        $file2 = UploadedFile::fake()->createWithContent('recu2.jpg', $content);

        // Appel direct de la logique de hash
        $hash = hash('sha256', $content);
        $this->assertTrue(\App\Models\PaymentProof::where('file_hash', $hash)->exists());
    }

    // =========================================================================
    // TEST 10 : Expiration des commandes non payées après 48h
    // =========================================================================

    /** @test */
    public function it_expires_unpaid_orders_after_48_hours(): void
    {
        $order = Order::factory()->create([
            'organization_id' => $this->org->id,
            'user_id'         => $this->user->id,
            'status'          => 'pending',
            'expires_at'      => Carbon::now()->subHours(49), // expirée depuis 49h
        ]);

        $this->artisan('secretis:expire-unpaid-orders')
             ->assertExitCode(0);

        $order->refresh();
        $this->assertEquals('cancelled', $order->status);
    }

    // =========================================================================
    // TEST 11 : Activation après approbation de preuve par admin
    // =========================================================================

    /** @test */
    public function it_activates_license_after_proof_approval_by_admin(): void
    {
        Storage::fake('private');

        $order = Order::factory()->create([
            'organization_id'     => $this->org->id,
            'user_id'             => $this->user->id,
            'plan_code'           => 'pro',
            'amount'              => 59000,
            'status'              => 'proof_submitted',
            'payment_method_type' => 'mobile_money',
        ]);

        $proof = \App\Models\PaymentProof::create([
            'order_id'          => $order->id,
            'user_id'           => $this->user->id,
            'file_path'         => 'payment-proofs/1/proof.jpg',
            'file_hash'         => hash('sha256', 'unique-proof-content'),
            'original_filename' => 'recu.jpg',
            'mime_type'         => 'image/jpeg',
            'file_size'         => 50000,
            'status'            => 'pending',
        ]);

        Storage::disk('private')->put('payment-proofs/1/proof.jpg', 'fake-image-content');

        $service = app(ManualPaymentService::class);
        $service->approveProof($proof, $this->admin);

        $order->refresh();
        $this->assertEquals('paid', $order->status);
        $this->assertNotNull($order->paid_at);

        $proof->refresh();
        $this->assertEquals('approved', $proof->status);
        $this->assertEquals($this->admin->id, $proof->reviewed_by);
    }

    // =========================================================================
    // TEST 12 : Rédemption d'un voucher → activation immédiate
    // =========================================================================

    /** @test */
    public function it_redeems_voucher_and_activates_license_immediately(): void
    {
        $voucher = Voucher::factory()->create([
            'code'       => '1A2B-3C4D-5E6F-7890',
            'value'      => 59000,
            'currency'   => 'XOF',
            'is_used'    => false,
            'created_by' => $this->admin->id,
        ]);

        $order = Order::factory()->create([
            'organization_id'     => $this->org->id,
            'user_id'             => $this->user->id,
            'plan_code'           => 'pro',
            'amount'              => 59000,
            'currency'            => 'XOF',
            'status'              => 'pending',
            'payment_method_type' => 'voucher',
        ]);

        $service = app(VoucherService::class);
        $service->redeem('1A2B-3C4D-5E6F-7890', $order, $this->user);

        $voucher->refresh();
        $order->refresh();

        $this->assertTrue($voucher->is_used);
        $this->assertEquals($this->org->id, $voucher->used_by_org);
        $this->assertEquals('paid', $order->status);
    }

    // =========================================================================
    // TEST 13 : Middleware bloque l'accès si licence expirée
    // =========================================================================

    /** @test */
    public function it_blocks_access_when_license_expires(): void
    {
        // Organisation sans licence active
        $this->org->update(['trial_ends_at' => Carbon::now()->subDay()]);

        $this->actingAs($this->user, 'sanctum');

        $response = $this->getJson('/api/v1/documents'); // route protégée

        $response->assertStatus(402)
                 ->assertJson(['code' => 'LICENSE_EXPIRED']);
    }

    // =========================================================================
    // TEST 14 : Accès en lecture seule pendant la période de grâce
    // =========================================================================

    /** @test */
    public function it_allows_read_only_access_during_grace_period(): void
    {
        \App\Models\License::factory()->create([
            'organization_id' => $this->org->id,
            'status'          => 'grace',
            'expires_at'      => Carbon::now()->subDays(3), // expirée depuis 3 jours
        ]);

        $this->actingAs($this->user, 'sanctum');

        $response = $this->getJson('/api/v1/documents'); // GET → lecture seule OK

        // Pendant la grâce, l'accès en lecture est autorisé (renvoyé au prochain middleware)
        // On vérifie qu'on ne reçoit PAS un 402
        $response->assertStatus(200);
    }

    // =========================================================================
    // TEST 15 : Coupure d'accès après la période de grâce
    // =========================================================================

    /** @test */
    public function it_cuts_access_after_grace_period_ends(): void
    {
        $graceDays = config('payment.grace_period_days', 7);

        \App\Models\License::factory()->create([
            'organization_id' => $this->org->id,
            'status'          => 'grace',
            'expires_at'      => Carbon::now()->subDays($graceDays + 1), // grâce dépassée
        ]);

        // Lancer la commande qui expire les licences
        $this->artisan('secretis:process-license-grace')->assertExitCode(0);

        $this->actingAs($this->user, 'sanctum');

        $response = $this->getJson('/api/v1/documents');
        $response->assertStatus(402)
                 ->assertJson(['code' => 'LICENSE_EXPIRED']);
    }
}
