<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `users.first_name` et `users.last_name` deviennent facultatifs.
 *
 * La table porte TROIS colonnes de nom : `name`, `first_name` et `last_name`.
 * La migration d'origine déclare les deux dernières NOT NULL ; la production les
 * a relâchées à la main. Le code, lui, n'écrit que `name` — sur les sept
 * utilisateurs réels, quatre ont `first_name` à NULL.
 *
 * Tant que la contrainte tenait sur une base reconstruite, CRÉER LE MOINDRE
 * UTILISATEUR y était impossible : `User::create(['name' => …])` violait
 * `first_name`. Une installation neuve n'aurait donc pas pu enregistrer son
 * premier compte — et personne ne s'en serait aperçu avant la mise en service,
 * puisque la production, elle, fonctionne.
 *
 * On aligne la contrainte sur ce que le code fait réellement, plutôt que
 * d'aligner le code sur une contrainte que rien ne respecte. Les deux colonnes
 * restent : `displayName()` s'en sert quand elles sont renseignées.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTE — 75 AUTRES COLONNES sont dans le même cas : NOT NULL selon les
 * migrations, nullables en production, sans valeur par défaut. Elles ne sont
 * PAS traitées ici, et c'est délibéré. Pour la plupart la contrainte est juste
 * (`purchase_requests.organization_id` doit être obligatoire) et c'est la
 * production qui est laxiste ; les relâcher en bloc dégraderait le schéma pour
 * faire taire un écart. Chacune demande de savoir ce que le code y écrit
 * vraiment. La liste complète est produite par le script de comparaison de
 * nullabilité.
 */
return new class extends Migration
{
    private const COLONNES = ['first_name', 'last_name'];

    public function up(): void
    {
        foreach (self::COLONNES as $colonne) {
            if (! Schema::hasColumn('users', $colonne)) {
                continue;
            }

            // `DROP NOT NULL` est idempotent sous PostgreSQL : l'appliquer à une
            // colonne déjà nullable ne lève rien. La production traverse donc
            // cette migration sans effet, ce qui est le comportement voulu.
            DB::statement('ALTER TABLE users ALTER COLUMN "' . $colonne . '" DROP NOT NULL');
        }
    }

    public function down(): void
    {
        // Sans retour arrière : reposer la contrainte échouerait sur les
        // utilisateurs existants dont ces colonnes sont vides.
    }
};
