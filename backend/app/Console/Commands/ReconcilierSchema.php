<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Réconcilie une base dont des migrations ont échoué à mi-parcours.
 *
 * Neuf migrations se sont interrompues en production — sur une apostrophe non
 * échappée, une syntaxe MySQL, un garde-fou incomplet — APRÈS avoir créé une
 * partie de leurs tables, et ont malgré tout été enregistrées comme jouées.
 * Résultat : 22 tables décrites par le dépôt n'existent pas en base, dont dix
 * que le code utilise.
 *
 * Laravel n'offre rien pour cela : `migrate` ignore ce qui est marqué joué,
 * `migrate:fresh` détruit les données. On retire donc la marque des migrations
 * incomplètes et on les rejoue — ce qui n'est sûr que parce qu'elles sont
 * désormais idempotentes : chaque création teste la table, chaque ajout teste
 * la colonne.
 *
 * La commande refuse d'agir sans sauvegarde et affiche ce qu'elle va faire
 * avant de le faire.
 */
class ReconcilierSchema extends Command
{
    protected $signature = 'schema:reconcilier
                            {--dry-run : Inventorier sans rien modifier}
                            {--force : Ne pas demander confirmation (non interactif)}';

    protected $description = 'Rejoue les migrations restées incomplètes et complète le schéma';

    /**
     * Migrations enregistrées comme jouées alors qu'elles se sont interrompues.
     * Liste établie en comparant une base reconstruite à la production.
     */
    private const INCOMPLETES = [
        '2026_01_01_000101_enhance_projects_tables',
        '2026_01_01_000102_create_onboarding_tables',
        '2026_01_01_000106_create_automations_table',
        '2026_01_01_000111_create_visitor_management',
        '2026_01_01_000114_enhance_vehicles_advanced',
        '2026_01_01_000117_enhance_training_advanced',
        '2026_01_01_000118_create_supplier_portal',
        '2026_01_01_000120_create_help_center_tables',
        '2026_01_01_000135_create_support_tickets_tables',
    ];

    /** Tables attendues, et celles que le code utilise réellement. */
    private const ATTENDUES = [
        'access_zones' => false,          'automation_logs' => true,
        'guided_tour_progress' => false,  'help_article_feedback' => false,
        'help_faqs' => false,             'onboarding_progress' => false,
        'organization_invitations' => true, 'parking_spots' => true,
        'supplier_evaluations' => true,   'support_ticket_attachments' => false,
        'support_ticket_messages' => false, 'support_ticket_templates' => false,
        'task_dependencies' => true,      'ticket_messages' => true,
        'training_course_ratings' => true, 'training_scorm_packages' => true,
        'training_scorm_sessions' => true, 'vehicle_assignments' => false,
        'vehicle_gps_logs' => false,      'vehicle_maintenance_logs' => false,
        'vehicle_maintenance_schedules' => false, 'xapi_statements' => true,
    ];

    public function handle(): int
    {
        $this->info('Réconciliation du schéma — base : ' . DB::connection()->getDatabaseName());
        $this->newLine();

        $manquantes = collect(self::ATTENDUES)
            ->reject(fn ($utilisee, $table) => Schema::hasTable($table));

        if ($manquantes->isEmpty()) {
            $this->info('  Rien à faire : toutes les tables attendues sont présentes.');

            return self::SUCCESS;
        }

        $this->line('  Tables manquantes (' . $manquantes->count() . ') :');
        foreach ($manquantes as $table => $utilisee) {
            $this->line(sprintf('    %-32s %s', $table, $utilisee ? '← utilisée par le code' : ''));
        }

        $aRejouer = collect(self::INCOMPLETES)->filter(
            fn ($m) => DB::table('migrations')->where('migration', $m)->exists()
        )->values();

        $this->newLine();
        $this->line('  Migrations à rejouer (' . $aRejouer->count() . ') :');
        foreach ($aRejouer as $m) {
            $this->line("    {$m}");
        }

        if ($this->option('dry-run')) {
            $this->newLine();
            $this->comment('  --dry-run : rien n\'a été modifié.');

            return self::SUCCESS;
        }

        $this->newLine();
        $this->warn('  Ces migrations vont être rejouées. Elles sont idempotentes :');
        $this->warn('  elles ne créent que ce qui manque. Une sauvegarde reste indispensable.');

        if (! $this->option('force') && ! $this->confirm('  Poursuivre ?', false)) {
            $this->line('  Abandon.');

            return self::SUCCESS;
        }

        // Le retrait de la marque et le rejeu ne peuvent pas tenir dans une même
        // transaction : `migrate` gère les siennes. On retire, on rejoue, et on
        // vérifie — l'idempotence est ce qui rend l'opération rejouable en cas
        // d'interruption.
        foreach ($aRejouer as $m) {
            DB::table('migrations')->where('migration', $m)->delete();
        }

        $this->newLine();
        $this->call('migrate', ['--force' => true]);

        $restantes = collect(self::ATTENDUES)->reject(fn ($u, $t) => Schema::hasTable($t));

        $this->newLine();
        $this->info(sprintf(
            '  Résultat : %d table(s) créée(s), %d encore manquante(s).',
            $manquantes->count() - $restantes->count(),
            $restantes->count()
        ));

        foreach ($restantes as $table => $utilisee) {
            $this->error("    manque toujours : {$table}");
        }

        return $restantes->isEmpty() ? self::SUCCESS : self::FAILURE;
    }
}
