<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration 000110 — Comptabilité générale SYSCOHADA
 *
 * Tables créées :
 *   fiscal_years, chart_of_accounts, journal_entries, journal_lines,
 *   tax_declarations, bank_reconciliations
 *
 * Norme : SYSCOHADA Révisé 2017 (OHADA)
 * Devise principale : XOF (FCFA) — montants en décimal 15,2
 */
return new class extends Migration
{
    public function up(): void
    {
        // -----------------------------------------------------------------------
        // Exercices fiscaux
        // -----------------------------------------------------------------------
        if (! Schema::hasTable('fiscal_years')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('fiscal_years', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->string('name', 60)->comment('Ex : "Exercice 2026"');
                $table->date('start_date');
                $table->date('end_date');
                $table->enum('status', ['open', 'closing', 'closed'])->default('open');
                $table->foreignId('created_by')->constrained('users');
                $table->timestamp('closed_at')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'status']);
                $table->unique(['organization_id', 'name']);
            });
        }

        // -----------------------------------------------------------------------
        // Plan comptable SYSCOHADA
        // -----------------------------------------------------------------------
        if (! Schema::hasTable('chart_of_accounts')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('chart_of_accounts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->string('account_number', 10);
                $table->string('account_name', 200);
                $table->enum('account_type', [
                    'actif', 'passif', 'charge', 'produit', 'capitaux',
                ]);
                $table->string('parent_account_number', 10)->nullable();
                $table->boolean('is_system')->default(false)
                    ->comment('Compte SYSCOHADA officiel (non modifiable)');
                $table->tinyInteger('ohada_class')
                    ->comment('Classe SYSCOHADA 1–9');
                $table->boolean('is_leaf')->default(true)
                    ->comment('true = peut recevoir des écritures directes');
                $table->char('currency_code', 3)->default('XOF');
                $table->timestamps();

                $table->unique(['organization_id', 'account_number']);
                $table->index(['organization_id', 'ohada_class']);
                $table->index(['organization_id', 'account_type']);
                $table->index(['organization_id', 'is_leaf']);
            });
        }

        // -----------------------------------------------------------------------
        // En-têtes d'écritures comptables
        // -----------------------------------------------------------------------
        if (! Schema::hasTable('journal_entries')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('journal_entries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->string('entry_number', 20)->unique()
                    ->comment('Format JNL-YYYY-XXXXX, auto-généré');
                $table->date('entry_date');
                $table->string('description', 500);
                $table->string('reference', 100)->nullable()
                    ->comment('Numéro pièce externe (facture, bordereau…)');
                $table->enum('journal_type', [
                    'AN', // À-nouveaux
                    'OD', // Opérations diverses
                    'VE', // Ventes
                    'AC', // Achats
                    'BQ', // Banque
                    'SA', // Salaires
                    'CA', // Caisse
                ])->default('OD');
                $table->boolean('is_locked')->default(false)
                    ->comment('Écriture validée = verrouillée');
                $table->foreignId('fiscal_year_id')->nullable()->constrained('fiscal_years')->nullOnDelete();
                $table->foreignId('created_by')->constrained('users');
                $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('validated_at')->nullable();
                $table->timestamps();

                $table->index(['organization_id', 'entry_date']);
                $table->index(['organization_id', 'journal_type']);
                $table->index(['organization_id', 'is_locked']);
                $table->index(['organization_id', 'fiscal_year_id']);
            });
        }

        // -----------------------------------------------------------------------
        // Lignes d'écritures comptables
        // -----------------------------------------------------------------------
        if (! Schema::hasTable('journal_lines')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('journal_lines', function (Blueprint $table) {
                $table->id();
                $table->foreignId('journal_entry_id')->constrained('journal_entries')->cascadeOnDelete();
                $table->string('account_number', 10);
                $table->decimal('debit_amount', 15, 2)->default(0);
                $table->decimal('credit_amount', 15, 2)->default(0);
                $table->string('description', 500)->nullable();
                $table->string('analytic_code', 30)->nullable()
                    ->comment('Code analytique / centre de coût');
                $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
                $table->char('currency_code', 3)->default('XOF');
                $table->decimal('exchange_rate', 10, 6)->default(1.000000)
                    ->comment('Taux vs XOF pour devises étrangères');
                $table->string('lettering_code', 10)->nullable()
                    ->comment('Lettrage rapprochement (ex: AA, AB…)');
                $table->timestamps();

                $table->index(['journal_entry_id']);
                $table->index(['account_number']);
                $table->index(['lettering_code']);
            });
        }

        // -----------------------------------------------------------------------
        // Déclarations fiscales
        // -----------------------------------------------------------------------
        if (! Schema::hasTable('tax_declarations')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('tax_declarations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('fiscal_year_id')->nullable()->constrained('fiscal_years')->nullOnDelete();
                $table->enum('declaration_type', [
                    'TVA',     // Taxe sur la valeur ajoutée
                    'IS',      // Impôt sur les sociétés
                    'PATENTE', // Patente / contribution forfaitaire
                    'CNPS',    // Cotisations sociales CNPS / CAISSS
                ]);
                $table->date('period_start');
                $table->date('period_end');
                $table->decimal('base_amount', 15, 2)->default(0)
                    ->comment('Base imposable');
                $table->decimal('tax_rate', 6, 4)->default(0)
                    ->comment('Taux applicable (ex : 0.18 pour 18%)');
                $table->decimal('tax_amount', 15, 2)->default(0)
                    ->comment('Montant impôt calculé');
                $table->decimal('tax_credit', 15, 2)->default(0)
                    ->comment('TVA déductible / crédit');
                $table->decimal('net_tax', 15, 2)->default(0)
                    ->comment('Tax_amount - tax_credit');
                $table->enum('status', [
                    'draft',      // Brouillon
                    'submitted',  // Soumis à l'administration
                    'paid',       // Payé
                ])->default('draft');
                $table->timestamp('submitted_at')->nullable();
                $table->string('reference_number', 60)->nullable()
                    ->comment('Référence dépôt administration fiscale');
                $table->json('breakdown')->nullable()
                    ->comment('Détail calcul (JSON)');
                $table->foreignId('created_by')->constrained('users');
                $table->timestamps();

                $table->index(['organization_id', 'declaration_type']);
                $table->index(['organization_id', 'period_start', 'period_end']);
                $table->index(['organization_id', 'status']);
            });
        }

        // -----------------------------------------------------------------------
        // Rapprochements bancaires
        // -----------------------------------------------------------------------
        if (! Schema::hasTable('bank_reconciliations')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('bank_reconciliations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->string('bank_account_id', 30)
                    ->comment('Identifiant compte bancaire (numéro ou libellé)');
                $table->string('bank_account_number', 10)->nullable()
                    ->comment('Compte SYSCOHADA (ex : 521)');
                $table->date('reconciliation_date');
                $table->decimal('balance_bank_statement', 15, 2)->default(0)
                    ->comment('Solde selon relevé bancaire');
                $table->decimal('balance_accounting', 15, 2)->default(0)
                    ->comment('Solde selon comptabilité');
                $table->decimal('difference', 15, 2)->default(0)
                    ->comment('Écart (doit être 0 après rapprochement)');
                $table->enum('status', ['in_progress', 'reconciled'])->default('in_progress');
                $table->json('lines')->nullable()
                    ->comment('Lignes de rapprochement (JSONB)');
                $table->foreignId('created_by')->constrained('users');
                $table->timestamps();

                $table->index(['organization_id', 'bank_account_number']);
                $table->index(['organization_id', 'reconciliation_date']);
                $table->index(['organization_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_reconciliations');
        Schema::dropIfExists('tax_declarations');
        Schema::dropIfExists('journal_lines');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('chart_of_accounts');
        Schema::dropIfExists('fiscal_years');
    }
};
