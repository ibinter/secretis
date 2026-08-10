<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bulletins de paie — périodes, rubriques, bulletins et lignes.
 *
 * Le socle RH portait `employees.base_salary` mais rien pour produire un
 * bulletin : ni période, ni rubrique, ni historique. La paie était le dernier
 * grand manque de l'ERP.
 *
 * Trois principes ont guidé le schéma :
 *
 *  1. **Un bulletin est un document figé.** Une fois la période clôturée, ses
 *     montants ne doivent plus bouger, même si un taux change ou si le salaire
 *     de l'employé est modifié ensuite. Les lignes stockent donc les montants
 *     CALCULÉS, jamais une formule à réévaluer.
 *  2. **Chaque ligne dit d'où elle vient.** `rule_reference` conserve la branche
 *     de cotisation ou la tranche d'impôt appliquée : un bulletin contesté doit
 *     pouvoir être reconstitué trois ans plus tard.
 *  3. **La devise et le pays sont portés par le bulletin**, pas déduits au
 *     moment de l'affichage : SECRETIS sert 14 pays de la zone franc, et une
 *     organisation peut changer de paramétrage sans réécrire son historique.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Périodes de paie ────────────────────────────────────────────────
        if (! Schema::hasTable('payroll_periods')) {
            Schema::create('payroll_periods', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

                $table->unsignedSmallInteger('year');
                $table->unsignedTinyInteger('month');
                $table->string('label');                 // « Août 2026 »

                $table->date('period_start');
                $table->date('period_end');
                $table->date('payment_date')->nullable();

                // draft : modifiable — closed : figé — paid : réglé
                $table->string('status', 20)->default('draft');

                // Pays et devise au moment de la clôture : l'historique ne doit
                // pas se réinterpréter si l'organisation est reparamétrée.
                $table->string('country_code', 2)->nullable();
                $table->string('currency', 3)->nullable();

                $table->decimal('total_gross', 15, 2)->default(0);
                $table->decimal('total_employee_contributions', 15, 2)->default(0);
                $table->decimal('total_employer_contributions', 15, 2)->default(0);
                $table->decimal('total_income_tax', 15, 2)->default(0);
                $table->decimal('total_net', 15, 2)->default(0);

                $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('closed_at')->nullable();
                $table->text('notes')->nullable();

                $table->timestamps();

                $table->unique(['organization_id', 'year', 'month']);
                $table->index(['organization_id', 'status']);
            });
        }

        // ── Rubriques de paie (primes, indemnités, retenues) ────────────────
        if (! Schema::hasTable('payroll_components')) {
            Schema::create('payroll_components', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

                $table->string('code', 30);
                $table->string('label');
                // earning : s'ajoute au brut — deduction : se retranche du net
                $table->string('type', 20)->default('earning');

                // Une prime de transport peut être exonérée de cotisations et
                // d'impôt : ces deux drapeaux décident de l'assiette.
                $table->boolean('subject_to_contributions')->default(true);
                $table->boolean('subject_to_income_tax')->default(true);

                // Montant fixe OU pourcentage du salaire de base.
                $table->decimal('default_amount', 15, 2)->nullable();
                $table->decimal('percentage_of_base', 7, 4)->nullable();

                $table->boolean('is_active')->default(true);
                $table->unsignedSmallInteger('display_order')->default(0);
                $table->text('notes')->nullable();

                $table->timestamps();

                $table->unique(['organization_id', 'code']);
            });
        }

        // ── Bulletins ───────────────────────────────────────────────────────
        if (! Schema::hasTable('payslips')) {
            Schema::create('payslips', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('payroll_period_id')->constrained('payroll_periods')->cascadeOnDelete();
                $table->foreignId('employee_id')->constrained()->cascadeOnDelete();

                $table->string('reference')->nullable();

                // Identité de l'employé figée au moment du calcul : un bulletin
                // doit rester lisible même si la fiche est modifiée depuis.
                $table->string('employee_name');
                $table->string('employee_position')->nullable();
                $table->string('social_security_number')->nullable();
                $table->date('hire_date')->nullable();

                $table->string('country_code', 2);
                $table->string('currency', 3);

                $table->decimal('base_salary', 15, 2)->default(0);
                $table->decimal('gross_salary', 15, 2)->default(0);
                $table->decimal('contribution_base', 15, 2)->default(0);
                $table->decimal('taxable_base', 15, 2)->default(0);

                $table->decimal('employee_contributions', 15, 2)->default(0);
                $table->decimal('employer_contributions', 15, 2)->default(0);
                $table->decimal('income_tax', 15, 2)->default(0);
                $table->decimal('other_deductions', 15, 2)->default(0);
                $table->decimal('net_salary', 15, 2)->default(0);

                // Faux si une règle appliquée n'était pas confirmée sur texte :
                // le bulletin le porte visiblement.
                $table->boolean('rules_verified')->default(false);

                $table->string('status', 20)->default('draft');
                $table->timestamps();

                $table->unique(['payroll_period_id', 'employee_id']);
                $table->index(['organization_id', 'status']);
            });
        }

        // ── Lignes de bulletin ──────────────────────────────────────────────
        if (! Schema::hasTable('payslip_lines')) {
            Schema::create('payslip_lines', function (Blueprint $table) {
                $table->id();
                $table->foreignId('payslip_id')->constrained('payslips')->cascadeOnDelete();

                // earning | contribution | tax | deduction | employer_contribution
                $table->string('category', 30);
                $table->string('code', 40)->nullable();
                $table->string('label');

                $table->decimal('base', 15, 2)->nullable();   // assiette
                $table->decimal('rate', 7, 4)->nullable();    // taux appliqué
                $table->decimal('amount', 15, 2)->default(0);

                // D'où vient cette ligne : « CNPS/retraite », « ITS/tranche 3 »…
                // Sans cette trace, un bulletin contesté est indéfendable.
                $table->string('rule_reference')->nullable();
                $table->boolean('is_verified_rule')->default(false);

                $table->unsignedSmallInteger('display_order')->default(0);

                $table->timestamps();

                $table->index(['payslip_id', 'category']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payslip_lines');
        Schema::dropIfExists('payslips');
        Schema::dropIfExists('payroll_components');
        Schema::dropIfExists('payroll_periods');
    }
};
