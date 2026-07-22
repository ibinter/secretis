<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('  > PlanSeeder : plans tarifaires SECRETIS...');

        $plans = [
            [
                'name'              => 'Starter',
                'slug'              => 'starter',
                'description'       => 'Idéal pour les petites structures et les PME débutantes',
                'price_monthly'     => 15000,
                'price_yearly'      => 150000,   // 2 mois offerts
                'currency'          => 'XOF',
                'max_users'         => 5,
                'max_storage_gb'    => 5,
                'max_organizations' => 1,
                'modules'           => json_encode([
                    'agenda',       // Module 1 — Agenda & réservations
                    'courrier',     // Module 2 — Gestion courrier & documents
                    'reunions',     // Module 3 — Compte-rendus de réunion
                    'taches',       // Module 4 — Tâches & projets (basique)
                    'communication',// Module 5 — Communication interne
                    'visiteurs',    // Module 6 — Gestion des visiteurs
                ]),
                'features'          => json_encode([
                    'support_email'     => true,
                    'sso'               => false,
                    'api_access'        => false,
                    'on_premise'        => false,
                    'custom_domain'     => false,
                    'advanced_reports'  => false,
                    'audit_log'         => false,
                    'sara_ai'           => false,
                ]),
                'is_active'         => true,
                'is_featured'       => false,
                'sort_order'        => 1,
                'created_at'        => now(),
                'updated_at'        => now(),
            ],
            [
                'name'              => 'Pro',
                'slug'              => 'pro',
                'description'       => 'Pour les PME et cabinets qui veulent toute la puissance de SECRETIS',
                'price_monthly'     => 45000,
                'price_yearly'      => 450000,
                'currency'          => 'XOF',
                'max_users'         => 25,
                'max_storage_gb'    => 25,
                'max_organizations' => 1,
                'modules'           => json_encode([
                    'agenda', 'courrier', 'reunions', 'taches', 'communication', 'visiteurs',
                    'patrimoine',   // Module 7 — Patrimoine & flotte
                    'rh',           // Module 8 — Ressources humaines
                    'rapports',     // Module 9 — Rapports & BI
                    'parametres',   // Module 10 — Paramètres & administration
                    'comptabilite', // Comptabilité SYSCOHADA
                    'budget',       // Gestion budgétaire
                    'achats',       // Module Achats
                    'signatures',   // Signatures électroniques
                    'automations',  // Automatisations
                    'rgpd',         // Module RGPD
                ]),
                'features'          => json_encode([
                    'support_email'     => true,
                    'support_priority'  => true,
                    'sso'               => false,
                    'api_access'        => true,
                    'on_premise'        => false,
                    'custom_domain'     => true,
                    'advanced_reports'  => true,
                    'audit_log'         => true,
                    'sara_ai'           => true,
                    'ocr_advanced'      => true,
                    'scorm_player'      => true,
                    'syscohada_advanced'=> true,
                    'budget_module'     => true,
                    'gdpr_full'         => true,
                ]),
                'is_active'         => true,
                'is_featured'       => true,
                'sort_order'        => 2,
                'created_at'        => now(),
                'updated_at'        => now(),
            ],
            [
                'name'              => 'Enterprise',
                'slug'              => 'enterprise',
                'description'       => 'Pour les grandes organisations, groupes et administrations',
                'price_monthly'     => 120000,
                'price_yearly'      => 1200000,
                'currency'          => 'XOF',
                'max_users'         => -1,   // illimité
                'max_storage_gb'    => 100,
                'max_organizations' => 10,
                'modules'           => json_encode([
                    'agenda', 'courrier', 'reunions', 'taches', 'communication', 'visiteurs',
                    'patrimoine', 'rh', 'rapports', 'parametres',
                    'comptabilite', 'budget', 'achats', 'signatures', 'automations', 'rgpd',
                    'qualite',      // Module Qualité ISO 9001
                    'formation',    // Module Formation e-learning
                    'sara',         // SARA IA agentique
                    'licences',     // Gestion des licences
                    'superadmin',   // Accès CRM SuperAdmin
                ]),
                'features'          => json_encode([
                    'support_email'      => true,
                    'support_priority'   => true,
                    'support_dedicated'  => true,
                    'sso'                => true,
                    'api_access'         => true,
                    'on_premise'         => true,
                    'custom_domain'      => true,
                    'advanced_reports'   => true,
                    'audit_log'          => true,
                    'sara_ai'            => true,
                    'ocr_advanced'       => true,
                    'scorm_player'       => true,
                    'live_training'      => true,
                    'supplier_portal'    => true,
                    'quality_module'     => true,
                    'fleet_gps'          => true,
                    'syscohada_advanced' => true,
                    'budget_module'      => true,
                    'gdpr_full'          => true,
                    'sso_saml'           => true,
                    'on_premise_license' => true,
                    'white_label'        => true,
                ]),
                'is_active'         => true,
                'is_featured'       => false,
                'sort_order'        => 3,
                'created_at'        => now(),
                'updated_at'        => now(),
            ],
            [
                'name'              => 'On-Premise',
                'slug'              => 'on-premise',
                'description'       => 'Licence annuelle — hébergement sur vos propres serveurs',
                'price_monthly'     => 0,
                'price_yearly'      => 500000,   // Licence annuelle fixe
                'currency'          => 'XOF',
                'max_users'         => -1,
                'max_storage_gb'    => -1,  // illimité (géré par le client)
                'max_organizations' => -1,
                'modules'           => json_encode(['*']),  // tous les modules
                'features'          => json_encode([
                    'support_priority'   => true,
                    'support_dedicated'  => true,
                    'sso'                => true,
                    'api_access'         => true,
                    'on_premise'         => true,
                    'custom_domain'      => true,
                    'advanced_reports'   => true,
                    'audit_log'          => true,
                    'sara_ai'            => true,
                    'sso_saml'           => true,
                    'on_premise_license' => true,
                    'white_label'        => true,
                    'source_code'        => false,  // SLA uniquement
                ]),
                'is_active'         => true,
                'is_featured'       => false,
                'sort_order'        => 4,
                'created_at'        => now(),
                'updated_at'        => now(),
            ],
        ];

        foreach ($plans as $plan) {
            DB::table('plans')->updateOrInsert(
                ['slug' => $plan['slug']],
                $plan
            );
        }

        $this->command->info('    OK : 4 plans inseres (Starter, Pro, Enterprise, On-Premise).');
    }
}
