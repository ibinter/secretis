<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Appels d'offres (RFQ) — la migration 2026_01_01_000118_create_supplier_portal
 * est marquée comme exécutée mais s'est interrompue : rfqs / rfq_suppliers /
 * quotations n'ont jamais été créées (alors que suppliers, purchase_requests et
 * purchase_orders existent). Résultat : /achats/appels-offres en 500.
 * Définitions reprises à l'identique de la migration d'origine.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('rfqs')) {
            Schema::create('rfqs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id')->index();
                $table->string('rfq_number', 25)->unique();
                $table->string('title');
                $table->text('description')->nullable();
                $table->unsignedBigInteger('purchase_request_id')->nullable();
                $table->jsonb('items')->nullable();
                $table->dateTime('closing_date');
                $table->string('status', 20)->default('brouillon'); // brouillon|publie|clos|annule
                $table->unsignedBigInteger('selected_quotation_id')->nullable();
                $table->jsonb('evaluation_criteria')->nullable();
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['organization_id', 'status']);
            });
        }

        if (! Schema::hasTable('rfq_suppliers')) {
            Schema::create('rfq_suppliers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('rfq_id');
                $table->unsignedBigInteger('supplier_id');
                $table->timestamp('invited_at')->nullable();
                $table->timestamp('responded_at')->nullable();
                $table->string('status', 20)->default('invite'); // invite|repondu|refuse|selectionne|elimine
                $table->timestamps();

                $table->unique(['rfq_id', 'supplier_id']);
                $table->index('rfq_id');
                $table->index('supplier_id');
            });
        }

        if (! Schema::hasTable('quotations')) {
            Schema::create('quotations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('rfq_id');
                $table->unsignedBigInteger('supplier_id');
                $table->unsignedBigInteger('organization_id')->index();
                $table->string('quotation_number', 25)->unique();
                $table->jsonb('items')->nullable();
                $table->decimal('total_amount_xof', 15, 2)->default(0);
                $table->string('currency_code', 3)->default('XOF');
                $table->unsignedSmallInteger('validity_days')->default(30);
                $table->unsignedSmallInteger('delivery_days')->nullable();
                $table->string('payment_terms', 100)->nullable();
                $table->decimal('technical_score', 5, 2)->default(0);
                $table->decimal('financial_score', 5, 2)->default(0);
                $table->decimal('total_score', 5, 2)->default(0);
                $table->string('status', 20)->default('soumis'); // soumis|evalue|selectionne|rejete
                $table->text('notes')->nullable();
                $table->string('file_path')->nullable();
                $table->timestamp('submitted_at')->nullable();
                $table->timestamps();

                $table->index(['rfq_id', 'status']);
                $table->index('supplier_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('rfq_suppliers');
        Schema::dropIfExists('rfqs');
    }
};
