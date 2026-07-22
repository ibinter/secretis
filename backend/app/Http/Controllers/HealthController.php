<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;

/**
 * HealthController — Endpoints de santé SECRETIS ERP
 *
 * GET /health          → Public, sans auth, caché 30s
 * GET /health/detailed → SuperAdmin uniquement, informations complètes
 */
class HealthController extends Controller
{
    // ─── GET /health ─────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $cached = Cache::get('health_status');
        if ($cached) {
            return response()->json($cached, $cached['status'] === 'unhealthy' ? 503 : 200);
        }

        $checks = [
            'database' => $this->checkDatabase(),
            'redis'    => $this->checkRedis(),
            'queue'    => $this->checkQueue(),
            'disk'     => $this->checkDisk(),
            'reverb'   => $this->checkReverb(),
        ];

        $globalStatus = $this->resolveGlobalStatus($checks);

        $payload = [
            'status'    => $globalStatus,
            'checks'    => $checks,
            'version'   => config('app.version', '1.0.0'),
            'timestamp' => now()->toIso8601String(),
        ];

        Cache::put('health_status', $payload, 30);

        $httpCode = $globalStatus === 'unhealthy' ? 503 : 200;

        return response()->json($payload, $httpCode);
    }

    // ─── GET /health/detailed ────────────────────────────────────────────────

    public function detailed(Request $request): JsonResponse
    {
        // Seuls les SuperAdmin peuvent accéder au détail
        if (! Auth::check() || ! Auth::user()->hasRole('super_admin')) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $checks = [
            'database' => $this->checkDatabase(),
            'redis'    => $this->checkRedis(),
            'queue'    => $this->checkQueue(),
            'disk'     => $this->checkDisk(),
            'reverb'   => $this->checkReverb(),
        ];

        $globalStatus = $this->resolveGlobalStatus($checks);

        $payload = [
            'status'              => $globalStatus,
            'checks'              => $checks,
            'version'             => config('app.version', '1.0.0'),
            'timestamp'           => now()->toIso8601String(),
            'detailed'            => [
                'database_size_mb'      => $this->getDatabaseSizeMb(),
                'active_organizations'  => $this->getActiveOrganizations(),
                'last_backup'           => $this->getLastBackup(),
                'php_version'           => PHP_VERSION,
                'laravel_version'       => app()->version(),
                'node_version'          => $this->getNodeVersion(),
                'memory_used_mb'        => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
                'memory_limit'          => ini_get('memory_limit'),
                'failed_jobs_count'     => DB::table('failed_jobs')->count(),
                'pending_jobs_count'    => $this->getPendingJobsCount(),
            ],
        ];

        return response()->json($payload, $globalStatus === 'unhealthy' ? 503 : 200);
    }

    // ─── Checks individuels ──────────────────────────────────────────────────

    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            $start = microtime(true);
            DB::select('SELECT 1');
            $latencyMs = round((microtime(true) - $start) * 1000, 2);

            $status = $latencyMs > 500 ? 'degraded' : 'healthy';

            return [
                'status'     => $status,
                'latency_ms' => $latencyMs,
                'message'    => $status === 'degraded' ? 'Latence élevée' : 'OK',
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'unhealthy',
                'message' => 'Connexion impossible : ' . $e->getMessage(),
            ];
        }
    }

    private function checkRedis(): array
    {
        try {
            $start = microtime(true);
            Redis::ping();
            $latencyMs = round((microtime(true) - $start) * 1000, 2);

            return [
                'status'     => 'healthy',
                'latency_ms' => $latencyMs,
                'message'    => 'OK',
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'unhealthy',
                'message' => 'Redis inaccessible : ' . $e->getMessage(),
            ];
        }
    }

    private function checkQueue(): array
    {
        try {
            $pending = $this->getPendingJobsCount();
            $failed  = DB::table('failed_jobs')->count();

            $status = 'healthy';
            if ($pending > 1000) {
                $status = 'degraded';
            }
            if ($failed > 100) {
                $status = 'degraded';
            }

            return [
                'status'  => $status,
                'pending' => $pending,
                'failed'  => $failed,
                'message' => $status === 'healthy' ? 'OK' : "Backlog détecté (pending: $pending, failed: $failed)",
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'unhealthy',
                'message' => 'Queue inaccessible : ' . $e->getMessage(),
            ];
        }
    }

    private function checkDisk(): array
    {
        try {
            $path      = storage_path();
            $freeBytes = disk_free_space($path);
            $totalBytes = disk_total_space($path);
            $freePct   = ($freeBytes / $totalBytes) * 100;

            $status = $freePct < 10 ? 'unhealthy' : ($freePct < 20 ? 'degraded' : 'healthy');

            return [
                'status'      => $status,
                'free_pct'    => round($freePct, 1),
                'free_gb'     => round($freeBytes / 1024 / 1024 / 1024, 2),
                'total_gb'    => round($totalBytes / 1024 / 1024 / 1024, 2),
                'message'     => $status === 'healthy' ? 'OK' : "Espace disque faible ({$freePct}% libre)",
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'unhealthy',
                'message' => 'Impossible de lire le disque : ' . $e->getMessage(),
            ];
        }
    }

    private function checkReverb(): array
    {
        $host = config('reverb.servers.reverb.host', '127.0.0.1');
        $port = config('reverb.servers.reverb.port', 8080);

        $errno = $errstr = null;

        try {
            $socket = @fsockopen($host, (int) $port, $errno, $errstr, 2);

            if ($socket) {
                fclose($socket);

                return [
                    'status'  => 'healthy',
                    'host'    => $host,
                    'port'    => $port,
                    'message' => 'OK',
                ];
            }

            return [
                'status'  => 'unhealthy',
                'host'    => $host,
                'port'    => $port,
                'message' => "Socket fermé : $errstr ($errno)",
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'unhealthy',
                'message' => 'Reverb inaccessible : ' . $e->getMessage(),
            ];
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function resolveGlobalStatus(array $checks): string
    {
        $statuses = array_column($checks, 'status');

        if (in_array('unhealthy', $statuses)) {
            return 'unhealthy';
        }
        if (in_array('degraded', $statuses)) {
            return 'degraded';
        }

        return 'healthy';
    }

    private function getPendingJobsCount(): int
    {
        try {
            return (int) Redis::llen('queues:default');
        } catch (\Throwable) {
            try {
                return DB::table('jobs')->count();
            } catch (\Throwable) {
                return 0;
            }
        }
    }

    private function getDatabaseSizeMb(): float
    {
        try {
            $dbName = config('database.connections.mysql.database');
            $result = DB::selectOne(
                "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                 FROM information_schema.tables
                 WHERE table_schema = ?",
                [$dbName]
            );

            return (float) ($result->size_mb ?? 0);
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getActiveOrganizations(): int
    {
        try {
            return DB::table('organizations')
                ->where('status', 'active')
                ->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getLastBackup(): ?string
    {
        try {
            $files = Storage::disk('local')->files('backups');
            if (empty($files)) {
                return null;
            }

            $latest = collect($files)
                ->map(fn ($f) => Storage::disk('local')->lastModified($f))
                ->max();

            return $latest ? now()->setTimestamp($latest)->toIso8601String() : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function getNodeVersion(): string
    {
        try {
            $output = shell_exec('node --version 2>/dev/null');

            return trim($output ?? 'N/A');
        } catch (\Throwable) {
            return 'N/A';
        }
    }
}
