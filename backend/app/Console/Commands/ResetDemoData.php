<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * SECRETIS ERP — Commande : Réinitialisation des données de démonstration
 *
 * Usage :
 *   php artisan secretis:reset-demo               (avec confirmation interactive)
 *   php artisan secretis:reset-demo --confirm      (sans confirmation — pour CRON)
 *
 * La commande n'est disponible qu'en mode démonstration (APP_DEMO_MODE=true).
 * CRON (Kernel.php) : ->daily()->environments(['demo'])
 */
class ResetDemoData extends Command
{
    /**
     * Signature de la commande Artisan.
     */
    protected $signature = 'secretis:reset-demo
                            {--confirm : Bypass la confirmation interactive (utilisé par le CRON)}
                            {--org=    : ID de l\'organisation démo à réinitialiser (optionnel)}';

    /**
     * Description de la commande.
     */
    protected $description = 'Réinitialise les données de démonstration SECRETIS (organisations, agenda, GED, RH…)';

    /**
     * Tables de données démo à vider (dans l\'ordre pour respecter les FK).
     * Les tables système (organizations, users, plans…) ne sont pas touchées.
     */
    private array $demoTables = [
        // Qualité
        'quality_indicators',
        'quality_audits',
        'quality_nonconformities',
        // Flotte
        'vehicle_maintenances',
        'vehicle_trips',
        // Achats
        'tender_offers',
        'purchase_tenders',
        'purchase_requests',
        // Comptabilité
        'accounting_entries',
        // RH
        'expense_reports',
        'leave_requests',
        'employees',
        // Visiteurs
        'visitor_appointments',
        'visitor_logs',
        'visitors',
        // Tâches & Projets
        'task_comments',
        'tasks',
        'projects',
        // Réunions
        'meeting_decisions',
        'meeting_participants',
        'meetings',
        // GED
        'document_versions',
        'documents',
        'document_folders',
        // Agenda
        'event_participants',
        'room_reservations',
        'events',
        'rooms',
    ];

    public function handle(): int
    {
        // ── Vérification du mode démonstration ────────────────────────────────
        $isDemoMode = filter_var(config('app.demo_mode', env('APP_DEMO_MODE', false)), FILTER_VALIDATE_BOOLEAN);

        if (!$isDemoMode) {
            $this->error('');
            $this->error('  ✗  Cette commande n\'est disponible qu\'en mode démonstration.');
            $this->error('     Définissez APP_DEMO_MODE=true dans votre fichier .env pour l\'activer.');
            $this->error('');
            return Command::FAILURE;
        }

        // ── Confirmation interactive ───────────────────────────────────────────
        if (!$this->option('confirm')) {
            $this->warn('');
            $this->warn('  ⚠  RÉINITIALISATION DES DONNÉES DE DÉMONSTRATION');
            $this->warn('     Toutes les données démo seront supprimées et régénérées.');
            $this->warn('     Les comptes utilisateurs et l\'organisation démo seront conservés.');
            $this->warn('');

            if (!$this->confirm('  Confirmer la réinitialisation ?', false)) {
                $this->info('  Opération annulée.');
                return Command::SUCCESS;
            }
        }

        // ── Détermination de l\'organisation démo ─────────────────────────────
        $orgId = $this->option('org');
        if (!$orgId) {
            $org = DB::table('organizations')->where('is_demo', true)->first();
            if (!$org) {
                $this->error('  ✗  Aucune organisation de démonstration trouvée (is_demo = true).');
                return Command::FAILURE;
            }
            $orgId = $org->id;
        }

        $this->info('');
        $this->info('  ══════════════════════════════════════════════════════');
        $this->info('  IBIG SECRETIS — Réinitialisation données de démo');
        $this->info('  Organisation ID : ' . $orgId);
        $this->info('  ══════════════════════════════════════════════════════');
        $this->info('');

        $start = now();

        try {
            DB::transaction(function () use ($orgId) {
                // ── 1. Suppression des données démo ──────────────────────────
                $this->info('  [1/2] Suppression des données existantes...');

                DB::statement('SET FOREIGN_KEY_CHECKS=0');

                foreach ($this->demoTables as $table) {
                    if (DB::getSchemaBuilder()->hasTable($table)) {
                        $deleted = DB::table($table)
                            ->where('organization_id', $orgId)
                            ->delete();
                        $this->line("       → {$table} : {$deleted} enregistrement(s) supprimé(s)");
                    }
                }

                DB::statement('SET FOREIGN_KEY_CHECKS=1');

                // ── 2. Regénération des données démo ────────────────────────
                $this->info('');
                $this->info('  [2/2] Regénération des données de démonstration...');

                // Réinitialiser le DemoDataSeeder avec l'org existante
                $seeder = new \Database\Seeders\DemoDataSeeder();
                $seeder->setCommand($this->output);
                // Injecter l'orgId existant directement
                $seeder->setOrganizationId($orgId);
                $seeder->run();
            });

            $duration = now()->diffInSeconds($start);

            $this->info('');
            $this->info('  ══════════════════════════════════════════════════════');
            $this->info("  ✓  Données de démonstration réinitialisées avec succès !");
            $this->info("     Durée : {$duration}s");
            $this->info('');
            $this->info('     Accès de démonstration :');
            $this->info('     admin@demo-secretis.com / Demo@2026');
            $this->info('     dg@demo-secretis.com / Demo@2026');
            $this->info('  ══════════════════════════════════════════════════════');
            $this->info('');

            // Logger l\'opération dans les audits
            DB::table('audit_logs')->insert([
                'organization_id' => null,
                'user_id'         => null,
                'action'          => 'demo_data_reset',
                'description'     => "Réinitialisation automatique des données de démonstration (org_id: {$orgId})",
                'ip_address'      => '127.0.0.1',
                'user_agent'      => 'CLI/CRON',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            return Command::SUCCESS;

        } catch (\Throwable $e) {
            $this->error('');
            $this->error('  ✗  Erreur lors de la réinitialisation : ' . $e->getMessage());
            $this->error('     ' . $e->getFile() . ':' . $e->getLine());
            $this->error('');

            return Command::FAILURE;
        }
    }
}
