<?php

namespace App\Console\Commands;

use App\Services\AccountingService;
use Illuminate\Console\Command;

/**
 * SendOverdueReminders — Commande CRON pour les relances factures impayées
 *
 * Exécutée chaque matin à 08:30 par le Scheduler Laravel.
 * - Marque les factures envoyées et dépassées comme "overdue"
 * - Envoie des relances email à J+7, J+14, J+30
 */
class SendOverdueReminders extends Command
{
    protected $signature   = 'secretis:accounting:overdue-reminders';
    protected $description = 'Envoie les relances email pour les factures impayées (J+7, J+14, J+30)';

    public function handle(AccountingService $accounting): int
    {
        $this->info('[Comptabilité] Lancement des relances factures impayées...');

        try {
            $accounting->sendOverdueReminders();
            $this->info('[Comptabilité] Relances traitées avec succès.');
        } catch (\Throwable $e) {
            $this->error('[Comptabilité] Erreur : ' . $e->getMessage());
            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }
}
