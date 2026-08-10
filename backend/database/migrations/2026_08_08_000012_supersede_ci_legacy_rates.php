<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Retire les taux ivoiriens repris de l'ancien code, désormais remplacés.
 *
 * Ils avaient été déplacés tels quels depuis `SyscohadaService::calcCnps()`
 * pour ne pas changer le comportement. Un relevé documenté (CLEISS 2025) les
 * remplace : mêmes branches, mais avec les PLAFONDS d'assiette réels, et la
 * maternité distinguée des prestations familiales.
 *
 * Sans cette suppression, les deux jeux se cumuleraient : toutes les lignes
 * sont en vigueur à la même date, et le calcul additionne les branches.
 * La cotisation ivoirienne aurait été comptée deux fois.
 *
 * ⚠️ Conséquence à connaître : les montants patronaux BAISSENT nettement pour
 * les salaires supérieurs à 70 000 FCFA, puisque prestations familiales,
 * maternité et accidents du travail sont plafonnés à cette assiette — ce que
 * l'ancien calcul ignorait totalement.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_contribution_rules')) {
            return;
        }

        // Ne supprime QUE les lignes issues de l'ancien code, et seulement si
        // le jeu documenté est bien présent pour prendre le relais.
        $releveExiste = DB::table('payroll_contribution_rules')
            ->where('country_code', 'CI')
            ->where('source', 'like', 'CLEISS%')
            ->exists();

        if (! $releveExiste) {
            return;
        }

        DB::table('payroll_contribution_rules')
            ->where('country_code', 'CI')
            ->where('source', 'like', 'Repris de SyscohadaService%')
            ->where('is_verified', false)
            ->delete();
    }

    public function down(): void
    {
        // Rien : réintroduire les anciens taux sans plafond serait une régression.
    }
};
