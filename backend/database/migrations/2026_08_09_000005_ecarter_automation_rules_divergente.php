<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `automation_rules` — écarter la table divergente pour que la vraie soit créée.
 *
 * La production porte une table `automation_rules` SANS RAPPORT avec celle que
 * décrit sa migration (2026_01_01_000106) :
 *
 *     production : id BIGINT · trigger_event · conditions · actions · runs_count
 *     migration  : id UUID   · trigger_type  · trigger_config · is_active · run_count
 *
 * Le code applicatif suit la migration : `AutomationController::store()` insère
 * un `Str::uuid()` dans `id` et écrit `trigger_type`/`trigger_config`. Contre le
 * schéma réel, l'insertion échoue — CRÉER UNE RÈGLE D'AUTOMATISATION EST DONC
 * IMPOSSIBLE EN PRODUCTION AUJOURD'HUI, et l'était avant ce chantier.
 *
 * La table divergente empêchait aussi `automation_logs` d'être créée : sa clé
 * étrangère en UUID ne peut pas viser une colonne `bigint`.
 *
 * On RENOMME plutôt qu'on ne supprime. La table est vide, mais une table mise
 * de côté se relit ; une table supprimée ne se relit pas. Le suffixe porte la
 * date pour qu'on sache quand et pourquoi elle a été écartée.
 *
 * Après cette migration, `2026_01_01_000106_create_automations_table` doit être
 * rejouée pour créer la table conforme — ce que fait la procédure de
 * réconciliation (retrait de la ligne correspondante dans `migrations`).
 */
return new class extends Migration
{
    private const ECARTEE = 'automation_rules_ecartee_20260809';

    public function up(): void
    {
        if (! Schema::hasTable('automation_rules')) {
            return;
        }

        // Le critère est le TYPE de la clé, pas le nom des colonnes : c'est lui
        // qui rend la table inutilisable par le code et bloque `automation_logs`.
        $type = DB::selectOne(
            'SELECT data_type FROM information_schema.columns
              WHERE table_name = ? AND column_name = ?',
            ['automation_rules', 'id']
        )?->data_type;

        if ($type === 'uuid') {
            return;   // la table est déjà conforme
        }

        $lignes = DB::table('automation_rules')->count();

        if ($lignes > 0) {
            // Garde-fou : la table est vide en production au moment où cette
            // migration est écrite. Si elle ne l'est plus, c'est que quelqu'un a
            // trouvé le moyen de l'alimenter — et la reprise des données
            // devient une décision, pas une migration.
            throw new \RuntimeException(
                "La table automation_rules contient {$lignes} ligne(s) et un identifiant "
                . "de type « {$type} », incompatible avec le code. Reprise de données "
                . "nécessaire : cette migration refuse d'écarter des données existantes."
            );
        }

        if (Schema::hasTable(self::ECARTEE)) {
            Schema::drop('automation_rules');   // déjà écartée lors d'un passage précédent
            return;
        }

        Schema::rename('automation_rules', self::ECARTEE);
    }

    public function down(): void
    {
        if (Schema::hasTable(self::ECARTEE) && ! Schema::hasTable('automation_rules')) {
            Schema::rename(self::ECARTEE, 'automation_rules');
        }
    }
};
