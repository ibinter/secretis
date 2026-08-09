<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `licenses.ends_at` doit pouvoir être nul — pour DEMO et FREE, et pour eux seuls.
 *
 * DÉFAUT DE LA MIGRATION DU MODÈLE À SIX ÉTATS (2026_08_09_000001), révélé par
 * la base de recette et invisible jusque-là.
 *
 * Cette migration avait posé la contrainte `licenses_jamais_perpetuelle`, qui
 * exprime la règle exacte de la décision D5 :
 *
 *     etat IN ('DEMO','FREE') OR ends_at IS NOT NULL
 *
 * Mais la migration d'origine (2026_01_01_000004) déclare `ends_at` NOT NULL,
 * et je ne l'ai pas relâchée — parce que la production, elle, l'avait déjà
 * relâchée à la main. L'écart ne se voyait donc nulle part : le palier
 * Découverte fonctionnait en production et aurait été IMPOSSIBLE À CRÉER sur
 * toute base reconstruite, la colonne y refusant le nul.
 *
 * C'est exactement ce qu'une base de recette sert à trouver : un comportement
 * qui dépend de l'historique d'une base plutôt que de ce que le dépôt décrit.
 *
 * La contrainte CHECK reste la règle. Elle dit mieux ce qu'on veut que NOT NULL
 * ne le dirait : une licence PAYANTE sans date de fin reste refusée, un palier
 * gratuit sans échéance est accepté.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('licenses', 'ends_at')) {
            return;
        }

        // Idempotent sous PostgreSQL : sans effet sur une colonne déjà nullable,
        // donc sans effet en production.
        DB::statement('ALTER TABLE licenses ALTER COLUMN ends_at DROP NOT NULL');

        // On revérifie que le vrai garde-fou est bien en place : relâcher NOT
        // NULL sans lui ouvrirait la porte aux licences perpétuelles, que la
        // décision D5 interdit.
        $existe = DB::selectOne(
            "SELECT 1 AS ok FROM pg_constraint WHERE conname = ?",
            ['licenses_jamais_perpetuelle']
        );

        if (! $existe) {
            DB::statement("
                ALTER TABLE licenses
                ADD CONSTRAINT licenses_jamais_perpetuelle
                CHECK (etat IN ('DEMO', 'FREE') OR ends_at IS NOT NULL)
            ");
        }
    }

    public function down(): void
    {
        // Sans retour arrière : reposer NOT NULL rendrait le palier Découverte
        // impossible à créer.
    }
};
