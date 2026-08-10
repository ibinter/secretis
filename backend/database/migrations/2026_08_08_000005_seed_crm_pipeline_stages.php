<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Étapes par défaut du pipeline commercial d'IBIG Soft.
 *
 * `crm_pipeline_stages` était migrée mais vide : sans étape, le tableau du
 * pipeline n'a aucune colonne, aucune affaire ne peut être créée (la conversion
 * d'un contact cherche la première étape) et le glisser-déposer n'a nulle part
 * où déposer. Le module était donc inutilisable en sortie d'installation.
 *
 * Les étapes reflètent un cycle de vente logiciel B2B en Côte d'Ivoire :
 * la démonstration et la proposition y sont des jalons distincts, et la
 * validation budgétaire mérite sa propre colonne (délais de décision longs
 * dans le secteur public et parapublic).
 */
return new class extends Migration
{
    private const ETAPES = [
        ['name' => 'Qualification',        'order' => 1, 'color' => '#94A3B8', 'probability_percent' => 10],
        ['name' => 'Démonstration',        'order' => 2, 'color' => '#38BDF8', 'probability_percent' => 25],
        ['name' => 'Proposition envoyée',  'order' => 3, 'color' => '#A78BFA', 'probability_percent' => 45],
        ['name' => 'Validation budgétaire','order' => 4, 'color' => '#FBBF24', 'probability_percent' => 70],
        ['name' => 'Négociation',          'order' => 5, 'color' => '#FB923C', 'probability_percent' => 85],
        ['name' => 'Gagnée',               'order' => 6, 'color' => '#34D399', 'probability_percent' => 100, 'is_closed_won'  => true],
        ['name' => 'Perdue',               'order' => 7, 'color' => '#F87171', 'probability_percent' => 0,   'is_closed_lost' => true],
    ];

    public function up(): void
    {
        if (! Schema::hasTable('crm_pipeline_stages')) {
            return;
        }

        // Ne jamais écraser un pipeline déjà paramétré par l'équipe commerciale.
        if (DB::table('crm_pipeline_stages')->exists()) {
            return;
        }

        $maintenant = now();

        DB::table('crm_pipeline_stages')->insert(array_map(fn ($e) => $e + [
            'is_closed_won'  => false,
            'is_closed_lost' => false,
            'created_at'     => $maintenant,
            'updated_at'     => $maintenant,
        ], self::ETAPES));
    }

    public function down(): void
    {
        if (! Schema::hasTable('crm_pipeline_stages')) {
            return;
        }

        // On ne retire que les étapes intactes : une étape portant des affaires
        // a été adoptée par l'équipe, elle ne nous appartient plus.
        DB::table('crm_pipeline_stages')
            ->whereIn('name', array_column(self::ETAPES, 'name'))
            ->whereNotIn('id', function ($q) {
                $q->select('stage_id')->from('crm_deals')->whereNotNull('stage_id');
            })
            ->delete();
    }
};
