<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoPlanSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('💎 Mise à jour des plans SECRETIS...');

        // Vider et recréer les plans avec les données complètes
        DB::table('plans')->truncate();

        $plans = [
            [
                'slug'            => 'starter',
                'name'            => 'Starter',
                'description'     => 'Idéal pour les petites structures qui démarrent leur transformation digitale. Essai gratuit 14 jours, sans engagement.',
                'price_xof'       => 0,
                'price_eur'       => 0,
                'price_usd'       => 0,
                'max_users'       => 5,
                'duration_months' => 1,
                'features'        => json_encode([
                    ['key' => 'users',         'label' => '5 utilisateurs inclus',                'included' => true],
                    ['key' => 'agenda',        'label' => 'Agenda & calendrier partagé',          'included' => true],
                    ['key' => 'courrier',      'label' => 'Registre courrier simple',             'included' => true],
                    ['key' => 'documents',     'label' => 'Gestion documents (5 Go)',             'included' => true],
                    ['key' => 'visiteurs',     'label' => 'Accueil visiteurs basique',            'included' => true],
                    ['key' => 'sara',          'label' => 'SARA assistant IA (limité)',           'included' => true],
                    ['key' => 'mobile',        'label' => 'Application mobile PWA',              'included' => true],
                    ['key' => 'support',       'label' => 'Support email 48h',                   'included' => true],
                    ['key' => 'rh',            'label' => 'Module RH & congés',                  'included' => false],
                    ['key' => 'projets',       'label' => 'Gestion de projets & Kanban',         'included' => false],
                    ['key' => 'rapports',      'label' => 'Rapports & Analytics',                'included' => false],
                    ['key' => 'api',           'label' => 'Accès API REST',                      'included' => false],
                    ['key' => 'audit',         'label' => 'Journal d\'audit avancé',             'included' => false],
                    ['key' => 'multi_dept',    'label' => 'Multi-département',                   'included' => false],
                    ['key' => 'sauvegarde',    'label' => 'Sauvegarde automatique',              'included' => false],
                ]),
                'modules'         => json_encode(['agenda', 'courrier', 'documents', 'visiteurs', 'sara']),
                'is_active'       => true,
                'is_public'       => true,
                'sort_order'      => 1,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
            [
                'slug'            => 'pro',
                'name'            => 'Professionnel',
                'description'     => 'Pour les organisations en croissance qui veulent digitaliser l\'ensemble de leur administration. Le plan le plus populaire.',
                'price_xof'       => 60000,
                'price_eur'       => 91,
                'price_usd'       => 98,
                'max_users'       => 25,
                'duration_months' => 1,
                'features'        => json_encode([
                    ['key' => 'users',         'label' => '25 utilisateurs inclus',              'included' => true],
                    ['key' => 'agenda',        'label' => 'Agenda avancé + réservation salles',  'included' => true],
                    ['key' => 'courrier',      'label' => 'Courrier complet + workflow',         'included' => true],
                    ['key' => 'documents',     'label' => 'Gestion documents (50 Go)',           'included' => true],
                    ['key' => 'visiteurs',     'label' => 'Accueil visiteurs complet + badges',  'included' => true],
                    ['key' => 'sara',          'label' => 'SARA assistant IA illimité',          'included' => true],
                    ['key' => 'mobile',        'label' => 'Application mobile PWA + notifications','included' => true],
                    ['key' => 'rh',            'label' => 'Module RH, congés & notes de frais', 'included' => true],
                    ['key' => 'projets',       'label' => 'Gestion de projets & Kanban',         'included' => true],
                    ['key' => 'rapports',      'label' => 'Rapports & Analytics avancés',       'included' => true],
                    ['key' => 'multi_dept',    'label' => 'Multi-département',                   'included' => true],
                    ['key' => 'sauvegarde',    'label' => 'Sauvegarde automatique quotidienne',  'included' => true],
                    ['key' => 'support',       'label' => 'Support prioritaire 24h',             'included' => true],
                    ['key' => 'api',           'label' => 'Accès API REST',                      'included' => false],
                    ['key' => 'audit',         'label' => 'Journal d\'audit avancé',             'included' => false],
                ]),
                'modules'         => json_encode(['agenda', 'courrier', 'documents', 'visiteurs', 'sara', 'rh', 'projets', 'rapports']),
                'is_active'       => true,
                'is_public'       => true,
                'sort_order'      => 2,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
            [
                'slug'            => 'enterprise',
                'name'            => 'Entreprise',
                'description'     => 'Pour les grandes institutions et administrations publiques. Toutes les fonctionnalités, conformité totale, SLA garanti.',
                'price_xof'       => 120000,
                'price_eur'       => 183,
                'price_usd'       => 197,
                'max_users'       => 100,
                'duration_months' => 1,
                'features'        => json_encode([
                    ['key' => 'users',         'label' => '100 utilisateurs inclus (extensible)', 'included' => true],
                    ['key' => 'agenda',        'label' => 'Agenda avancé + réservation salles',    'included' => true],
                    ['key' => 'courrier',      'label' => 'Courrier complet + workflow avancé',    'included' => true],
                    ['key' => 'documents',     'label' => 'Gestion documents illimitée',           'included' => true],
                    ['key' => 'visiteurs',     'label' => 'Accueil visiteurs + contrôle accès',    'included' => true],
                    ['key' => 'sara',          'label' => 'SARA IA personnalisée + fine-tuning',   'included' => true],
                    ['key' => 'mobile',        'label' => 'Application mobile + offline',          'included' => true],
                    ['key' => 'rh',            'label' => 'RH complet + paie + organigramme',      'included' => true],
                    ['key' => 'projets',       'label' => 'Projets + Gantt + ressources',          'included' => true],
                    ['key' => 'rapports',      'label' => 'BI & Analytics temps réel',             'included' => true],
                    ['key' => 'api',           'label' => 'API REST + Webhooks',                   'included' => true],
                    ['key' => 'audit',         'label' => 'Journal d\'audit complet + export',     'included' => true],
                    ['key' => 'multi_dept',    'label' => 'Multi-département + multi-site',        'included' => true],
                    ['key' => 'sauvegarde',    'label' => 'Sauvegarde temps réel + rétention 1 an','included' => true],
                    ['key' => 'support',       'label' => 'Support dédié 24/7 + CSM attitré',      'included' => true],
                    ['key' => 'sla',           'label' => 'SLA 99,9% garanti contractuellement',   'included' => true],
                    ['key' => 'sso',           'label' => 'SSO / LDAP / Active Directory',          'included' => true],
                    ['key' => 'onpremise',     'label' => 'Option déploiement on-premise',          'included' => true],
                ]),
                'modules'         => json_encode(['agenda', 'courrier', 'documents', 'visiteurs', 'sara', 'rh', 'projets', 'rapports', 'api', 'audit', 'sso']),
                'is_active'       => true,
                'is_public'       => true,
                'sort_order'      => 3,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
        ];

        foreach ($plans as $plan) {
            DB::table('plans')->insert($plan);
        }

        $this->command->info('  ✅ 3 plans créés : Starter (gratuit 14j), Pro (60 000 XOF/mois), Enterprise (120 000 XOF/mois).');
    }
}
