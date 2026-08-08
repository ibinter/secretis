<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rectifie le taux « accidents du travail » de la Côte d'Ivoire.
 *
 * La migration de reprise avait retenu 1 %, valeur lue dans l'annotation de
 * l'ancien code (« 7,7 + 5,75 + 1 % »). Or cette annotation contredisait la
 * constante que le même code appliquait réellement : 0.1545, soit 15,45 %.
 * Avec 7,7 % de retraite et 5,75 % de prestations familiales, le complément
 * est de 2 % — valeur cohérente avec la fourchette 2 à 5 % que mentionnait la
 * ligne précédente. Retenir 1 % aurait changé le montant patronal d'un point
 * de pourcentage sans que personne ne l'ait demandé.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payroll_contribution_rules')) {
            return;
        }

        DB::table('payroll_contribution_rules')
            ->where('country_code', 'CI')
            ->where('branch_code', 'accidents_travail')
            ->where('employer_rate', 1.0)
            ->update([
                'employer_rate' => 2.0,
                'notes'         => "Taux variable selon le risque de l'activité (2 à 5 %) : à ajuster "
                                 . "entreprise par entreprise. 2 % reproduit le total patronal de 15,45 % "
                                 . "appliqué jusqu'ici.",
                'updated_at'    => now(),
            ]);
    }

    public function down(): void
    {
        // Rien : rétablir 1 % réintroduirait l'erreur.
    }
};
