<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Deux manques révélés par le relevé des règles réelles de la zone franc.
 *
 * 1. **Les cotisations par TRANCHE.** L'IPRES sénégalaise prélève le régime
 *    général sur la tranche 0 → 432 000 FCFA et le régime cadre sur la tranche
 *    432 000 → 1 296 000. Un simple plafond ne sait pas exprimer « cette
 *    branche ne porte que sur la part du salaire comprise entre X et Y » :
 *    sans plancher, le régime cadre cotiserait depuis le premier franc.
 *
 * 2. **Le taux accidents du travail est propre à CHAQUE EMPLOYEUR.** En Côte
 *    d'Ivoire (2 à 5 %), au Sénégal (1, 3 ou 5 %) et au Bénin (1 à 4 %), il est
 *    notifié entreprise par entreprise selon le risque de l'activité. Le figer
 *    au niveau du pays produirait un montant faux pour la quasi-totalité des
 *    employeurs. Il lui faut donc une surcharge par organisation.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payroll_contribution_rules')
            && ! Schema::hasColumn('payroll_contribution_rules', 'monthly_floor')) {
            Schema::table('payroll_contribution_rules', function (Blueprint $table) {
                // Plancher de l'assiette : la branche ne porte que sur la part
                // du salaire AU-DESSUS de ce montant.
                $table->decimal('monthly_floor', 15, 2)->nullable()->after('basis');

                // Le taux est-il propre à l'employeur (accidents du travail) ?
                // Si oui, la valeur du référentiel n'est qu'un défaut indicatif.
                $table->boolean('employer_specific')->default(false)->after('monthly_ceiling');

                // Bornes admises quand le taux est propre à l'employeur, pour
                // refuser une saisie hors fourchette légale.
                $table->decimal('min_rate', 7, 4)->nullable()->after('employer_specific');
                $table->decimal('max_rate', 7, 4)->nullable()->after('min_rate');

                // Certaines cotisations sont forfaitaires (CMU ivoirienne :
                // 1 000 FCFA par mois et par personne), pas proportionnelles.
                $table->decimal('flat_amount', 15, 2)->nullable()->after('max_rate');
            });
        }

        // ── Surcharges par employeur ────────────────────────────────────────
        if (! Schema::hasTable('payroll_employer_rates')) {
            Schema::create('payroll_employer_rates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();

                $table->string('country_code', 2);
                $table->string('scheme_code', 20);
                $table->string('branch_code', 40);

                $table->decimal('employer_rate', 7, 4)->nullable();
                $table->decimal('employee_rate', 7, 4)->nullable();

                $table->date('effective_from');
                $table->date('effective_to')->nullable();

                // Référence de la notification de la caisse : c'est elle qui
                // fait foi en cas de contrôle.
                $table->string('source')->nullable();
                $table->text('notes')->nullable();

                $table->timestamps();

                $table->unique(
                    ['organization_id', 'scheme_code', 'branch_code', 'effective_from'],
                    'payroll_employer_rate_unique'
                );
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_employer_rates');

        if (Schema::hasTable('payroll_contribution_rules')) {
            Schema::table('payroll_contribution_rules', function (Blueprint $table) {
                foreach (['monthly_floor', 'employer_specific', 'min_rate', 'max_rate', 'flat_amount'] as $c) {
                    if (Schema::hasColumn('payroll_contribution_rules', $c)) {
                        $table->dropColumn($c);
                    }
                }
            });
        }
    }
};
