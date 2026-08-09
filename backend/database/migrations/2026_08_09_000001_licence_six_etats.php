<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Modèle de licence à six états — cahier IBIG SOFT v1.1, sections 2 et 9.
 *
 * L'existant portait CINQ statuts (trial, active, suspended, expired,
 * cancelled) : ni palier gratuit, ni démo publique. Un essai arrivé à terme
 * n'avait donc nulle part où basculer, et la décision D6 — « on ne coupe pas et
 * on ne supprime rien » — était inapplicable.
 *
 * On étend la table existante plutôt que d'en créer une seconde en français :
 * `licenses` porte 8 lignes en production, et deux tables homonymes finiraient
 * par diverger. La correspondance est documentée dans licence.config.json.
 *
 * La colonne `status` est CONSERVÉE, non supprimée : du code non encore repris
 * la lit encore. Un déclencheur la maintient alignée sur `etat` pour que les
 * deux ne puissent pas se contredire pendant la transition.
 */
return new class extends Migration
{
    private const ETATS = ['DEMO', 'FREE', 'TRIAL', 'ACTIVE', 'GRACE', 'EXPIRED'];

    public function up(): void
    {
        Schema::table('licenses', function (Blueprint $table) {
            if (! Schema::hasColumn('licenses', 'etat')) {
                $table->string('etat', 10)->nullable()->after('status');
                $table->index(['etat', 'ends_at']);
            }
            if (! Schema::hasColumn('licenses', 'solution')) {
                // Le moteur est commun aux 14 solutions du catalogue : la clé
                // doit dire de quel produit elle relève, y compris on-premise.
                $table->string('solution', 32)->nullable()->after('etat');
            }
            if (! Schema::hasColumn('licenses', 'cle_licence')) {
                $table->string('cle_licence', 64)->nullable()->unique()->after('solution');
            }
            if (! Schema::hasColumn('licenses', 'date_purge')) {
                $table->timestamp('date_purge')->nullable()->after('grace_until');
            }
            if (! Schema::hasColumn('licenses', 'origine')) {
                // inscription | essai | paiement | migration
                $table->string('origine', 20)->nullable()->after('etat');
            }
            if (! Schema::hasColumn('licenses', 'prolongation_faite')) {
                $table->boolean('prolongation_faite')->default(false)->after('date_purge');
                $table->timestamp('prolongation_le')->nullable()->after('prolongation_faite');
                $table->string('prolongation_motif')->nullable()->after('prolongation_le');
            }
        });

        // ── Reprise des licences existantes ─────────────────────────────────
        // Chaque ligne reçoit son état à partir du statut historique. Sans
        // cela, 8 organisations en production se retrouveraient sans état, donc
        // traitées comme EXPIRED au premier calcul — un blocage en écriture de
        // clients payants.
        DB::statement("
            UPDATE licenses SET
                etat = CASE
                    WHEN status = 'trial'                          THEN 'TRIAL'
                    WHEN status = 'active'                         THEN 'ACTIVE'
                    WHEN status = 'suspended'                      THEN 'GRACE'
                    WHEN status IN ('expired', 'cancelled')        THEN 'EXPIRED'
                    ELSE 'ACTIVE'
                END,
                solution = COALESCE(solution, 'secretis'),
                origine  = COALESCE(origine, 'migration')
            WHERE etat IS NULL
        ");

        // Aucune licence perpétuelle (décision D5) : toute clé sans date de fin
        // en reçoit une. Les états DEMO et FREE sont les seuls à en être
        // dispensés, et aucune ligne existante n'est dans ces états.
        DB::statement("
            UPDATE licenses
               SET ends_at = COALESCE(ends_at, created_at + interval '1 year')
             WHERE ends_at IS NULL
               AND etat NOT IN ('DEMO', 'FREE')
        ");

        // Grâce et purge dérivées de la date de fin, jamais saisies.
        DB::statement("
            UPDATE licenses
               SET grace_until = COALESCE(grace_until, ends_at + interval '7 days'),
                   date_purge  = COALESCE(date_purge,  ends_at + interval '7 days' + interval '90 days')
             WHERE ends_at IS NOT NULL
        ");

        // ── Garde-fou : aucune clé sans date de fin ─────────────────────────
        // La règle D5 est trop importante pour dépendre de la discipline des
        // appelants. Une contrainte la rend structurellement impossible à
        // violer, y compris par un INSERT direct en base.
        DB::statement("
            ALTER TABLE licenses
            ADD CONSTRAINT licenses_jamais_perpetuelle
            CHECK (etat IN ('DEMO', 'FREE') OR ends_at IS NOT NULL)
            NOT VALID
        ");
        DB::statement('ALTER TABLE licenses VALIDATE CONSTRAINT licenses_jamais_perpetuelle');

        DB::statement(
            "ALTER TABLE licenses ADD CONSTRAINT licenses_etat_valide
             CHECK (etat IS NULL OR etat IN ('" . implode("','", self::ETATS) . "'))"
        );

        // ── Alignement de l'ancienne colonne ────────────────────────────────
        // Tant que du code lit `status`, les deux colonnes doivent dire la même
        // chose. Un déclencheur le garantit sans exiger que chaque appelant y
        // pense — c'est exactement le genre d'oubli qui produit un client
        // affiché actif d'un côté et expiré de l'autre.
        DB::statement("
            CREATE OR REPLACE FUNCTION licenses_sync_status() RETURNS trigger AS \$\$
            BEGIN
                IF NEW.etat IS NOT NULL THEN
                    NEW.status := CASE NEW.etat
                        WHEN 'DEMO'    THEN 'trial'
                        WHEN 'FREE'    THEN 'active'
                        WHEN 'TRIAL'   THEN 'trial'
                        WHEN 'ACTIVE'  THEN 'active'
                        WHEN 'GRACE'   THEN 'suspended'
                        WHEN 'EXPIRED' THEN 'expired'
                        ELSE NEW.status
                    END;
                END IF;
                RETURN NEW;
            END;
            \$\$ LANGUAGE plpgsql
        ");

        DB::statement('DROP TRIGGER IF EXISTS licenses_sync_status_trg ON licenses');
        DB::statement('
            CREATE TRIGGER licenses_sync_status_trg
            BEFORE INSERT OR UPDATE ON licenses
            FOR EACH ROW EXECUTE FUNCTION licenses_sync_status()
        ');

        // ── Compteurs d'usage (section 9.2) ─────────────────────────────────
        if (! Schema::hasTable('quotas_usage')) {
            Schema::create('quotas_usage', function (Blueprint $table) {
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('solution', 32)->default('secretis');
                $table->string('compteur', 32);
                // 'YYYY-MM' pour un flux mensuel, 'total' pour un stock.
                // Un compteur cumulatif ne se remet jamais à zéro : c'est ce
                // qui distingue « 5 courriers par mois » de « 3 lots ».
                $table->char('periode', 7)->default('total');
                $table->unsignedInteger('valeur')->default(0);
                $table->timestamps();

                $table->primary(['organization_id', 'solution', 'compteur', 'periode'], 'quotas_usage_pk');
            });
        }

        // ── Journal des transitions (section 9.3) ───────────────────────────
        if (! Schema::hasTable('license_transitions')) {
            Schema::create('license_transitions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('license_id')->nullable()->constrained('licenses')->nullOnDelete();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('solution', 32)->default('secretis');
                $table->string('etat_avant', 10)->nullable();
                $table->string('etat_apres', 10);
                $table->string('cause');
                // systeme | superadmin | paiement
                $table->string('acteur', 20)->default('systeme');
                $table->foreignId('acteur_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->jsonb('contexte')->nullable();
                // Volontairement SANS updated_at : un journal non modifiable
                // n'a pas de date de modification.
                $table->timestamp('created_at')->useCurrent();

                $table->index(['organization_id', 'created_at']);
                $table->index(['etat_apres', 'created_at']);
            });

            // Journal non modifiable (section 9.3) : la règle est portée par la
            // base, pas par la bonne volonté du code appelant.
            DB::statement("
                CREATE OR REPLACE FUNCTION license_transitions_immuable() RETURNS trigger AS \$\$
                BEGIN
                    RAISE EXCEPTION 'Le journal des transitions de licence n''est pas modifiable.';
                END;
                \$\$ LANGUAGE plpgsql
            ");
            DB::statement('
                CREATE TRIGGER license_transitions_immuable_trg
                BEFORE UPDATE OR DELETE ON license_transitions
                FOR EACH ROW EXECUTE FUNCTION license_transitions_immuable()
            ');
        }

        // ── Tentatives de dépassement (section 9.8) ─────────────────────────
        // « Un compte qui bute 5 fois sur le plafond est un prospect chaud. »
        if (! Schema::hasTable('quota_hits')) {
            Schema::create('quota_hits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('solution', 32)->default('secretis');
                $table->string('compteur', 32);
                $table->unsignedInteger('plafond');
                $table->unsignedInteger('valeur_tentee');
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['organization_id', 'created_at']);
            });
        }

        // ── `plans.trial_days` neutralisé ───────────────────────────────────
        // Une durée d'essai par formule contredit la décision D4 (durée unique
        // par solution). La colonne n'est pas supprimée — d'autres produits du
        // catalogue partagent ce schéma — mais elle est vidée pour qu'aucun
        // code ne puisse la lire et en tirer une seconde vérité.
        if (Schema::hasColumn('plans', 'trial_days')) {
            // La colonne est NOT NULL : on la rend nullable avant de la vider.
            // Y mettre 0 plutot que NULL serait pire — un code qui la lit
            // comprendrait « essai de zero jour » et couperait l'essai, la ou
            // NULL dit sans ambiguite « cette colonne ne fait plus foi ».
            DB::statement('ALTER TABLE plans ALTER COLUMN trial_days DROP NOT NULL');
            DB::statement('ALTER TABLE plans ALTER COLUMN trial_days DROP DEFAULT');
            DB::table('plans')->update(['trial_days' => null]);
        }
    }

    public function down(): void
    {
        DB::statement('DROP TRIGGER IF EXISTS licenses_sync_status_trg ON licenses');
        DB::statement('DROP FUNCTION IF EXISTS licenses_sync_status()');
        DB::statement('DROP TRIGGER IF EXISTS license_transitions_immuable_trg ON license_transitions');
        DB::statement('DROP FUNCTION IF EXISTS license_transitions_immuable()');
        DB::statement('ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_jamais_perpetuelle');
        DB::statement('ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_etat_valide');

        Schema::dropIfExists('quota_hits');
        Schema::dropIfExists('license_transitions');
        Schema::dropIfExists('quotas_usage');

        Schema::table('licenses', function (Blueprint $table) {
            $table->dropColumn([
                'etat', 'solution', 'cle_licence', 'date_purge', 'origine',
                'prolongation_faite', 'prolongation_le', 'prolongation_motif',
            ]);
        });
    }
};
