<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration 000093 — Module Comptabilité légère SECRETIS ERP
 *
 * Tables créées :
 *   clients, quotes, quote_items,
 *   invoices, invoice_items, payment_receipts,
 *   expense_categories, expenses
 *
 * Devise principale : FCFA (XOF) — les montants sont stockés en entiers (centimes)
 * ou en décimaux 15,2 selon la convention ERP.
 */
return new class extends Migration
{
    public function up(): void
    {
        // -----------------------------------------------------------------------
        // Clients comptables (peut différer du carnet d'adresses contacts)
        // -----------------------------------------------------------------------
        Schema::create('accounting_clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 30)->nullable();
            $table->text('address')->nullable();
            $table->string('tax_number', 60)->nullable()->comment('NIF / identifiant fiscal');
            $table->char('currency', 3)->default('XOF')->comment('ISO 4217');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['organization_id', 'is_active']);
            $table->index(['organization_id', 'name']);
        });

        // -----------------------------------------------------------------------
        // Devis
        // -----------------------------------------------------------------------
        Schema::create('quotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('accounting_clients')->cascadeOnDelete();
            $table->string('quote_number', 30)->unique();
            $table->string('title');
            $table->date('issue_date');
            $table->date('valid_until')->nullable();
            $table->enum('status', ['draft', 'sent', 'accepted', 'rejected', 'expired'])->default('draft');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(18.00)->comment('TVA % — 18% Côte d\'Ivoire par défaut');
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->text('terms')->nullable()->comment('Conditions générales / mentions');
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'client_id']);
            $table->index(['organization_id', 'issue_date']);
        });

        // -----------------------------------------------------------------------
        // Lignes de devis
        // -----------------------------------------------------------------------
        Schema::create('quote_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained('quotes')->cascadeOnDelete();
            $table->string('description');
            $table->decimal('quantity', 10, 3)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // -----------------------------------------------------------------------
        // Factures
        // -----------------------------------------------------------------------
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('accounting_clients')->cascadeOnDelete();
            $table->foreignId('quote_id')->nullable()->constrained('quotes')->nullOnDelete();
            $table->string('invoice_number', 30)->unique();
            $table->string('title');
            $table->date('issue_date');
            $table->date('due_date')->nullable();
            $table->enum('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled'])->default('draft');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(18.00);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('balance_due', 15, 2)->default(0);
            $table->date('payment_date')->nullable();
            $table->string('payment_method', 50)->nullable()
                ->comment('virement, mobile_money, especes, cheque, carte');
            $table->text('notes')->nullable();
            $table->text('terms')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'client_id']);
            $table->index(['organization_id', 'issue_date']);
            $table->index(['organization_id', 'due_date']);
        });

        // -----------------------------------------------------------------------
        // Lignes de facture
        // -----------------------------------------------------------------------
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('description');
            $table->decimal('quantity', 10, 3)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // -----------------------------------------------------------------------
        // Reçus de paiement
        // -----------------------------------------------------------------------
        Schema::create('payment_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->date('payment_date');
            $table->string('payment_method', 50);
            $table->string('reference', 100)->nullable()->comment('Référence virement / transaction');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['invoice_id']);
            $table->index(['organization_id', 'payment_date']);
        });

        // -----------------------------------------------------------------------
        // Catégories de dépenses
        // -----------------------------------------------------------------------
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 7)->default('#1A3A5C')->comment('Couleur hex');
            $table->string('icon', 50)->default('receipt')->comment('Nom icône lucide-react');
            $table->decimal('budget_monthly', 15, 2)->nullable()->comment('Budget mensuel FCFA');
            $table->timestamps();

            $table->index(['organization_id']);
        });

        // -----------------------------------------------------------------------
        // Dépenses
        // -----------------------------------------------------------------------
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('expense_categories');
            $table->string('title');
            $table->decimal('amount', 15, 2);
            $table->date('expense_date');
            $table->string('vendor', 150)->nullable()->comment('Fournisseur / prestataire');
            $table->string('receipt_path')->nullable()->comment('Chemin justificatif dans storage');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'category_id']);
            $table->index(['organization_id', 'expense_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('payment_receipts');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('quote_items');
        Schema::dropIfExists('quotes');
        Schema::dropIfExists('accounting_clients');
    }
};
