<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Tables du module paiement complet IBIG SECRETIS
 *
 * Tables créées :
 *   - payment_methods_config  : Configuration des 11 familles de moyens de paiement
 *   - orders                  : Commandes (remplace/complète payments pour le flux SaaS)
 *   - payment_proofs          : Preuves de paiement (stockage privé)
 *   - payment_webhook_logs    : Journal des webhooks entrants (idempotence)
 *   - vouchers                : Codes prépayés
 */
return new class extends Migration
{
    public function up(): void
    {
        // =====================================================================
        // 1. Configuration des moyens de paiement
        // =====================================================================
        if (! Schema::hasTable('payment_methods_config')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('payment_methods_config', function (Blueprint $table) {
                $table->id();
                $table->string('type');        // mobile_money, electronic, bank_transfer, international_transfer,
                                               // money_transfer, cash_agency, check, crypto, voucher, delivery, additional
                $table->string('provider');    // orange_money, mtn_momo, wave, cinetpay, paystack, flutterwave, stripe, etc.
                $table->string('display_name');
                $table->json('display_name_en')->nullable();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(false);
                $table->boolean('is_test_mode')->default(true);
                $table->json('config')->nullable();     // clés chiffrées via encrypt(), instructions, numéros
                $table->json('countries')->nullable();  // pays où disponible (null = tous)
                $table->json('plans')->nullable();      // plans où disponible (null = tous)
                $table->json('currencies')->nullable(); // devises acceptées
                $table->integer('order')->default(0);
                $table->string('icon')->nullable();
                $table->timestamps();

                $table->index(['type', 'is_active']);
                $table->unique(['type', 'provider']);
            });
        }

        // =====================================================================
        // 2. Commandes (orders)
        // =====================================================================
        if (! Schema::hasTable('orders')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('orders', function (Blueprint $table) {
                $table->id();
                $table->string('reference')->unique();          // ORD-2026-XXXXX
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('plan_code');                    // starter, pro, enterprise
                $table->string('period');                       // monthly, quarterly, yearly
                $table->integer('quantity_months');
                $table->decimal('amount', 15, 2);
                $table->string('currency', 3)->default('XOF');
                $table->decimal('amount_xof', 15, 2)->nullable(); // montant converti en FCFA
                $table->string('payment_method_type');
                $table->string('payment_method_provider')->nullable();
                $table->enum('status', [
                    'pending',
                    'awaiting_proof',
                    'proof_submitted',
                    'processing',
                    'paid',
                    'failed',
                    'cancelled',
                    'refunded',
                ])->default('pending');
                $table->boolean('is_renewal')->default(false);
                $table->string('coupon_code')->nullable();
                $table->decimal('discount_amount', 15, 2)->default(0);
                $table->string('idempotency_key')->unique();    // anti double-activation
                $table->timestamp('expires_at')->nullable();    // expiration 48h
                $table->timestamp('paid_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'status']);
                $table->index('reference');
                $table->index('expires_at');
                $table->index('idempotency_key');
            });
        }

        // =====================================================================
        // 3. Preuves de paiement
        // =====================================================================
        if (! Schema::hasTable('payment_proofs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('payment_proofs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('file_path');            // storage/app/private/payment-proofs/{hash}
                $table->string('file_hash');            // SHA-256 — détection des doublons
                $table->string('original_filename');
                $table->string('mime_type');
                $table->bigInteger('file_size');
                $table->string('transaction_reference')->nullable(); // numéro de transaction mobile money
                $table->text('notes')->nullable();
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('rejection_reason')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();

                $table->unique('file_hash'); // empêche les doublons absolus (même fichier soumis deux fois)
                $table->index(['order_id', 'status']);
            });
        }

        // =====================================================================
        // 4. Journal des webhooks (idempotence)
        // =====================================================================
        if (! Schema::hasTable('payment_webhook_logs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('payment_webhook_logs', function (Blueprint $table) {
                $table->id();
                $table->string('provider');                         // cinetpay, paystack, flutterwave, stripe
                $table->string('event_id')->unique();               // ID unique de l'événement (idempotence)
                $table->string('event_type');                       // payment.success, charge.completed, etc.
                $table->string('order_reference')->nullable();
                $table->decimal('amount_received', 15, 2)->nullable();
                $table->string('currency_received', 3)->nullable();
                $table->boolean('signature_valid')->default(false);
                $table->boolean('amount_matches')->default(false);
                $table->boolean('processed')->default(false);
                $table->text('raw_payload')->nullable();
                $table->text('error_message')->nullable();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();

                $table->index(['provider', 'event_id']);
                $table->index('order_reference');
                $table->index(['processed', 'created_at']);
            });
        }

        // =====================================================================
        // 5. Vouchers / Codes prépayés
        // =====================================================================
        if (! Schema::hasTable('vouchers')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('vouchers', function (Blueprint $table) {
                $table->id();
                $table->string('code', 32)->unique();           // format XXXX-XXXX-XXXX-XXXX
                $table->decimal('value', 15, 2);                // valeur en devise
                $table->string('currency', 3)->default('XOF');
                $table->string('batch_name')->nullable();        // nom du lot pour export CSV
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->foreignId('used_by_org')->nullable()->constrained('organizations')->nullOnDelete();
                $table->boolean('is_used')->default(false);
                $table->timestamp('used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();

                $table->index(['code', 'is_used']);
                $table->index('batch_name');
                $table->index('expires_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('payment_webhook_logs');
        Schema::dropIfExists('payment_proofs');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('payment_methods_config');
    }
};
