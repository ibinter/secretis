<?php

namespace App\Console\Commands;

use App\Jobs\SendMonitoringAlert;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * CheckSystemHealth — Vérification santé système SECRETIS ERP
 *
 * Commande : php artisan secretis:health-check
 * CRON     : * /5 * * * → toutes les 5 minutes
 *
 * Vérifie :
 *   - Base de données (connexion + latence)
 *   - Redis (ping)
 *   - Queue (backlog + failed)
 *   - Disque (espace libre)
 *   - Taux d'erreur HTTP
 *   - Licences expirant dans 7 jours
 *
 * Met à jour le statut dans Redis (lu par /health).
 * Dispatche SendMonitoringAlert si un composant est dégradé.
 */
class CheckSystemHealth extends Command
{
    protected $signature   = 'secretis:health-check {--verbose : Affiche le détail de chaque check}';
    protected $description = 'Vérifie la santé de tous les composants SECRETIS et dispatche des alertes si nécessaire';

    public function handle(): int
    {
        $this->line('');
        $this->info('=== SECRETIS Health Check — ' . now()->toDateTimeString() . ' ===');

        $results = [];

        $results['database'] = $this->checkDatabase();
        $results['redis']    = $this->checkRedis();
        $results['queue']    = $this->checkQueue();
        $results['disk']     = $this->checkDisk();
        $results['errors']   = $this->checkErrorRate();

        // Vérification des licences expirant bientôt (non bloquant)
        $this->checkExpiringLicenses();

        // ── Calcul du statut global ───────────────────────────────────────────
        $statuses     = array_column($results, 'status');
        $globalStatus = 'healthy';

        if (in_array('unhealthy', $statuses)) {
            $globalStatus = 'unhealthy';
        } elseif (in_array('degraded', $statuses)) {
            $globalStatus = 'degraded';
        }

        // ── Mise à jour Redis (lu par /health avec cache 30s) ─────────────────
        $this->updateHealthCache($results, $globalStatus);

        // ── Affichage ─────────────────────────────────────────────────────────
        $this->displayResults($results, $globalStatus);

        return $globalStatus === 'unhealthy' ? self::FAILURE : self::SUCCESS;
    }

    // ─── Checks ──────────────────────────────────────────────────────────────

    private function checkDatabase(): array
    {
        try {
            $start    = microtime(true);
            DB::select('SELECT 1');
            $latencyMs = round((microtime(true) - $start) * 1000, 2);

            $status = 'healthy';
            if ($latencyMs > 1000) {
                $status = 'unhealthy';
                SendMonitoringAlert::slowDatabase($latencyMs)->dispatch();
            } elseif ($latencyMs > 300) {
                $status = 'degraded';
                SendMonitoringAlert::slowDatabase($latencyMs)->dispatch();
            }

            return ['status' => $status, 'latency_ms' => $latencyMs];
        } catch (\Throwable $e) {
            Log::channel('slack')->critical('DB inaccessible', ['error' => $e->getMessage()]);

            return ['status' => 'unhealthy', 'error' => $e->getMessage()];
        }
    }

    private function checkRedis(): array
    {
        try {
            $start    = microtime(true);
            Redis::ping();
            $latencyMs = round((microtime(true) - $start) * 1000, 2);

            return ['status' => 'healthy', 'latency_ms' => $latencyMs];
        } catch (\Throwable $e) {
            Log::channel('slack')->critical('Redis inaccessible', ['error' => $e->getMessage()]);

            return ['status' => 'unhealthy', 'error' => $e->getMessage()];
        }
    }

    private function checkQueue(): array
    {
        try {
            $pending = (int) Redis::llen('queues:default');
            $failed  = (int) DB::table('failed_jobs')->count();

            $status = 'healthy';

            if ($pending > 2000 || $failed > 200) {
                $status = 'unhealthy';
                SendMonitoringAlert::queueBacklog($pending, $failed)->dispatch();
            } elseif ($pending > 500 || $failed > 50) {
                $status = 'degraded';
                SendMonitoringAlert::queueBacklog($pending, $failed)->dispatch();
            }

            return ['status' => $status, 'pending' => $pending, 'failed' => $failed];
        } catch (\Throwable $e) {
            return ['status' => 'degraded', 'error' => $e->getMessage()];
        }
    }

    private function checkDisk(): array
    {
        $path       = storage_path();
        $freeBytes  = disk_free_space($path);
        $totalBytes = disk_total_space($path);
        $freePct    = round(($freeBytes / $totalBytes) * 100, 1);
        $freeGb     = round($freeBytes / 1024 / 1024 / 1024, 2);

        $status = 'healthy';

        if ($freePct < 5) {
            $status = 'unhealthy';
            SendMonitoringAlert::diskSpaceLow($freePct, $freeGb)->dispatch();
        } elseif ($freePct < 10) {
            $status = 'degraded';
            SendMonitoringAlert::diskSpaceLow($freePct, $freeGb)->dispatch();
        }

        return ['status' => $status, 'free_pct' => $freePct, 'free_gb' => $freeGb];
    }

    private function checkErrorRate(): array
    {
        $total = 0;
        $errors = 0;

        for ($i = 0; $i < 5; $i++) {
            $minute = now()->subMinutes($i)->format('YmdHi');
            $errors += (int) Redis::get("metrics:errors:{$minute}");
            $total  += (int) Redis::get("metrics:total:{$minute}");
        }

        $rate = $total > 0 ? round(($errors / $total) * 100, 2) : 0;

        $status = 'healthy';

        if ($rate > 10) {
            $status = 'unhealthy';
            SendMonitoringAlert::errorRateHigh($rate)->dispatch();
        } elseif ($rate > 5) {
            $status = 'degraded';
            SendMonitoringAlert::errorRateHigh($rate)->dispatch();
        }

        return ['status' => $status, 'error_rate_pct' => $rate, 'window_minutes' => 5];
    }

    private function checkExpiringLicenses(): void
    {
        try {
            $expiring = DB::table('licenses')
                ->join('organizations', 'licenses.organization_id', '=', 'organizations.id')
                ->where('licenses.status', 'active')
                ->whereBetween('licenses.expires_at', [now(), now()->addDays(7)])
                ->select('organizations.id', 'organizations.name', 'licenses.expires_at')
                ->get();

            foreach ($expiring as $license) {
                SendMonitoringAlert::licenseExpiringSoon(
                    $license->id,
                    $license->name,
                    $license->expires_at
                )->dispatch();
            }
        } catch (\Throwable $e) {
            Log::warning('checkExpiringLicenses échoué', ['error' => $e->getMessage()]);
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function updateHealthCache(array $results, string $globalStatus): void
    {
        try {
            $payload = [
                'status'    => $globalStatus,
                'checks'    => $results,
                'version'   => config('app.version', '1.0.0'),
                'timestamp' => now()->toIso8601String(),
            ];

            // Stockage dans Redis avec TTL de 5 minutes (health check toutes les 5 min)
            Redis::setex('health_status_raw', 300, json_encode($payload));

            // Invalide le cache de 30s de /health pour forcer le prochain GET
            \Illuminate\Support\Facades\Cache::forget('health_status');
        } catch (\Throwable $e) {
            Log::warning('updateHealthCache échoué', ['error' => $e->getMessage()]);
        }
    }

    private function displayResults(array $results, string $globalStatus): void
    {
        $icons = ['healthy' => '✅', 'degraded' => '🟠', 'unhealthy' => '❌'];

        $this->line('');
        foreach ($results as $component => $data) {
            $icon = $icons[$data['status']] ?? '❓';
            $this->line("  {$icon} {$component} → {$data['status']}");

            if ($this->option('verbose')) {
                foreach ($data as $k => $v) {
                    if ($k === 'status') {
                        continue;
                    }
                    $this->line("      {$k}: {$v}");
                }
            }
        }

        $this->line('');
        $globalIcon = $icons[$globalStatus] ?? '❓';
        $this->info("  {$globalIcon} Statut global : {$globalStatus}");
        $this->line('');
    }
}
