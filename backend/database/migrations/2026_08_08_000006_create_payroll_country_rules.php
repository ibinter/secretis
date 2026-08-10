<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel des règles sociales et fiscales, PAR PAYS et PAR DATE D'EFFET.
 *
 * SECRETIS n'est pas déployé dans un seul pays : la base compte déjà des
 * organisations en Côte d'Ivoire, au Sénégal et au Bénin, et le référentiel des
 * devises couvre l'UEMOA, la CEMAC, le Ghana, le Nigeria, le Kenya, le Maroc,
 * l'Afrique du Sud et la zone euro.
 *
 * Or `SyscohadaService::calcCnps()` appliquait **les taux CNPS ivoiriens à
 * toutes les organisations, sans distinction** : la déclaration sociale d'un
 * client sénégalais (IPRES + CSS) ou béninois (CNSS) était silencieusement
 * fausse. Un taux statutaire codé en dur est une bombe à retardement : il change
 * chaque année, et il diffère à chaque frontière.
 *
 * Ces deux tables portent donc la matière légale comme DONNÉE :
 *  - `payroll_contribution_rules` : cotisations sociales (part patronale et
 *    salariale, assiette, plafond) ;
 *  - `payroll_tax_brackets` : barèmes progressifs d'impôt sur les salaires.
 *
 * `is_verified` distingue une règle confirmée sur texte officiel d'une règle
 * reprise telle quelle de l'ancien code : un calcul appuyé sur des règles non
 * vérifiées doit le signaler à l'utilisateur, jamais le taire.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_contribution_rules')) {
            Schema::create('payroll_contribution_rules', function (Blueprint $table) {
                $table->id();

                // ISO 3166-1 alpha-2, aligné sur `organizations.country`.
                $table->string('country_code', 2);

                // Caisse : CNPS, IPRES, CSS, CNSS, NSITF…
                $table->string('scheme_code', 20);
                $table->string('scheme_name');
                // Branche : retraite, prestations familiales, accidents du travail…
                $table->string('branch_code', 40);
                $table->string('branch_label');

                $table->decimal('employer_rate', 7, 4)->default(0);
                $table->decimal('employee_rate', 7, 4)->default(0);

                // Assiette : salaire brut, ou brut plafonné.
                $table->string('basis', 30)->default('gross_salary');
                // Plafond mensuel exprimé dans la devise du pays (null = pas de plafond).
                $table->decimal('monthly_ceiling', 15, 2)->nullable();
                $table->string('currency', 3)->nullable();

                // Un taux n'a de sens qu'entre deux dates : les lois changent.
                $table->date('effective_from');
                $table->date('effective_to')->nullable();

                // Référence du texte officiel, pour qu'un contrôle soit possible.
                $table->string('source')->nullable();
                $table->boolean('is_verified')->default(false);
                $table->text('notes')->nullable();

                $table->timestamps();

                $table->index(['country_code', 'effective_from']);
                $table->unique(['country_code', 'scheme_code', 'branch_code', 'effective_from'], 'payroll_contrib_unique');
            });
        }

        if (! Schema::hasTable('payroll_tax_brackets')) {
            Schema::create('payroll_tax_brackets', function (Blueprint $table) {
                $table->id();

                $table->string('country_code', 2);
                // ITS (CI), IRPP, IR (MA), PAYE (anglophone)…
                $table->string('tax_code', 20);
                $table->string('tax_name');

                // Bornes de la tranche, dans la devise du pays.
                $table->decimal('lower_bound', 15, 2)->default(0);
                $table->decimal('upper_bound', 15, 2)->nullable(); // null = tranche supérieure
                $table->decimal('rate', 7, 4);
                // Abattement ou somme forfaitaire à retrancher sur la tranche.
                $table->decimal('fixed_deduction', 15, 2)->default(0);

                $table->string('currency', 3)->nullable();
                // Mensuel ou annuel : les barèmes ne se lisent pas à la même maille.
                $table->string('period', 10)->default('monthly');

                $table->date('effective_from');
                $table->date('effective_to')->nullable();

                $table->string('source')->nullable();
                $table->boolean('is_verified')->default(false);
                $table->text('notes')->nullable();

                $table->timestamps();

                $table->index(['country_code', 'tax_code', 'effective_from']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_tax_brackets');
        Schema::dropIfExists('payroll_contribution_rules');
    }
};
