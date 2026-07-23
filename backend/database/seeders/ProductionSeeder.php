<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/**
 * ProductionSeeder — Initialisation des données de production SECRETIS ERP
 *
 * Ce seeder injecte UNIQUEMENT les données nécessaires au démarrage en production :
 *   - Plans tarifaires (Starter, Pro, Enterprise)
 *   - Modules disponibles
 *   - Passerelles de paiement OHADA
 *   - Catégories centre d'aide
 *   - Compte SuperAdmin IBIG
 *   - Étapes onboarding
 *
 * Aucune donnée de démonstration n'est créée (pas d'organisation, pas d'utilisateur lambda).
 * Idempotent : peut être relancé sans risque de doublons.
 */
class ProductionSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('=== SECRETIS ERP — Production Seeder ===');
        $this->command->info('Initialisation des données de base...');
        $this->command->newLine();

        DB::transaction(function () {
            $this->seedPlans();
            $this->seedModules();
            $this->seedPaymentGateways();
            $this->seedHelpCategories();
            $this->seedSuperAdmin();
            $this->seedOnboardingSteps();
        });

        $this->command->newLine();
        $this->command->info('=== Production Seeder terminé avec succès ===');
    }

    // =========================================================================
    // Plans tarifaires
    // =========================================================================

    private function seedPlans(): void
    {
        $this->command->info('  [1/6] Plans tarifaires...');

        $plans = [
            // ── Starter ─────────────────────────────────────────────────────
            [
                'name'              => 'Starter',
                'slug'              => 'starter',
                'description'       => 'Idéal pour les petites structures et PME débutantes. Accès aux modules essentiels pour démarrer votre digitalisation.',
                'price_monthly'     => 0,        // Freemium : 0 FCFA/mois
                'price_yearly'      => 0,
                'currency'          => 'XOF',
                'max_users'         => 5,
                'max_storage_gb'    => 2,
                'max_organizations' => 1,
                'modules'           => json_encode([
                    'agenda',
                    'courrier',
                    'taches',
                    'contacts',
                    'visiteurs',
                    'communication',
                ]),
                'features'          => json_encode([
                    'support_email'     => true,
                    'support_priority'  => false,
                    'sso'               => false,
                    'api_access'        => false,
                    'on_premise'        => false,
                    'custom_domain'     => false,
                    'advanced_reports'  => false,
                    'audit_log'         => false,
                    'sara_ai'           => false,
                    'e_signature'       => false,
                    'white_label'       => false,
                    'dedicated_support' => false,
                ]),
                'is_active'         => true,
                'is_featured'       => false,
                'sort_order'        => 1,
            ],

            // ── Pro ─────────────────────────────────────────────────────────
            [
                'name'              => 'Pro',
                'slug'              => 'pro',
                'description'       => 'Pour les PME et cabinets qui veulent toute la puissance de SECRETIS. Tous les modules métier, rapports avancés et signature électronique.',
                'price_monthly'     => 49900,    // 49 900 FCFA/mois
                'price_yearly'      => 499000,   // 2 mois offerts
                'currency'          => 'XOF',
                'max_users'         => 25,
                'max_storage_gb'    => 25,
                'max_organizations' => 1,
                'modules'           => json_encode([
                    'agenda',
                    'courrier',
                    'taches',
                    'contacts',
                    'visiteurs',
                    'communication',
                    'reunions',
                    'rh',
                    'comptabilite',
                    'budget',
                    'achats',
                    'rapports',
                    'signatures',
                    'formation',
                    'flotte',
                    'qualite',
                    'automations',
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
                    'sara_ai'           => false,
                    'e_signature'       => true,
                    'white_label'       => false,
                    'dedicated_support' => false,
                ]),
                'is_active'         => true,
                'is_featured'       => true,
                'sort_order'        => 2,
            ],

            // ── Enterprise ──────────────────────────────────────────────────
            [
                'name'              => 'Enterprise',
                'slug'              => 'enterprise',
                'description'       => 'La solution complète pour les grandes organisations. Modules IA SARA, support prioritaire dédié, accès illimité et options on-premise.',
                'price_monthly'     => 149900,   // 149 900 FCFA/mois
                'price_yearly'      => 1499000,  // 2 mois offerts
                'currency'          => 'XOF',
                'max_users'         => -1,       // illimité
                'max_storage_gb'    => -1,       // illimité
                'max_organizations' => -1,
                'modules'           => json_encode([
                    'agenda', 'courrier', 'taches', 'contacts', 'visiteurs', 'communication',
                    'reunions', 'rh', 'comptabilite', 'budget', 'achats', 'rapports',
                    'signatures', 'formation', 'flotte', 'qualite', 'automations',
                    // Modules Enterprise exclusifs
                    'sara',          // IA conversationnelle SARA
                    'gps_tracking',  // Suivi GPS flotte
                    'iso9001',       // Certification ISO 9001
                    'scorm',         // E-learning SCORM
                    'crm',           // CRM avancé
                    'saas_metrics',  // Métriques SaaS
                    'marketplace',   // Place de marché
                    'rgpd',          // Module RGPD & conformité
                ]),
                'features'          => json_encode([
                    'support_email'     => true,
                    'support_priority'  => true,
                    'sso'               => true,
                    'api_access'        => true,
                    'on_premise'        => true,
                    'custom_domain'     => true,
                    'advanced_reports'  => true,
                    'audit_log'         => true,
                    'sara_ai'           => true,
                    'e_signature'       => true,
                    'white_label'       => true,
                    'dedicated_support' => true,
                    'sla_99_9'          => true,
                ]),
                'is_active'         => true,
                'is_featured'       => false,
                'sort_order'        => 3,
            ],
        ];

        foreach ($plans as $plan) {
            DB::table('plans')->updateOrInsert(
                ['slug' => $plan['slug']],
                array_merge($plan, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('    OK : 3 plans tarifaires créés/mis à jour.');
    }

    // =========================================================================
    // Modules disponibles
    // =========================================================================

    private function seedModules(): void
    {
        $this->command->info('  [2/6] Modules disponibles...');

        $modules = [
            // ── 10 modules core ─────────────────────────────────────────────
            ['key' => 'agenda',        'name' => 'Agenda & Réservations',           'category' => 'core',       'icon' => 'heroicons:calendar', 'sort_order' => 1],
            ['key' => 'courrier',      'name' => 'Gestion du Courrier & Documents', 'category' => 'core',       'icon' => 'heroicons:envelope',  'sort_order' => 2],
            ['key' => 'taches',        'name' => 'Tâches & Projets',                'category' => 'core',       'icon' => 'heroicons:check-circle', 'sort_order' => 3],
            ['key' => 'contacts',      'name' => 'Gestion des Contacts',            'category' => 'core',       'icon' => 'heroicons:users',     'sort_order' => 4],
            ['key' => 'visiteurs',     'name' => 'Gestion des Visiteurs',           'category' => 'core',       'icon' => 'heroicons:identification', 'sort_order' => 5],
            ['key' => 'reunions',      'name' => 'Compte-Rendus de Réunion',        'category' => 'core',       'icon' => 'heroicons:presentation-chart-bar', 'sort_order' => 6],
            ['key' => 'communication', 'name' => 'Communication Interne',           'category' => 'core',       'icon' => 'heroicons:chat-bubble-left-right', 'sort_order' => 7],
            ['key' => 'rh',            'name' => 'Ressources Humaines',             'category' => 'core',       'icon' => 'heroicons:briefcase', 'sort_order' => 8],
            ['key' => 'comptabilite',  'name' => 'Comptabilité SYSCOHADA',          'category' => 'core',       'icon' => 'heroicons:banknotes', 'sort_order' => 9],
            ['key' => 'rapports',      'name' => 'Rapports & Tableaux de Bord',     'category' => 'core',       'icon' => 'heroicons:chart-bar', 'sort_order' => 10],

            // ── 7 modules Enterprise ─────────────────────────────────────────
            ['key' => 'sara',          'name' => 'Assistant IA SARA',               'category' => 'enterprise', 'icon' => 'heroicons:sparkles',  'sort_order' => 11],
            ['key' => 'gps_tracking',  'name' => 'Suivi GPS Flotte',                'category' => 'enterprise', 'icon' => 'heroicons:map-pin',   'sort_order' => 12],
            ['key' => 'iso9001',       'name' => 'Qualité ISO 9001',                'category' => 'enterprise', 'icon' => 'heroicons:shield-check', 'sort_order' => 13],
            ['key' => 'scorm',         'name' => 'E-Learning SCORM',                'category' => 'enterprise', 'icon' => 'heroicons:academic-cap', 'sort_order' => 14],
            ['key' => 'crm',           'name' => 'CRM Avancé',                      'category' => 'enterprise', 'icon' => 'heroicons:user-group', 'sort_order' => 15],
            ['key' => 'saas_metrics',  'name' => 'Métriques SaaS',                  'category' => 'enterprise', 'icon' => 'heroicons:arrow-trending-up', 'sort_order' => 16],
            ['key' => 'rgpd',          'name' => 'RGPD & Conformité',               'category' => 'enterprise', 'icon' => 'heroicons:lock-closed', 'sort_order' => 17],
        ];

        foreach ($modules as $module) {
            DB::table('modules')->updateOrInsert(
                ['key' => $module['key']],
                array_merge($module, [
                    'is_active'  => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('    OK : 17 modules créés/mis à jour (10 core + 7 Enterprise).');
    }

    // =========================================================================
    // Passerelles de paiement OHADA
    // =========================================================================

    private function seedPaymentGateways(): void
    {
        $this->command->info('  [3/6] Passerelles de paiement OHADA...');

        $gateways = [
            [
                'key'         => 'orange_money_ci',
                'name'        => 'Orange Money Côte d\'Ivoire',
                'provider'    => 'orange_money',
                'country'     => 'CI',
                'currency'    => 'XOF',
                'logo'        => 'orange-money.svg',
                'type'        => 'mobile_money',
                'is_active'   => true,
                'is_default'  => true,
                'min_amount'  => 500,
                'max_amount'  => 2000000,
                'sort_order'  => 1,
            ],
            [
                'key'         => 'mtn_momo_ci',
                'name'        => 'MTN Mobile Money Côte d\'Ivoire',
                'provider'    => 'mtn_momo',
                'country'     => 'CI',
                'currency'    => 'XOF',
                'logo'        => 'mtn-momo.svg',
                'type'        => 'mobile_money',
                'is_active'   => true,
                'is_default'  => false,
                'min_amount'  => 500,
                'max_amount'  => 2000000,
                'sort_order'  => 2,
            ],
            [
                'key'         => 'wave_ci',
                'name'        => 'Wave Côte d\'Ivoire',
                'provider'    => 'wave',
                'country'     => 'CI',
                'currency'    => 'XOF',
                'logo'        => 'wave.svg',
                'type'        => 'mobile_money',
                'is_active'   => true,
                'is_default'  => false,
                'min_amount'  => 1,
                'max_amount'  => 5000000,
                'sort_order'  => 3,
            ],
            [
                'key'         => 'moov_money_ci',
                'name'        => 'Moov Money Côte d\'Ivoire',
                'provider'    => 'moov_money',
                'country'     => 'CI',
                'currency'    => 'XOF',
                'logo'        => 'moov-money.svg',
                'type'        => 'mobile_money',
                'is_active'   => true,
                'is_default'  => false,
                'min_amount'  => 100,
                'max_amount'  => 1000000,
                'sort_order'  => 4,
            ],
            [
                'key'         => 'cinet',
                'name'        => 'CINet Paiement',
                'provider'    => 'cinet',
                'country'     => 'CI',
                'currency'    => 'XOF',
                'logo'        => 'cinet.svg',
                'type'        => 'card',
                'is_active'   => true,
                'is_default'  => false,
                'min_amount'  => 1000,
                'max_amount'  => 10000000,
                'sort_order'  => 5,
            ],
            [
                'key'         => 'stripe',
                'name'        => 'Stripe (Carte bancaire internationale)',
                'provider'    => 'stripe',
                'country'     => null, // International
                'currency'    => 'EUR',
                'logo'        => 'stripe.svg',
                'type'        => 'card',
                'is_active'   => true,
                'is_default'  => false,
                'min_amount'  => 100,    // en centimes EUR
                'max_amount'  => null,
                'sort_order'  => 6,
            ],
            [
                'key'         => 'paypal',
                'name'        => 'PayPal',
                'provider'    => 'paypal',
                'country'     => null,
                'currency'    => 'USD',
                'logo'        => 'paypal.svg',
                'type'        => 'paypal',
                'is_active'   => true,
                'is_default'  => false,
                'min_amount'  => 1,
                'max_amount'  => null,
                'sort_order'  => 7,
            ],
            [
                'key'         => 'virement_bancaire',
                'name'        => 'Virement Bancaire',
                'provider'    => 'manual',
                'country'     => null,
                'currency'    => 'XOF',
                'logo'        => 'bank-transfer.svg',
                'type'        => 'wire_transfer',
                'is_active'   => true,
                'is_default'  => false,
                'min_amount'  => 10000,
                'max_amount'  => null,
                'sort_order'  => 8,
            ],
        ];

        foreach ($gateways as $gateway) {
            DB::table('payment_gateways')->updateOrInsert(
                ['key' => $gateway['key']],
                array_merge($gateway, [
                    'config'     => json_encode([]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('    OK : 8 passerelles de paiement créées/mises à jour.');
    }

    // =========================================================================
    // Catégories centre d'aide
    // =========================================================================

    private function seedHelpCategories(): void
    {
        $this->command->info('  [4/6] Catégories centre d\'aide...');

        $categories = [
            [
                'slug'         => 'premiers-pas',
                'icon'         => 'heroicons:rocket-launch',
                'color'        => '#3B82F6',
                'order'        => 1,
                'is_active'    => true,
                'translations' => json_encode([
                    'fr' => ['name' => 'Premiers pas', 'description' => 'Démarrez avec SECRETIS ERP : configuration initiale, compte, organisation.'],
                    'en' => ['name' => 'Getting started', 'description' => 'Get started with SECRETIS ERP: initial setup, account, organization.'],
                ]),
            ],
            [
                'slug'         => 'gestion-courrier',
                'icon'         => 'heroicons:envelope',
                'color'        => '#10B981',
                'order'        => 2,
                'is_active'    => true,
                'translations' => json_encode([
                    'fr' => ['name' => 'Gestion du courrier', 'description' => 'Enregistrement, traitement et archivage des courriers entrants et sortants.'],
                    'en' => ['name' => 'Mail management', 'description' => 'Recording, processing and archiving incoming and outgoing mail.'],
                ]),
            ],
            [
                'slug'         => 'agenda-reunions',
                'icon'         => 'heroicons:calendar-days',
                'color'        => '#F59E0B',
                'order'        => 3,
                'is_active'    => true,
                'translations' => json_encode([
                    'fr' => ['name' => 'Agenda & Réunions', 'description' => 'Gestion du calendrier, réservation de salles et compte-rendus de réunion.'],
                    'en' => ['name' => 'Calendar & Meetings', 'description' => 'Calendar management, room booking and meeting minutes.'],
                ]),
            ],
            [
                'slug'         => 'facturation-paiement',
                'icon'         => 'heroicons:credit-card',
                'color'        => '#8B5CF6',
                'order'        => 4,
                'is_active'    => true,
                'translations' => json_encode([
                    'fr' => ['name' => 'Facturation & Paiement', 'description' => 'Plans tarifaires, méthodes de paiement, factures et renouvellements.'],
                    'en' => ['name' => 'Billing & Payment', 'description' => 'Pricing plans, payment methods, invoices and renewals.'],
                ]),
            ],
            [
                'slug'         => 'securite-acces',
                'icon'         => 'heroicons:shield-check',
                'color'        => '#EF4444',
                'order'        => 5,
                'is_active'    => true,
                'translations' => json_encode([
                    'fr' => ['name' => 'Sécurité & Accès', 'description' => 'Gestion des rôles, permissions, authentification et sécurité du compte.'],
                    'en' => ['name' => 'Security & Access', 'description' => 'Role management, permissions, authentication and account security.'],
                ]),
            ],
            [
                'slug'         => 'sara-ia',
                'icon'         => 'heroicons:sparkles',
                'color'        => '#06B6D4',
                'order'        => 6,
                'is_active'    => true,
                'translations' => json_encode([
                    'fr' => ['name' => 'Assistant SARA (IA)', 'description' => 'Utilisation de l\'assistant IA SARA : commandes, conseils et bonnes pratiques.'],
                    'en' => ['name' => 'SARA Assistant (AI)', 'description' => 'Using the SARA AI assistant: commands, tips and best practices.'],
                ]),
            ],
            [
                'slug'         => 'integrations-api',
                'icon'         => 'heroicons:puzzle-piece',
                'color'        => '#F97316',
                'order'        => 7,
                'is_active'    => true,
                'translations' => json_encode([
                    'fr' => ['name' => 'Intégrations & API', 'description' => 'Connexion avec vos outils existants : Microsoft 365, Google Workspace, API REST.'],
                    'en' => ['name' => 'Integrations & API', 'description' => 'Connect with your existing tools: Microsoft 365, Google Workspace, REST API.'],
                ]),
            ],
            [
                'slug'         => 'depannage',
                'icon'         => 'heroicons:wrench-screwdriver',
                'color'        => '#84CC16',
                'order'        => 8,
                'is_active'    => true,
                'translations' => json_encode([
                    'fr' => ['name' => 'Dépannage', 'description' => 'Résolution des problèmes courants, erreurs fréquentes et conseils de diagnostic.'],
                    'en' => ['name' => 'Troubleshooting', 'description' => 'Resolving common issues, frequent errors and diagnostic tips.'],
                ]),
            ],
        ];

        foreach ($categories as $category) {
            DB::table('help_categories')->updateOrInsert(
                ['slug' => $category['slug']],
                array_merge($category, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('    OK : 8 catégories du centre d\'aide créées/mises à jour.');
    }

    // =========================================================================
    // Compte SuperAdmin IBIG
    // =========================================================================

    private function seedSuperAdmin(): void
    {
        $this->command->info('  [5/6] Compte SuperAdmin IBIG...');

        // ── Organisation interne IBIG Soft ───────────────────────────────────
        DB::table('organizations')->updateOrInsert(
            ['slug' => 'ibig-soft'],
            [
                'name'            => 'IBIG Soft',
                'slug'            => 'ibig-soft',
                'domain'          => 'ibigsoft.com',
                'email'           => 'contact@ibigsoft.com',
                'phone'           => '+225 27 22 00 00 00',
                'address'         => 'Plateau, Abidjan, Côte d\'Ivoire',
                'city'            => 'Abidjan',
                'country'         => 'CI',
                'timezone'        => 'Africa/Abidjan',
                'locale'          => 'fr',
                'type'            => 'internal',
                'settings'        => json_encode([
                    'currency'      => 'XOF',
                    'date_format'   => 'd/m/Y',
                    'working_hours' => ['start' => '08:00', 'end' => '18:00'],
                    'working_days'  => ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
                ]),
                'modules_enabled' => json_encode(['*']),
                'is_active'       => true,
                'status'          => 'active',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]
        );

        $orgId = DB::table('organizations')->where('slug', 'ibig-soft')->value('id');

        // ── Compte SuperAdmin ─────────────────────────────────────────────────
        $email    = env('SUPERADMIN_EMAIL', 'superadmin@ibigsoft.com');
        $password = env('SUPERADMIN_PASSWORD');

        $passwordGenerated = false;
        if (empty($password)) {
            $password          = Str::password(24, true, true, true, false);
            $passwordGenerated = true;
        }

        $userExists = DB::table('users')->where('email', $email)->exists();

        if (! $userExists) {
            $userId = DB::table('users')->insertGetId([
                'organization_id'   => $orgId,
                'first_name'        => 'IBIG',
                'last_name'         => 'Soft',
                'name'              => 'IBIG Soft',
                'email'             => $email,
                'password'          => Hash::make($password),
                'role'              => 'superadmin',
                'job_title'         => 'Super Administrateur Plateforme',
                'locale'            => 'fr',
                'timezone'          => 'Africa/Abidjan',
                'is_active'         => true,
                'status'            => 'active',
                'email_verified_at' => now(),
                'settings'          => json_encode(['onboarding_skipped' => true]),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);

            // Assigner le rôle Spatie superadmin_ibig
            $role = Role::where('name', 'superadmin_ibig')->where('guard_name', 'web')->first();
            if ($role) {
                DB::table('model_has_roles')->insertOrIgnore([
                    'role_id'    => $role->id,
                    'model_type' => config('auth.providers.users.model', 'App\\Models\\User'),
                    'model_id'   => $userId,
                ]);
            }

            Log::channel('stack')->info('[ProductionSeeder] Compte SuperAdmin créé', [
                'email'   => $email,
                'user_id' => $userId,
                'org_id'  => $orgId,
            ]);

            $this->command->info("    OK : SuperAdmin créé (email={$email}).");

            if ($passwordGenerated) {
                $this->command->warn('');
                $this->command->warn('    ╔════════════════════════════════════════════════════╗');
                $this->command->warn('    ║  MOT DE PASSE SUPERADMIN GÉNÉRÉ AUTOMATIQUEMENT   ║');
                $this->command->warn("    ║  Email    : {$email}");
                $this->command->warn("    ║  Password : {$password}");
                $this->command->warn('    ║  Conservez-le précieusement — ne sera plus affiché ║');
                $this->command->warn('    ╚════════════════════════════════════════════════════╝');
                $this->command->warn('');
            }
        } else {
            $this->command->info("    OK : SuperAdmin {$email} déjà existant — ignoré.");
        }
    }

    // =========================================================================
    // Étapes d'onboarding
    // =========================================================================

    private function seedOnboardingSteps(): void
    {
        $this->command->info('  [6/6] Étapes onboarding...');

        $steps = [
            [
                'key'         => 'complete_profile',
                'title'       => json_encode(['fr' => 'Compléter votre profil', 'en' => 'Complete your profile']),
                'description' => json_encode(['fr' => 'Renseignez votre photo, poste et informations de contact.', 'en' => 'Add your photo, job title and contact information.']),
                'icon'        => 'heroicons:user-circle',
                'points'      => 10,
                'category'    => 'profile',
                'sort_order'  => 1,
                'is_required' => true,
                'action_url'  => '/settings/profile',
                'action_label'=> json_encode(['fr' => 'Compléter le profil', 'en' => 'Complete profile']),
            ],
            [
                'key'         => 'configure_organization',
                'title'       => json_encode(['fr' => 'Configurer votre organisation', 'en' => 'Configure your organization']),
                'description' => json_encode(['fr' => 'Ajoutez le logo, les coordonnées et les paramètres de votre entreprise.', 'en' => 'Add your logo, contact details and company settings.']),
                'icon'        => 'heroicons:building-office',
                'points'      => 15,
                'category'    => 'setup',
                'sort_order'  => 2,
                'is_required' => true,
                'action_url'  => '/settings/organization',
                'action_label'=> json_encode(['fr' => 'Configurer', 'en' => 'Configure']),
            ],
            [
                'key'         => 'invite_first_user',
                'title'       => json_encode(['fr' => 'Inviter votre premier collaborateur', 'en' => 'Invite your first team member']),
                'description' => json_encode(['fr' => 'Invitez un collègue à rejoindre votre espace SECRETIS.', 'en' => 'Invite a colleague to join your SECRETIS workspace.']),
                'icon'        => 'heroicons:user-plus',
                'points'      => 20,
                'category'    => 'team',
                'sort_order'  => 3,
                'is_required' => false,
                'action_url'  => '/settings/users/invite',
                'action_label'=> json_encode(['fr' => 'Inviter', 'en' => 'Invite']),
            ],
            [
                'key'         => 'create_first_courrier',
                'title'       => json_encode(['fr' => 'Enregistrer votre premier courrier', 'en' => 'Register your first mail']),
                'description' => json_encode(['fr' => 'Créez un courrier entrant ou sortant pour découvrir le module.', 'en' => 'Create an incoming or outgoing mail to discover the module.']),
                'icon'        => 'heroicons:envelope-open',
                'points'      => 15,
                'category'    => 'modules',
                'sort_order'  => 4,
                'is_required' => false,
                'action_url'  => '/courrier/nouveau',
                'action_label'=> json_encode(['fr' => 'Créer un courrier', 'en' => 'Create mail']),
            ],
            [
                'key'         => 'schedule_first_event',
                'title'       => json_encode(['fr' => 'Planifier un événement', 'en' => 'Schedule an event']),
                'description' => json_encode(['fr' => 'Ajoutez un rendez-vous ou une réunion dans votre agenda.', 'en' => 'Add an appointment or meeting to your calendar.']),
                'icon'        => 'heroicons:calendar-plus',
                'points'      => 10,
                'category'    => 'modules',
                'sort_order'  => 5,
                'is_required' => false,
                'action_url'  => '/agenda/nouveau',
                'action_label'=> json_encode(['fr' => 'Planifier', 'en' => 'Schedule']),
            ],
            [
                'key'         => 'create_first_task',
                'title'       => json_encode(['fr' => 'Créer votre première tâche', 'en' => 'Create your first task']),
                'description' => json_encode(['fr' => 'Organisez votre travail en créant une tâche ou un projet.', 'en' => 'Organize your work by creating a task or project.']),
                'icon'        => 'heroicons:clipboard-document-check',
                'points'      => 10,
                'category'    => 'modules',
                'sort_order'  => 6,
                'is_required' => false,
                'action_url'  => '/taches/nouvelle',
                'action_label'=> json_encode(['fr' => 'Créer une tâche', 'en' => 'Create a task']),
            ],
            [
                'key'         => 'configure_email_notifications',
                'title'       => json_encode(['fr' => 'Configurer les notifications', 'en' => 'Configure notifications']),
                'description' => json_encode(['fr' => 'Personnalisez vos préférences de notification par email et in-app.', 'en' => 'Customize your email and in-app notification preferences.']),
                'icon'        => 'heroicons:bell',
                'points'      => 5,
                'category'    => 'settings',
                'sort_order'  => 7,
                'is_required' => false,
                'action_url'  => '/settings/notifications',
                'action_label'=> json_encode(['fr' => 'Configurer', 'en' => 'Configure']),
            ],
            [
                'key'         => 'explore_help_center',
                'title'       => json_encode(['fr' => 'Explorer le centre d\'aide', 'en' => 'Explore the help center']),
                'description' => json_encode(['fr' => 'Consultez nos guides et tutoriels pour maîtriser SECRETIS rapidement.', 'en' => 'Browse our guides and tutorials to master SECRETIS quickly.']),
                'icon'        => 'heroicons:book-open',
                'points'      => 5,
                'category'    => 'learning',
                'sort_order'  => 8,
                'is_required' => false,
                'action_url'  => '/aide',
                'action_label'=> json_encode(['fr' => 'Ouvrir l\'aide', 'en' => 'Open help']),
            ],
            [
                'key'         => 'setup_two_factor',
                'title'       => json_encode(['fr' => 'Activer l\'authentification à deux facteurs', 'en' => 'Enable two-factor authentication']),
                'description' => json_encode(['fr' => 'Sécurisez votre compte avec l\'authentification 2FA.', 'en' => 'Secure your account with 2FA authentication.']),
                'icon'        => 'heroicons:shield-check',
                'points'      => 20,
                'category'    => 'security',
                'sort_order'  => 9,
                'is_required' => false,
                'action_url'  => '/settings/security/2fa',
                'action_label'=> json_encode(['fr' => 'Activer 2FA', 'en' => 'Enable 2FA']),
            ],
            [
                'key'         => 'configure_working_hours',
                'title'       => json_encode(['fr' => 'Définir les horaires de travail', 'en' => 'Set working hours']),
                'description' => json_encode(['fr' => 'Configurez les horaires et jours ouvrés de votre organisation.', 'en' => 'Configure working hours and business days for your organization.']),
                'icon'        => 'heroicons:clock',
                'points'      => 5,
                'category'    => 'setup',
                'sort_order'  => 10,
                'is_required' => false,
                'action_url'  => '/settings/organization#hours',
                'action_label'=> json_encode(['fr' => 'Configurer', 'en' => 'Configure']),
            ],
            [
                'key'         => 'try_sara_assistant',
                'title'       => json_encode(['fr' => 'Essayer l\'assistant SARA', 'en' => 'Try SARA assistant']),
                'description' => json_encode(['fr' => 'Posez une question à SARA, votre assistante IA intégrée.', 'en' => 'Ask SARA, your integrated AI assistant, a question.']),
                'icon'        => 'heroicons:sparkles',
                'points'      => 10,
                'category'    => 'learning',
                'sort_order'  => 11,
                'is_required' => false,
                'action_url'  => '/sara',
                'action_label'=> json_encode(['fr' => 'Parler à SARA', 'en' => 'Talk to SARA']),
            ],
            [
                'key'         => 'generate_first_report',
                'title'       => json_encode(['fr' => 'Générer votre premier rapport', 'en' => 'Generate your first report']),
                'description' => json_encode(['fr' => 'Créez un rapport personnalisé pour visualiser vos données.', 'en' => 'Create a custom report to visualize your data.']),
                'icon'        => 'heroicons:chart-bar',
                'points'      => 15,
                'category'    => 'modules',
                'sort_order'  => 12,
                'is_required' => false,
                'action_url'  => '/rapports/builder/nouveau',
                'action_label'=> json_encode(['fr' => 'Créer un rapport', 'en' => 'Create a report']),
            ],
        ];

        foreach ($steps as $step) {
            DB::table('onboarding_steps')->updateOrInsert(
                ['key' => $step['key']],
                array_merge($step, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        $this->command->info('    OK : 12 étapes onboarding créées/mises à jour.');
    }
}
