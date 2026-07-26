<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PipelineStageSeeder extends Seeder
{
    /**
     * Stages du pipeline CRM SuperAdmin IBIG Soft.
     *
     * Ces stages sont des données système (organization_id = null).
     * Chaque organisation peut avoir ses propres stages via crm_pipelines + crm_stages.
     */
    public function run(): void
    {
        $this->command->info('  > PipelineStageSeeder : stages pipeline CRM SuperAdmin...');

        // Créer ou récupérer le pipeline système
        $pipelineId = DB::table('crm_pipelines')->where('slug', 'ibig-default')->value('id');

        if (! $pipelineId) {
            $pipelineId = DB::table('crm_pipelines')->insertGetId([
                'organization_id' => null,  // pipeline système global
                'name'            => 'Pipeline IBIG Soft',
                'slug'            => 'ibig-default',
                'description'     => 'Pipeline de vente par défaut du CRM SuperAdmin IBIG Soft.',
                'is_default'      => true,
                'is_active'       => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }

        $stages = [
            [
                'pipeline_id'    => $pipelineId,
                'name'           => 'Nouveau Lead',
                'slug'           => 'nouveau-lead',
                'description'    => 'Lead entrant non encore qualifié.',
                'order'          => 1,
                'color'          => '#6C757D',
                'probability'    => 10,
                'is_closed_won'  => false,
                'is_closed_lost' => false,
                'is_active'      => true,
            ],
            [
                'pipeline_id'    => $pipelineId,
                'name'           => 'Contacté',
                'slug'           => 'contacte',
                'description'    => 'Premier contact établi — appel ou email envoyé.',
                'order'          => 2,
                'color'          => '#2E86C1',
                'probability'    => 25,
                'is_closed_won'  => false,
                'is_closed_lost' => false,
                'is_active'      => true,
            ],
            [
                'pipeline_id'    => $pipelineId,
                'name'           => 'Démo planifiée',
                'slug'           => 'demo-planifiee',
                'description'    => 'Démonstration produit planifiée ou réalisée.',
                'order'          => 3,
                'color'          => '#F39C12',
                'probability'    => 50,
                'is_closed_won'  => false,
                'is_closed_lost' => false,
                'is_active'      => true,
            ],
            [
                'pipeline_id'    => $pipelineId,
                'name'           => 'Proposition envoyée',
                'slug'           => 'proposition-envoyee',
                'description'    => 'Devis ou proposition commerciale transmis au prospect.',
                'order'          => 4,
                'color'          => '#9B59B6',
                'probability'    => 65,
                'is_closed_won'  => false,
                'is_closed_lost' => false,
                'is_active'      => true,
            ],
            [
                'pipeline_id'    => $pipelineId,
                'name'           => 'Négociation',
                'slug'           => 'negociation',
                'description'    => 'En cours de négociation — ajustement tarifaire ou contractuel.',
                'order'          => 5,
                'color'          => '#E67E22',
                'probability'    => 80,
                'is_closed_won'  => false,
                'is_closed_lost' => false,
                'is_active'      => true,
            ],
            [
                'pipeline_id'    => $pipelineId,
                'name'           => 'Gagné',
                'slug'           => 'gagne',
                'description'    => 'Contrat signé — client converti avec succès.',
                'order'          => 6,
                'color'          => '#1E8449',
                'probability'    => 100,
                'is_closed_won'  => true,
                'is_closed_lost' => false,
                'is_active'      => true,
            ],
            [
                'pipeline_id'    => $pipelineId,
                'name'           => 'Perdu',
                'slug'           => 'perdu',
                'description'    => 'Opportunité perdue — prospect non converti.',
                'order'          => 7,
                'color'          => '#C0392B',
                'probability'    => 0,
                'is_closed_won'  => false,
                'is_closed_lost' => true,
                'is_active'      => true,
            ],
        ];

        foreach ($stages as $stage) {
            DB::table('crm_stages')->updateOrInsert(
                [
                    'pipeline_id' => $stage['pipeline_id'],
                    'slug'        => $stage['slug'],
                ],
                array_merge($stage, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('    OK : ' . count($stages) . ' stages pipeline inseres (pipeline_id=' . $pipelineId . ').');
    }
}
