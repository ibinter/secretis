<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── partners ────────────────────────────────────────────────────────────
        if (! Schema::hasTable('partners')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('partners', function (Blueprint $table) {
                $table->id();

                $table->foreignId('user_id')
                      ->nullable()
                      ->constrained('users')
                      ->nullOnDelete();

                $table->string('company_name');
                $table->string('contact_name');
                $table->string('email')->unique();
                $table->string('phone', 30)->nullable();

                $table->string('country', 2)->comment('Code ISO 3166-1 alpha-2 (pays OHADA)');

                $table->enum('partner_type', [
                    'reseller',
                    'integrator',
                    'consultant',
                    'trainer',
                    'affiliate',
                ]);

                $table->enum('status', [
                    'pending',
                    'active',
                    'suspended',
                    'terminated',
                ])->default('pending');

                $table->decimal('commission_rate', 5, 2)->default(20.00);
                $table->string('referral_code', 12)->unique();

                $table->string('bank_name')->nullable();
                $table->string('bank_account')->nullable();
                $table->string('bank_iban')->nullable();

                $table->unsignedInteger('total_clients')->default(0);
                $table->decimal('total_revenue', 15, 2)->default(0);
                $table->decimal('total_commissions', 15, 2)->default(0);

                $table->text('notes')->nullable();

                $table->timestamp('approved_at')->nullable();
                $table->foreignId('approved_by')
                      ->nullable()
                      ->constrained('users')
                      ->nullOnDelete();

                $table->timestamps();
            });
        }

        // ─── partner_referrals ────────────────────────────────────────────────────
        if (! Schema::hasTable('partner_referrals')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('partner_referrals', function (Blueprint $table) {
                $table->id();

                $table->foreignId('partner_id')
                      ->constrained('partners')
                      ->cascadeOnDelete();

                $table->foreignId('organization_id')
                      ->constrained('organizations')
                      ->cascadeOnDelete();

                $table->timestamp('referred_at');
                $table->timestamp('converted_at')->nullable();

                $table->string('plan_name', 80);
                $table->decimal('monthly_amount', 10, 2);
                $table->decimal('commission_rate', 5, 2);

                $table->enum('status', ['pending', 'active', 'churned'])->default('pending');

                $table->timestamps();
            });
        }

        // ─── partner_commissions ─────────────────────────────────────────────────
        if (! Schema::hasTable('partner_commissions')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('partner_commissions', function (Blueprint $table) {
                $table->id();

                $table->foreignId('partner_id')
                      ->constrained('partners')
                      ->cascadeOnDelete();

                $table->foreignId('partner_referral_id')
                      ->constrained('partner_referrals')
                      ->cascadeOnDelete();

                $table->date('period_month')->comment('Premier jour du mois concerné');
                $table->decimal('amount', 10, 2);

                $table->enum('status', ['pending', 'approved', 'paid'])->default('pending');

                $table->timestamp('paid_at')->nullable();
                $table->string('payment_reference')->nullable();

                $table->timestamps();
            });
        }

        // ─── Colonne referral_code sur organizations ─────────────────────────────
        Schema::table('organizations', function (Blueprint $table) {
            $table->string('referral_code', 12)
                  ->nullable()
                  ->after('settings')
                  ->comment('Code partenaire utilisé lors de l\'inscription');
        });

        // ─── Index ───────────────────────────────────────────────────────────────
        Schema::table('partners', function (Blueprint $table) {
            $table->index(['status', 'partner_type']);
            $table->index('referral_code');
        });

        Schema::table('partner_referrals', function (Blueprint $table) {
            $table->index(['partner_id', 'status']);
        });

        Schema::table('partner_commissions', function (Blueprint $table) {
            $table->index(['partner_id', 'status', 'period_month']);
        });
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn('referral_code');
        });

        Schema::dropIfExists('partner_commissions');
        Schema::dropIfExists('partner_referrals');
        Schema::dropIfExists('partners');
    }
};
