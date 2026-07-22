<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Mode production  : php artisan db:seed
     * Mode démo        : APP_DEMO_MODE=true php artisan db:seed
     *
     * Ordre impératif (12 vagues) :
     *   1. Plans tarifaires
     *   2. Permissions RBAC (Spatie)
     *   3. Rôles avec permissions
     *   4. Devises
     *   5. Pays OHADA
     *   6. Super Admin IBIG Soft
     *   [si démo] Organisation démo, SYSCOHADA, connecteurs, feature flags, pipeline, qualité
     */
    public function run(): void
    {
        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════');
        $this->command->info('   IBIG SECRETIS ERP — Initialisation base de données');
        $this->command->info('═══════════════════════════════════════════════════════');
        $this->command->info('');

        // ── Vague 1 : Données de base système (toujours exécutées) ───────────
        $this->command->info('[1/2] Seeders de base système...');

        $this->call([
            PlanSeeder::class,           // Plans Starter / Pro / Enterprise / On-Premise
            PermissionSeeder::class,     // ~100 permissions Spatie par module
            RoleSeeder::class,           // 10 rôles avec permissions assignées
            CurrencySeeder::class,       // 16 devises (XOF par défaut)
            CountrySeeder::class,        // 18+ pays OHADA
            SuperAdminSeeder::class,     // Compte superadmin IBIG Soft + org interne
        ]);

        // ── Vague 2 : Données de démonstration ───────────────────────────────
        $isDemoMode = filter_var(env('APP_DEMO_MODE', false), FILTER_VALIDATE_BOOLEAN)
            || app()->environment('local');

        if ($isDemoMode) {
            $this->command->info('');
            $this->command->info('[2/2] Seeders de démonstration (APP_DEMO_MODE=true)...');

            $this->call([
                DemoOrganizationSeeder::class,    // Org démo + users + depts + salles + stocks
                SyscohadaChartSeeder::class,       // Plan comptable SYSCOHADA Révisé 2
                IntegrationConnectorSeeder::class, // Catalogue connecteurs marketplace (Vague 11)
                FeatureFlagSeeder::class,          // Feature flags par défaut
                PipelineStageSeeder::class,        // Stages pipeline CRM SuperAdmin
                QualityProcessSeeder::class,       // Processus qualité ISO 9001 types
            ]);
        } else {
            $this->command->info('[2/2] Mode production — données démo ignorées.');
        }

        $this->command->info('');
        $this->command->info('═══════════════════════════════════════════════════════');
        $this->command->info('   Base de données initialisée avec succes !');

        if ($isDemoMode) {
            $this->command->info('');
            $this->command->info('   Acces demo :');
            $this->command->info('   Super Admin  : ' . env('SUPERADMIN_EMAIL', 'superadmin@ibigsoft.com'));
            $this->command->info('   Org demo     : directeur@demo-cabinet.ci / Demo@2024!');
        }

        $this->command->info('═══════════════════════════════════════════════════════');
        $this->command->info('');
    }
}
