<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Numérotation du registre du courrier — trois défauts en une seule fonction.
 *
 *  1. L'INDEX UNIQUE PORTAIT SUR `reference` SEULE, alors que la numérotation
 *     repart à 1 POUR CHAQUE ORGANISATION. L'organisation 4 occupe déjà
 *     `REF-ENTRANT-2026-00001` : les six autres ne peuvent donc pas enregistrer
 *     leur premier courrier entrant. Ce n'est pas un risque, c'est une panne
 *     en cours — masquée seulement par le fait qu'une seule organisation s'en
 *     sert aujourd'hui.
 *
 *  2. LE NUMÉRO VENAIT D'UN `count()` QUI IGNORAIT LES SUPPRIMÉS. Archiver un
 *     courrier faisait retomber le compte, et le suivant réutilisait un numéro
 *     déjà pris — violation de contrainte, donc erreur 500. Un registre dont
 *     les numéros se réemploient n'est de toute façon plus un registre : la
 *     référence sert précisément à désigner une pièce sans ambiguïté, y compris
 *     après son archivage.
 *
 *  3. LE COMPTAGE ÉTAIT SUJET À COURSE. Le code le savait — un commentaire
 *     signalait que `lockForUpdate()` ne s'applique pas à `count()` sous
 *     PostgreSQL — et s'en accommodait. Deux courriers enregistrés dans la même
 *     seconde obtenaient le même numéro.
 *
 * La table de compteurs ci-dessous répond aux trois : un numéro par
 * (organisation, type, année), attribué par `ON CONFLICT … RETURNING`, donc
 * sans lecture préalable, sans verrou explicite, et sans jamais revenir en
 * arrière quand une pièce est supprimée.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Compteurs ───────────────────────────────────────────────────────
        if (! Schema::hasTable('mail_registry_counters')) {
            Schema::create('mail_registry_counters', function (Blueprint $table) {
                $table->unsignedBigInteger('organization_id');
                $table->string('type', 20);          // incoming | outgoing
                $table->unsignedSmallInteger('year');
                // DERNIER numéro attribué, pas le nombre de pièces : la
                // différence est tout l'objet de la correction.
                $table->unsignedInteger('last_number')->default(0);
                $table->timestamps();

                $table->primary(['organization_id', 'type', 'year'], 'mail_registry_counters_pk');
            });
        }

        // ── Reprise de l'existant ───────────────────────────────────────────
        // On repart du plus grand numéro DÉJÀ ATTRIBUÉ, suppressions comprises,
        // et non du nombre de lignes : l'organisation 4 présente déjà un trou
        // (00004 absent entre 00003 et 00005). Compter aurait redonné un numéro
        // encore libre en apparence mais présent dans l'historique.
        DB::statement("
            INSERT INTO mail_registry_counters (organization_id, type, year, last_number, created_at, updated_at)
            SELECT organization_id,
                   type,
                   EXTRACT(YEAR FROM created_at)::smallint AS year,
                   MAX(COALESCE(NULLIF(regexp_replace(reference, '^.*-', ''), '')::int, 0)) AS last_number,
                   NOW(), NOW()
              FROM mail_registry
             -- Le motif est celui du registre, PAS « quelque chose suivi de
             -- chiffres » : une référence hors format (import, reprise, ligne
             -- de test) verrait son suffixe pris pour un numéro de séquence et
             -- propulserait le compteur. Constaté à la reprise — une ligne
             -- `TEST-DIRECT-8460` avait porté le compteur à 8460.
             WHERE reference ~ '^REF-(ENTRANT|SORTANT)-[0-9]{4}-[0-9]+$'
             GROUP BY organization_id, type, EXTRACT(YEAR FROM created_at)
            ON CONFLICT (organization_id, type, year) DO NOTHING
        ");

        // ── L'unicité devient celle qu'elle aurait dû être ──────────────────
        // Une référence identifie une pièce DANS un registre, et chaque
        // organisation tient le sien. L'unicité globale interdisait à deux
        // cabinets d'avoir chacun leur courrier n° 1.
        // L'unicité était posée comme CONTRAINTE, pas comme simple index :
        // PostgreSQL refuse alors `DROP INDEX` et demande de passer par la
        // contrainte. On tente les deux formes plutôt que de parier sur l'une —
        // le même schéma existe sous les deux selon la migration qui l'a créé.
        DB::statement('ALTER TABLE mail_registry DROP CONSTRAINT IF EXISTS mail_registry_reference_unique');
        DB::statement('DROP INDEX IF EXISTS mail_registry_reference_unique');

        DB::statement('
            CREATE UNIQUE INDEX mail_registry_reference_unique
            ON mail_registry (organization_id, reference)
        ');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE mail_registry DROP CONSTRAINT IF EXISTS mail_registry_reference_unique');
        DB::statement('DROP INDEX IF EXISTS mail_registry_reference_unique');

        // Le retour en arrière n'est possible que si aucune référence n'est
        // partagée entre organisations — c'est-à-dire tant que le défaut
        // corrigé ici n'a pas encore servi.
        DB::statement('CREATE UNIQUE INDEX mail_registry_reference_unique ON mail_registry (reference)');

        Schema::dropIfExists('mail_registry_counters');
    }
};
