<?php

namespace App\Console\Commands;

use App\Services\CourrierService;
use Illuminate\Console\Command;

/**
 * Alerte quotidienne sur les courriers dont le délai de traitement est dépassé.
 *
 * `CourrierService::sendAlertIfOverdue()` existait mais n'avait AUCUN appelant :
 * ni commande, ni tâche planifiée, ni contrôleur. Les relances du registre
 * étaient donc du code mort, alors que le respect des délais de traitement est
 * l'indicateur central d'un secrétariat.
 */
class CourrierOverdueAlerts extends Command
{
    protected $signature = 'secretis:courrier:overdue-alerts
                            {--dry-run : Affiche les courriers concernés sans notifier}';

    protected $description = 'Notifie les affectataires des courriers dont le délai de traitement est dépassé';

    public function handle(CourrierService $courrierService): int
    {
        if ($this->option('dry-run')) {
            $mails = \App\Models\MailRegistry::overdue()
                ->with(['assignee:id,name', 'registeredBy:id,name', 'organization:id,name'])
                ->get();

            if ($mails->isEmpty()) {
                $this->info('Aucun courrier en retard.');

                return self::SUCCESS;
            }

            $this->table(
                ['Référence', 'Objet', 'Reçu le', 'Délai', 'Affecté à', 'Organisation'],
                $mails->map(fn ($m) => [
                    $m->reference,
                    \Illuminate\Support\Str::limit((string) $m->subject, 40),
                    optional($m->received_at)->format('d/m/Y'),
                    ($m->processing_delay_days ?? 3) . ' j',
                    $m->assignee->name ?? $m->registeredBy->name ?? '—',
                    $m->organization->name ?? '—',
                ])->all()
            );

            $this->warn("{$mails->count()} courrier(s) en retard — aucune notification envoyée (--dry-run).");

            return self::SUCCESS;
        }

        $resultat = $courrierService->sendAlertIfOverdue();

        $this->info(
            "{$resultat['mails']} courrier(s) en retard — {$resultat['notified']} notification(s) envoyée(s)."
        );

        return self::SUCCESS;
    }
}
