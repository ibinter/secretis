<?php

namespace App\Console\Commands;

use App\Services\MonitoringService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redis;

/**
 * MonitoringReport — Rapport de santé quotidien SECRETIS ERP
 *
 * Commande : php artisan secretis:monitor
 * CRON     : 0 8 * * * → tous les jours à 8h00
 *
 * Contenu du rapport :
 *   - Nombre d'erreurs de la veille
 *   - Requêtes lentes (top 10)
 *   - Taux de cache hit
 *   - Organisations actives
 *   - Paiements échoués
 *   - Espace disque
 */
class MonitoringReport extends Command
{
    protected $signature   = 'secretis:monitor {--dry-run : Affiche le rapport sans l\'envoyer}';
    protected $description = 'Génère et envoie le rapport de santé quotidien SECRETIS ERP';

    public function __construct(private readonly MonitoringService $monitoring)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('Génération du rapport de santé quotidien...');

        $report = $this->buildReport();

        if ($this->option('dry-run')) {
            $this->line($report['text']);
            $this->info('Dry-run : rapport non envoyé.');

            return self::SUCCESS;
        }

        $this->sendReport($report);

        $this->info('Rapport envoyé avec succès.');

        return self::SUCCESS;
    }

    // ─── Construction du rapport ──────────────────────────────────────────────

    private function buildReport(): array
    {
        $yesterday       = now()->subDay();
        $errors          = $this->countYesterdayErrors();
        $slowQueries     = $this->monitoring->getSlowQueries(10);
        $cacheHitRate    = $this->monitoring->getCacheHitRate();
        $activeOrgs      = $this->monitoring->getActiveOrganizations();
        $failedPayments  = $this->getFailedPayments();
        $diskInfo        = $this->getDiskInfo();
        $queueHealth     = $this->monitoring->getQueueHealth();
        $requestsYest    = $this->getYesterdayTotalRequests();

        $textLines = [
            '════════════════════════════════════════════════════════',
            '   SECRETIS ERP — Rapport de Santé Quotidien',
            '   ' . now()->format('l d F Y'),
            '════════════════════════════════════════════════════════',
            '',
            '📊 ACTIVITÉ HIER (' . $yesterday->format('d/m/Y') . ')',
            '  • Requêtes totales   : ' . number_format($requestsYest),
            '  • Erreurs 5xx        : ' . number_format($errors),
            '  • Taux d\'erreur      : ' . ($requestsYest > 0 ? round(($errors / $requestsYest) * 100, 2) : 0) . '%',
            '',
            '⚡ PERFORMANCE',
            '  • Taux de cache hit  : ' . $cacheHitRate . '%',
        ];

        if (! empty($slowQueries)) {
            $textLines[] = '';
            $textLines[] = '🐌 TOP ' . count($slowQueries) . ' ROUTES LENTES';
            foreach ($slowQueries as $i => $q) {
                $textLines[] = sprintf(
                    '  %2d. %-40s %8.1f ms (%d appels)',
                    $i + 1,
                    $q['route'],
                    $q['avg_ms'],
                    $q['total_calls']
                );
            }
        }

        $textLines = array_merge($textLines, [
            '',
            '🏢 ORGANISATIONS',
            '  • Organisations actives : ' . number_format($activeOrgs),
            '  • En période d\'essai    : ' . $this->getTrialOrganizations(),
            '',
            '💳 PAIEMENTS',
            '  • Paiements échoués hier : ' . number_format($failedPayments),
            '',
            '📦 QUEUE',
            '  • Jobs en attente : ' . number_format($queueHealth['pending']),
            '  • Jobs échoués    : ' . number_format($queueHealth['failed']),
            '',
            '💾 DISQUE',
            '  • Espace libre : ' . $diskInfo['free_gb'] . ' Go (' . $diskInfo['free_pct'] . '% libre)',
            '  • Espace total : ' . $diskInfo['total_gb'] . ' Go',
            '',
            '════════════════════════════════════════════════════════',
            '  Rapport généré le ' . now()->toDateTimeString(),
            '  SECRETIS ERP v' . config('app.version', '1.0.0'),
            '════════════════════════════════════════════════════════',
        ]);

        $text = implode("\n", $textLines);

        return compact(
            'text', 'errors', 'slowQueries', 'cacheHitRate',
            'activeOrgs', 'failedPayments', 'diskInfo', 'queueHealth', 'requestsYest'
        );
    }

    // ─── Envoi ────────────────────────────────────────────────────────────────

    private function sendReport(array $report): void
    {
        $adminEmail = config('monitoring.admin_email', config('mail.from.address'));

        try {
            Mail::raw(
                $report['text'],
                fn ($message) => $message
                    ->to($adminEmail)
                    ->subject('[SECRETIS] Rapport de santé — ' . now()->format('d/m/Y'))
            );
        } catch (\Throwable $e) {
            Log::error('Échec envoi rapport monitoring', ['error' => $e->getMessage()]);
            $this->error('Impossible d\'envoyer le rapport : ' . $e->getMessage());
        }
    }

    // ─── Collecteurs ─────────────────────────────────────────────────────────

    private function countYesterdayErrors(): int
    {
        $total = 0;
        $start = now()->subDay()->startOfDay();

        for ($i = 0; $i < 1440; $i++) {
            $minute = $start->copy()->addMinutes($i)->format('YmdHi');
            $total += (int) Redis::get("metrics:errors:{$minute}");
        }

        return $total;
    }

    private function getYesterdayTotalRequests(): int
    {
        $total = 0;
        $start = now()->subDay()->startOfDay();

        for ($i = 0; $i < 1440; $i++) {
            $minute = $start->copy()->addMinutes($i)->format('YmdHi');
            $total += (int) Redis::get("metrics:total:{$minute}");
        }

        return $total;
    }

    private function getFailedPayments(): int
    {
        try {
            return (int) DB::table('payments')
                ->where('status', 'failed')
                ->whereDate('created_at', now()->subDay()->toDateString())
                ->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getDiskInfo(): array
    {
        $path       = storage_path();
        $freeBytes  = disk_free_space($path);
        $totalBytes = disk_total_space($path);
        $freePct    = round(($freeBytes / $totalBytes) * 100, 1);

        return [
            'free_gb'  => round($freeBytes / 1024 / 1024 / 1024, 2),
            'total_gb' => round($totalBytes / 1024 / 1024 / 1024, 2),
            'free_pct' => $freePct,
        ];
    }

    private function getTrialOrganizations(): int
    {
        try {
            return (int) DB::table('organizations')
                ->where('status', 'trial')
                ->count();
        } catch (\Throwable) {
            return 0;
        }
    }
}
