<?php

namespace App\Console\Commands;

use App\Services\GdprService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ProcessGdprRetention extends Command
{
    protected $signature   = 'secretis:gdpr-retention';
    protected $description = 'Applique les politiques de rétention RGPD (CRON 1er du mois, 3h)';

    public function __construct(private readonly GdprService $gdprService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('[RGPD] Démarrage de la purge de rétention — ' . now()->format('d/m/Y H:i'));
        Log::channel('gdpr')->info('Retention job started', ['started_at' => now()->toIso8601String()]);

        try {
            $report = $this->gdprService->processRetentionPolicies();

            $totalDeleted = collect($report)->sum('deleted');
            $errors       = collect($report)->where('status', 'error')->count();

            foreach ($report as $entry) {
                if ($entry['status'] === 'success') {
                    $this->line(sprintf(
                        '  ✓  [Org %d] %s — %d enregistrement(s) supprimé(s) (avant %s)',
                        $entry['org_id'],
                        $entry['policy'],
                        $entry['deleted'],
                        $entry['cutoff']
                    ));
                } else {
                    $this->error(sprintf(
                        '  ✗  [Org %d] %s — Erreur : %s',
                        $entry['org_id'],
                        $entry['policy'],
                        $entry['error']
                    ));
                }
            }

            $this->info(sprintf(
                '[RGPD] Purge terminée. Total supprimé : %d | Erreurs : %d',
                $totalDeleted,
                $errors
            ));

            // Envoyer le rapport au DPO
            $this->sendDpoReport($report, $totalDeleted, $errors);

            Log::channel('gdpr')->info('Retention job completed', [
                'total_deleted' => $totalDeleted,
                'errors'        => $errors,
                'policies_run'  => count($report),
            ]);

            return $errors > 0 ? self::FAILURE : self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('[RGPD] Erreur critique : ' . $e->getMessage());
            Log::channel('gdpr')->error('Retention job failed', ['error' => $e->getMessage()]);
            return self::FAILURE;
        }
    }

    private function sendDpoReport(array $report, int $totalDeleted, int $errors): void
    {
        $dpoEmail = config('gdpr.dpo_email', env('GDPR_DPO_EMAIL'));

        if (! $dpoEmail) {
            $this->warn('[RGPD] Aucun email DPO configuré (GDPR_DPO_EMAIL). Rapport non envoyé.');
            return;
        }

        try {
            Mail::to($dpoEmail)->send(new \App\Mail\Gdpr\RetentionReport($report, $totalDeleted, $errors));
            $this->info('[RGPD] Rapport envoyé au DPO : ' . $dpoEmail);
        } catch (\Throwable $e) {
            $this->warn('[RGPD] Impossible d\'envoyer le rapport DPO : ' . $e->getMessage());
        }
    }
}
