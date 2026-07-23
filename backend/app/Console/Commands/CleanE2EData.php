<?php

namespace App\Console\Commands;

use App\Models\Organization;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * CleanE2EData
 *
 * Supprime toutes les données créées par E2ESeeder (organization_id=999
 * et toutes les entités marquées is_test_data=true).
 *
 * Usage :
 *   php artisan secretis:clean-e2e-data --env=testing
 *   php artisan secretis:clean-e2e-data --force   (sans confirmation)
 *
 * IMPORTANT : Protégé par une vérification de l'environnement.
 * Ne s'exécute JAMAIS en production.
 */
class CleanE2EData extends Command
{
    protected $signature = 'secretis:clean-e2e-data
        {--force : Ignorer la confirmation interactive}
        {--dry-run : Afficher ce qui serait supprimé sans supprimer}';

    protected $description = 'Supprime les données de test E2E (organisation id=999 et is_test_data=true). Ne fonctionne qu\'en environnement testing/staging/local.';

    /** ID de l'organisation E2E — doit correspondre à E2ESeeder::E2E_ORG_ID */
    private const E2E_ORG_ID = 999;

    /** Tables à nettoyer dans l'ordre (respect des FK) */
    private const TABLES_TO_CLEAN = [
        // Dépendances profondes en premier
        'visitor_logs',
        'visitor_appointments',
        'meeting_decisions',
        'meeting_participants',
        'event_participants',
        'room_reservations',
        'task_comments',
        'mail_attachments',
        'document_versions',
        'conversation_participants',
        'messages',

        // Tables principales
        'visitors',
        'meetings',
        'events',
        'tasks',
        'mail_registry',
        'documents',
        'document_folders',
        'conversations',
        'notifications',
        'audit_logs',
        'leave_requests',
        'expense_reports',
        'employees',
        'support_tickets',

        // Calendriers et salles
        'calendars',
        'rooms',

        // Utilisateurs (avant organisation)
        'model_has_roles',
        'model_has_permissions',
    ];

    // -------------------------------------------------------------------------
    // Point d'entrée
    // -------------------------------------------------------------------------

    public function handle(): int
    {
        if (! $this->ensureTestEnvironment()) {
            return Command::FAILURE;
        }

        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->info('[CleanE2EData] Mode DRY-RUN — aucune suppression effective');
        }

        if (! $this->option('force') && ! $isDryRun) {
            if (! $this->confirm(
                'Supprimer TOUTES les données E2E (organisation id=' . self::E2E_ORG_ID . ') ? Cette action est irréversible.',
                false
            )) {
                $this->info('[CleanE2EData] Nettoyage annulé.');
                return Command::SUCCESS;
            }
        }

        $this->info('[CleanE2EData] Démarrage du nettoyage E2E...');

        if (! $isDryRun) {
            DB::transaction(function () {
                $this->cleanTablesForOrg();
                $this->cleanUsers();
                $this->cleanOrganization();
            });
        } else {
            $this->previewCleanup();
        }

        $this->info('[CleanE2EData] Nettoyage E2E terminé avec succès.');

        return Command::SUCCESS;
    }

    // -------------------------------------------------------------------------
    // Garde-fou : uniquement en environnement de test
    // -------------------------------------------------------------------------

    private function ensureTestEnvironment(): bool
    {
        $env = app()->environment();
        $allowedEnvs = ['testing', 'test', 'staging', 'local'];

        if (! in_array($env, $allowedEnvs, true)) {
            $this->error(
                "[CleanE2EData] REFUSÉ : Environnement '{$env}' non autorisé. " .
                'Cette commande ne peut s\'exécuter qu\'en ' . implode(', ', $allowedEnvs) . '.'
            );
            return false;
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // Nettoyage des tables liées à l'organisation E2E
    // -------------------------------------------------------------------------

    private function cleanTablesForOrg(): void
    {
        $orgId = self::E2E_ORG_ID;

        // Tables avec colonne organization_id
        $orgTables = [
            'events', 'calendars', 'rooms', 'room_reservations',
            'mail_registry', 'mail_attachments',
            'documents', 'document_folders', 'document_versions',
            'meetings', 'meeting_participants', 'meeting_decisions',
            'tasks', 'task_comments',
            'visitors', 'visitor_logs', 'visitor_appointments',
            'notifications', 'audit_logs',
            'employees', 'leave_requests', 'expense_reports',
            'conversations', 'messages',
            'support_tickets',
            'event_participants',
        ];

        foreach ($orgTables as $table) {
            if (! DB::getSchemaBuilder()->hasTable($table)) {
                $this->warn("  [skip] Table '{$table}' introuvable");
                continue;
            }

            $hasOrgColumn = DB::getSchemaBuilder()->hasColumn($table, 'organization_id');

            if ($hasOrgColumn) {
                $count = DB::table($table)->where('organization_id', $orgId)->count();
                DB::table($table)->where('organization_id', $orgId)->delete();
                $this->info("  - {$table} : {$count} enregistrement(s) supprimé(s)");
            } elseif (DB::getSchemaBuilder()->hasColumn($table, 'is_test_data')) {
                $count = DB::table($table)->where('is_test_data', true)->count();
                DB::table($table)->where('is_test_data', true)->delete();
                $this->info("  - {$table} (is_test_data) : {$count} enregistrement(s) supprimé(s)");
            }
        }
    }

    // -------------------------------------------------------------------------
    // Nettoyage des utilisateurs de test
    // -------------------------------------------------------------------------

    private function cleanUsers(): void
    {
        $this->info('[CleanE2EData] Suppression des utilisateurs de test...');

        // Détacher les rôles et permissions Spatie avant suppression
        $testUserIds = DB::table('users')
            ->where(function ($q) {
                $q->where('organization_id', self::E2E_ORG_ID)
                  ->orWhere('is_test_data', true);
            })
            ->pluck('id');

        if ($testUserIds->isNotEmpty()) {
            DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->whereIn('model_id', $testUserIds)
                ->delete();

            DB::table('model_has_permissions')
                ->where('model_type', 'App\\Models\\User')
                ->whereIn('model_id', $testUserIds)
                ->delete();
        }

        $count = DB::table('users')
            ->where(function ($q) {
                $q->where('organization_id', self::E2E_ORG_ID)
                  ->orWhere('is_test_data', true);
            })
            ->delete();

        $this->info("  - users : {$count} enregistrement(s) supprimé(s)");
    }

    // -------------------------------------------------------------------------
    // Suppression de l'organisation E2E
    // -------------------------------------------------------------------------

    private function cleanOrganization(): void
    {
        $this->info('[CleanE2EData] Suppression de l\'organisation E2E...');

        $count = DB::table('organizations')
            ->where('id', self::E2E_ORG_ID)
            ->delete();

        $this->info("  - organizations : {$count} enregistrement(s) supprimé(s)");
    }

    // -------------------------------------------------------------------------
    // Aperçu (dry-run)
    // -------------------------------------------------------------------------

    private function previewCleanup(): void
    {
        $this->info('[CleanE2EData] Aperçu des suppressions :');

        $orgCount = DB::table('organizations')->where('id', self::E2E_ORG_ID)->count();
        $this->line("  - organizations (id=" . self::E2E_ORG_ID . ") : {$orgCount}");

        $userCount = DB::table('users')
            ->where(function ($q) {
                $q->where('organization_id', self::E2E_ORG_ID)
                  ->orWhere('is_test_data', true);
            })
            ->count();
        $this->line("  - users (test) : {$userCount}");

        $tables = ['events', 'tasks', 'mail_registry', 'documents', 'visitors', 'meetings'];
        foreach ($tables as $table) {
            if (! DB::getSchemaBuilder()->hasTable($table)) continue;
            $count = DB::table($table)->where('organization_id', self::E2E_ORG_ID)->count();
            $this->line("  - {$table} : {$count}");
        }
    }
}
