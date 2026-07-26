<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * SECRETIS ERP — MonitoringController (section 29.2)
 *
 * Dashboard d'observabilité système pour le SuperAdmin IBIG.
 * Expose un health-check JSON et un dashboard Inertia avec auto-refresh.
 */
class MonitoringController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'role:superadmin_ibig']);
    }

    /**
     * GET /superadmin/monitoring
     * Affiche le dashboard Inertia de monitoring.
     */
    public function dashboard(): InertiaResponse
    {
        return Inertia::render('SuperAdmin/Monitoring/Dashboard', [
            'initialHealth'  => $this->buildHealthPayload(),
            'failedJobs'     => $this->getFailedJobsDetail(),
            'cronStatus'     => $this->getCronStatus(),
            'backupStatus'   => $this->getBackupStatus(),
        ]);
    }

    /**
     * GET /api/v1/superadmin/health
     * Health-check JSON complet (utilisé par le frontend pour le polling).
     */
    public function healthCheck(): JsonResponse
    {
        return response()->json($this->buildHealthPayload());
    }

    // ── Construction du payload de santé ─────────────────────────────────────

    private function buildHealthPayload(): array
    {
        $services = [
            'database' => $this->checkDatabase(),
            'redis'    => $this->checkRedis(),
            'queue'    => $this->checkQueue(),
            'storage'  => $this->checkStorage(),
            'smtp'     => $this->checkSmtp(),
            'ai_sara'  => $this->checkAi(),
            'reverb'   => $this->checkReverb(),
        ];

        $statuses    = array_column($services, 'status');
        $globalStatus = in_array('down', $statuses, true)
            ? 'down'
            : (in_array('degraded', $statuses, true) ? 'degraded' : 'ok');

        return [
            'status'    => $globalStatus,
            'timestamp' => now()->toIso8601String(),
            'version'   => config('app.version', '2.0.0'),
            'services'  => $services,
            'metrics'   => [
                'disk_usage_percent' => $this->getDiskUsage(),
                'failed_jobs_24h'    => $this->getFailedJobs(),
                'queue_size'         => $this->getQueueSize(),
                'response_time_ms'   => $this->getAvgResponseTime(),
            ],
        ];
    }

    // ── Vérifications de services ─────────────────────────────────────────────

    private function checkDatabase(): array
    {
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $ms = round((microtime(true) - $start) * 1000, 1);

            return [
                'status'     => $ms < 500 ? 'ok' : 'degraded',
                'latency_ms' => $ms,
                'message'    => "Connecté ({$ms} ms)",
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'down',
                'message' => 'Impossible de joindre la base de données : ' . $e->getMessage(),
            ];
        }
    }

    private function checkRedis(): array
    {
        try {
            $start = microtime(true);
            Redis::ping();
            $ms = round((microtime(true) - $start) * 1000, 1);

            return [
                'status'     => 'ok',
                'latency_ms' => $ms,
                'message'    => "PONG ({$ms} ms)",
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'down',
                'message' => 'Redis indisponible : ' . $e->getMessage(),
            ];
        }
    }

    private function checkQueue(): array
    {
        try {
            $pending = $this->getQueueSize();
            $failed  = $this->getFailedJobs();

            $status = match (true) {
                $failed > 50  => 'degraded',
                $failed > 0   => 'degraded',
                $pending > 500 => 'degraded',
                default        => 'ok',
            };

            return [
                'status'  => $status,
                'pending' => $pending,
                'failed'  => $failed,
                'message' => "En attente : {$pending} · Échoués : {$failed}",
            ];
        } catch (\Throwable $e) {
            return ['status' => 'down', 'message' => $e->getMessage()];
        }
    }

    private function checkStorage(): array
    {
        try {
            $usagePct = $this->getDiskUsage();
            $status   = match (true) {
                $usagePct >= 90 => 'down',
                $usagePct >= 75 => 'degraded',
                default         => 'ok',
            };

            // Test d'écriture
            Storage::put('_health_check_' . now()->timestamp . '.tmp', 'ok');

            return [
                'status'    => $status,
                'usage_pct' => $usagePct,
                'message'   => "Espace disque utilisé : {$usagePct}%",
            ];
        } catch (\Throwable $e) {
            return ['status' => 'down', 'message' => $e->getMessage()];
        }
    }

    private function checkSmtp(): array
    {
        try {
            // Vérifie la dernière tentative d'envoi d'email loggée
            $lastSuccess = Cache::get('smtp_last_success');
            if ($lastSuccess && now()->diffInMinutes($lastSuccess) < 60) {
                return ['status' => 'ok', 'message' => 'Dernière connexion SMTP réussie il y a moins d\'1h'];
            }

            // Tentative de connexion TCP au serveur SMTP
            $host    = config('mail.mailers.smtp.host', 'localhost');
            $port    = config('mail.mailers.smtp.port', 587);
            $timeout = 3;
            $conn    = @fsockopen($host, $port, $errno, $errstr, $timeout);

            if ($conn) {
                fclose($conn);
                return ['status' => 'ok', 'message' => "SMTP {$host}:{$port} accessible"];
            }

            return ['status' => 'degraded', 'message' => "SMTP {$host}:{$port} inaccessible : {$errstr}"];
        } catch (\Throwable $e) {
            return ['status' => 'degraded', 'message' => $e->getMessage()];
        }
    }

    private function checkAi(): array
    {
        try {
            $lastCall = Cache::get('ai_sara_last_success');
            if ($lastCall && now()->diffInMinutes($lastCall) < 30) {
                return ['status' => 'ok', 'message' => 'IA SARA opérationnelle (dernier appel < 30 min)'];
            }

            $key = config('services.openai.key') ?? config('services.ai.key');
            if (! $key) {
                return ['status' => 'degraded', 'message' => 'Clé API IA non configurée'];
            }

            return ['status' => 'degraded', 'message' => 'Aucun appel IA récent (>30 min)'];
        } catch (\Throwable $e) {
            return ['status' => 'down', 'message' => $e->getMessage()];
        }
    }

    private function checkReverb(): array
    {
        try {
            $host = config('reverb.servers.reverb.host', 'localhost');
            $port = config('reverb.servers.reverb.port', 8080);
            $conn = @fsockopen($host, $port, $errno, $errstr, 2);

            if ($conn) {
                fclose($conn);
                return ['status' => 'ok', 'message' => "WebSocket Reverb {$host}:{$port} accessible"];
            }

            return ['status' => 'down', 'message' => "WebSocket {$host}:{$port} inaccessible"];
        } catch (\Throwable $e) {
            return ['status' => 'down', 'message' => $e->getMessage()];
        }
    }

    // ── Métriques ─────────────────────────────────────────────────────────────

    private function getDiskUsage(): float
    {
        $total = @disk_total_space(storage_path());
        $free  = @disk_free_space(storage_path());

        if (! $total || ! $free) {
            return 0.0;
        }

        return round((($total - $free) / $total) * 100, 1);
    }

    private function getFailedJobs(): int
    {
        try {
            return DB::table('failed_jobs')
                ->where('failed_at', '>=', now()->subHours(24))
                ->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getQueueSize(): int
    {
        try {
            return DB::table('jobs')->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getAvgResponseTime(): float
    {
        // Récupère le temps de réponse moyen depuis le cache (alimenté par un middleware)
        return (float) Cache::get('avg_response_time_ms', 0);
    }

    private function getFailedJobsDetail(): array
    {
        try {
            return DB::table('failed_jobs')
                ->orderByDesc('failed_at')
                ->limit(20)
                ->get()
                ->map(fn($job) => [
                    'id'         => $job->id,
                    'connection' => $job->connection,
                    'queue'      => $job->queue,
                    'payload'    => json_decode($job->payload, true)['displayName'] ?? 'Inconnu',
                    'exception'  => substr($job->exception, 0, 200),
                    'failed_at'  => $job->failed_at,
                ])
                ->toArray();
        } catch (\Throwable) {
            return [];
        }
    }

    private function getCronStatus(): array
    {
        // Statuts des tâches CRON — alimentés par le scheduler qui met à jour le cache
        return Cache::get('cron_status', [
            ['name' => 'Nettoyage fichiers temporaires', 'schedule' => 'Quotidien 02h00', 'last_run' => null, 'status' => 'unknown'],
            ['name' => 'Envoi emails trial expiring',    'schedule' => 'Quotidien 08h00', 'last_run' => null, 'status' => 'unknown'],
            ['name' => 'Sauvegarde base de données',     'schedule' => 'Quotidien 03h00', 'last_run' => null, 'status' => 'unknown'],
            ['name' => 'Calcul métriques SaaS',          'schedule' => 'Toutes les heures', 'last_run' => null, 'status' => 'unknown'],
            ['name' => 'Purge audit logs > 1 an',        'schedule' => 'Hebdomadaire',    'last_run' => null, 'status' => 'unknown'],
        ]);
    }

    private function getBackupStatus(): array
    {
        return Cache::get('backup_status', [
            'last_backup_at' => null,
            'size_mb'        => null,
            'status'         => 'unknown',
            'location'       => config('backup.destination.disks.0', 'local'),
        ]);
    }

    /**
     * POST /api/v1/superadmin/jobs/{id}/retry
     * Rejoue un job échoué.
     */
    public function retryJob(int $id): JsonResponse
    {
        try {
            $job = DB::table('failed_jobs')->find($id);
            if (! $job) {
                return response()->json(['error' => 'Job introuvable'], 404);
            }

            \Artisan::call('queue:retry', ['id' => [$job->uuid]]);

            return response()->json(['message' => 'Job remis en queue avec succès']);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/v1/superadmin/backup/trigger
     * Déclenche une sauvegarde manuelle.
     */
    public function triggerBackup(): JsonResponse
    {
        try {
            \Artisan::call('backup:run');
            return response()->json(['message' => 'Sauvegarde déclenchée avec succès']);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
