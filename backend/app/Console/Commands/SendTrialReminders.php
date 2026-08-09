<?php

namespace App\Console\Commands;

use App\Jobs\SendTrialExpiryReminders;
use Illuminate\Console\Command;

/**
 * Commande Artisan — Envoie les rappels d'expiration d'essai.
 *
 * Usage :
 *   php artisan secretis:trial-reminders
 *   php artisan secretis:trial-reminders --sync   (exécution synchrone, sans queue)
 *
 * Planification dans routes/console.php ou App\Console\Kernel :
 *   $schedule->command('secretis:trial-reminders')->dailyAt('08:00');
 *
 * @deprecated REMPLACÉE par `php artisan licence:emails`.
 *
 * La séquence officielle compte sept jalons (J+1, J-3, J-1, J0, J+7 —
 * sections 5.4 et 8.6 — puis J+60 et J+83 — section 8.8). Celle-ci en couvre
 * trois, dont un (J-7) qui n'existe pas au cahier, et il lui manque les deux
 * seuls qui comptent vraiment : la confirmation de bascule en Découverte, et
 * l'avertissement avant purge.
 *
 * Elle reste enregistrée dans App\Console\Kernel (~ligne 247). Le remplacement
 * de cette entrée de planification relève du chantier « planification » : cette
 * commande n'est donc pas supprimée ici, elle est signalée.
 */
class SendTrialReminders extends Command
{
    protected $signature = 'secretis:trial-reminders
                            {--sync : Exécuter de manière synchrone sans passer par la queue}
                            {--dry-run : Simuler sans envoyer les emails}';

    protected $description = 'Envoie les rappels d\'expiration d\'essai aux organisations (J-7, J-3, J-1)';

    public function handle(): int
    {
        $this->info('[SECRETIS] Démarrage des rappels d\'expiration d\'essai');
        $this->newLine();

        if ($this->option('dry-run')) {
            $this->warn('Mode DRY-RUN activé — aucun email ne sera envoyé.');
            $this->listPendingOrganisations();
            return self::SUCCESS;
        }

        if ($this->option('sync')) {
            $this->info('Exécution synchrone (sans queue)...');
            (new SendTrialExpiryReminders())->handle();
            $this->info('Terminé.');
        } else {
            SendTrialExpiryReminders::dispatch();
            $this->info('Job dispatché dans la queue "emails".');
            $this->line('Surveillez les logs : tail -f storage/logs/laravel.log');
        }

        $this->newLine();
        $this->info('[SECRETIS] Commande terminée avec succès.');

        return self::SUCCESS;
    }

    protected function listPendingOrganisations(): void
    {
        $days = [7, 3, 1];

        foreach ($days as $d) {
            $targetDate = \Carbon\Carbon::today()->addDays($d)->toDateString();

            $orgs = \App\Models\Organisation::query()
                ->where('status', 'trial')
                ->whereDate('trial_ends_at', $targetDate)
                ->whereNull('subscription_activated_at')
                ->with('admin')
                ->get();

            if ($orgs->isEmpty()) {
                $this->line("  J-{$d} ({$targetDate}) : aucune organisation");
                continue;
            }

            $this->info("  J-{$d} ({$targetDate}) : {$orgs->count()} organisation(s)");

            $rows = $orgs->map(fn($o) => [
                $o->id,
                $o->name,
                $o->admin?->email ?? '—',
                $o->trial_ends_at?->toDateString() ?? '—',
            ]);

            $this->table(
                ['ID', 'Organisation', 'Email Admin', 'Expiration'],
                $rows->toArray()
            );
        }
    }
}
