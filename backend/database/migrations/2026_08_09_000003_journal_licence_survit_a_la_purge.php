<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Le journal des transitions doit SURVIVRE à la purge de l'espace.
 *
 * Défaut introduit par la migration 2026_08_09_000001 : `license_transitions`
 * était rendue non modifiable par un déclencheur refusant UPDATE **et DELETE**,
 * tout en portant une clé étrangère `ON DELETE CASCADE` vers `organizations`.
 *
 * Les deux règles se contredisent. La suppression d'une organisation déclenche
 * la cascade, la cascade déclenche le DELETE, le déclencheur le refuse : la
 * purge de la section 9.6 devenait IMPOSSIBLE — et avec elle la suppression de
 * n'importe quelle organisation, purge ou non. Constaté à la recette, pas
 * déduit : `DELETE FROM organizations WHERE id = 15` levait l'exception.
 *
 * La correction ne consiste pas à autoriser la suppression du journal. Un
 * journal d'audit qui disparaît avec ce qu'il documente ne prouve rien : la
 * section 9.6 exige précisément que la purge soit journalisée, ce qui n'a de
 * sens que si la trace lui survit. On retire donc les cascades : les colonnes
 * restent, sans contrainte référentielle, et le journal demeure après la purge.
 *
 * Même raisonnement pour `quota_hits`, la trace commerciale des butées de
 * plafond : elle documente un prospect, pas seulement un espace.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Le journal se détache de ce qu'il documente ──────────────────────
        foreach ([
            'license_transitions_license_id_foreign',
            'license_transitions_organization_id_foreign',
            'license_transitions_acteur_user_id_foreign',
        ] as $contrainte) {
            DB::statement("ALTER TABLE license_transitions DROP CONSTRAINT IF EXISTS {$contrainte}");
        }

        // Le déclencheur ne garde plus que ce qu'il doit garder : l'interdiction
        // de RÉÉCRIRE l'histoire. La suppression reste refusée à tout appelant
        // ordinaire — plus aucune cascade ne vient s'y heurter, puisqu'il n'y a
        // plus de cascade.
        DB::statement('DROP TRIGGER IF EXISTS license_transitions_immuable_trg ON license_transitions');
        DB::statement('
            CREATE TRIGGER license_transitions_immuable_trg
            BEFORE UPDATE OR DELETE ON license_transitions
            FOR EACH ROW EXECUTE FUNCTION license_transitions_immuable()
        ');

        // ── Les butées de plafond survivent aussi ───────────────────────────
        DB::statement('ALTER TABLE quota_hits DROP CONSTRAINT IF EXISTS quota_hits_organization_id_foreign');
        DB::statement('ALTER TABLE quota_hits DROP CONSTRAINT IF EXISTS quota_hits_user_id_foreign');

        // ── Une purge légitime doit pouvoir passer ──────────────────────────
        // La commande de purge (section 9.6) journalise, sauvegarde à froid,
        // puis supprime. Elle a besoin d'une porte, et d'une seule : un
        // paramètre de session que seule elle positionne. Un simple `DELETE`
        // depuis une console ou un appel applicatif reste refusé.
        DB::statement("
            CREATE OR REPLACE FUNCTION license_transitions_immuable() RETURNS trigger AS \$\$
            BEGIN
                IF TG_OP = 'DELETE'
                   AND current_setting('secretis.purge_autorisee', true) = 'oui' THEN
                    RETURN OLD;
                END IF;

                RAISE EXCEPTION
                    'Le journal des transitions de licence n''est pas modifiable. '
                    'La purge doit passer par la commande dédiée, qui journalise et sauvegarde avant de supprimer.';
            END;
            \$\$ LANGUAGE plpgsql
        ");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE license_transitions ADD CONSTRAINT license_transitions_organization_id_foreign
                       FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE');
        DB::statement('ALTER TABLE quota_hits ADD CONSTRAINT quota_hits_organization_id_foreign
                       FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE');
    }
};
