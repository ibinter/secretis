<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reprise du seul jeu de règles que le code portait déjà : la Côte d'Ivoire.
 *
 * Ces taux ne sont PAS une nouveauté — ils étaient codés en dur dans
 * `SyscohadaService::calcCnps()` (patronale 15,45 %, salariale 6,3 %). On les
 * déplace tels quels dans le référentiel pour que le comportement ivoirien
 * reste identique, et on les marque `is_verified = false` : ils proviennent d'un
 * commentaire de code, pas d'un texte officiel vérifié. Tant que la RH ne les a
 * pas confirmés, tout calcul qui s'y appuie le signale.
 *
 * AUCUN autre pays n'est semé ici, délibérément. La base compte des clients
 * sénégalais (IPRES + CSS) et béninois (CNSS), dont les caisses, taux et
 * plafonds diffèrent. Inventer leurs chiffres produirait des déclarations
 * fausses — exactement le défaut que ce référentiel corrige. Pour ces pays, le
 * calcul refuse désormais de s'exécuter et réclame un paramétrage.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_contribution_rules')) {
            return;
        }

        if (DB::table('payroll_contribution_rules')->where('country_code', 'CI')->exists()) {
            return;
        }

        $maintenant = now();
        $source = 'Repris de SyscohadaService::calcCnps() — à confirmer sur texte CNPS en vigueur';

        DB::table('payroll_contribution_rules')->insert([
            [
                'country_code'   => 'CI',
                'scheme_code'    => 'CNPS',
                'scheme_name'    => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'    => 'retraite',
                'branch_label'   => 'Retraite',
                'employer_rate'  => 7.7000,
                'employee_rate'  => 6.3000,
                'basis'          => 'gross_salary',
                'monthly_ceiling'=> null,
                'currency'       => 'XOF',
                'effective_from' => '2026-01-01',
                'effective_to'   => null,
                'source'         => $source,
                'is_verified'    => false,
                'notes'          => 'Plafond de retraite non renseigné : à compléter avant usage en déclaration.',
                'created_at'     => $maintenant,
                'updated_at'     => $maintenant,
            ],
            [
                'country_code'   => 'CI',
                'scheme_code'    => 'CNPS',
                'scheme_name'    => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'    => 'prestations_familiales',
                'branch_label'   => 'Prestations familiales',
                'employer_rate'  => 5.7500,
                'employee_rate'  => 0.0000,
                'basis'          => 'gross_salary',
                'monthly_ceiling'=> null,
                'currency'       => 'XOF',
                'effective_from' => '2026-01-01',
                'effective_to'   => null,
                'source'         => $source,
                'is_verified'    => false,
                'notes'          => null,
                'created_at'     => $maintenant,
                'updated_at'     => $maintenant,
            ],
            [
                'country_code'   => 'CI',
                'scheme_code'    => 'CNPS',
                'scheme_name'    => 'Caisse Nationale de Prévoyance Sociale',
                'branch_code'    => 'accidents_travail',
                'branch_label'   => 'Accidents du travail',
                // Le taux réel dépend du risque de l'activité (2 à 5 %).
                // On retient 2 %, valeur qui reconstitue EXACTEMENT le total
                // patronal de 15,45 % qu'appliquait l'ancien code : son
                // commentaire annonçait « 7,7 + 5,75 + 1 % » (soit 14,45 %),
                // en contradiction avec sa propre constante 0.1545. C'est
                // l'annotation qui était fausse, pas le calcul.
                'employer_rate'  => 2.0000,
                'employee_rate'  => 0.0000,
                'basis'          => 'gross_salary',
                'monthly_ceiling'=> null,
                'currency'       => 'XOF',
                'effective_from' => '2026-01-01',
                'effective_to'   => null,
                'source'         => $source,
                'is_verified'    => false,
                'notes'          => "Taux variable selon le risque de l'activité (2 à 5 %) : "
                                  . "à ajuster entreprise par entreprise. 2 % reproduit le total de 15,45 % "
                                  . "appliqué jusqu'ici.",
                'created_at'     => $maintenant,
                'updated_at'     => $maintenant,
            ],
        ]);
    }

    public function down(): void
    {
        if (Schema::hasTable('payroll_contribution_rules')) {
            DB::table('payroll_contribution_rules')
                ->where('country_code', 'CI')
                ->where('source', 'like', 'Repris de SyscohadaService%')
                ->delete();
        }
    }
};
