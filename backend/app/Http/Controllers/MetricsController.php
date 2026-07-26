<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

/**
 * MetricsController — Exposition Prometheus pour SECRETIS ERP
 *
 * GET /metrics  →  Format texte Prometheus, auth par IP whitelist
 *
 * Métriques exposées :
 *   secretis_requests_total{method, route, status}
 *   secretis_request_duration_seconds{route}
 *   secretis_active_organizations_total
 *   secretis_active_users_total
 *   secretis_db_query_duration_seconds
 *   secretis_cache_hits_total
 *   secretis_cache_misses_total
 *   secretis_queue_jobs_pending
 *   secretis_queue_jobs_failed
 *   secretis_storage_bytes_used
 *   secretis_licenses_active_total
 */
class MetricsController extends Controller
{
    /** IPs autorisées à scraper les métriques */
    private array $whitelist;

    public function __construct()
    {
        $raw = config('monitoring.metrics_ip_whitelist', '127.0.0.1,::1');
        $this->whitelist = array_map('trim', explode(',', $raw));
    }

    // ─── GET /metrics ────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $clientIp = $request->ip();

        if (! $this->isAllowed($clientIp)) {
            return response('# 403 Forbidden', 403)
                ->header('Content-Type', 'text/plain; charset=utf-8');
        }

        $lines = [];

        // ── secretis_requests_total ──────────────────────────────────────────
        $lines[] = '# HELP secretis_requests_total Total des requêtes HTTP reçues';
        $lines[] = '# TYPE secretis_requests_total counter';
        $requestCounters = $this->getRequestCounters();
        foreach ($requestCounters as $labels => $value) {
            $lines[] = "secretis_requests_total{{$labels}} {$value}";
        }

        // ── secretis_request_duration_seconds ───────────────────────────────
        $lines[] = '# HELP secretis_request_duration_seconds Durée des requêtes HTTP (secondes)';
        $lines[] = '# TYPE secretis_request_duration_seconds histogram';
        $durations = $this->getRequestDurations();
        foreach ($durations as $labels => $stats) {
            $lines[] = "secretis_request_duration_seconds_sum{{$labels}} {$stats['sum']}";
            $lines[] = "secretis_request_duration_seconds_count{{$labels}} {$stats['count']}";
        }

        // ── secretis_active_organizations_total ─────────────────────────────
        $lines[] = '# HELP secretis_active_organizations_total Nombre d\'organisations actives';
        $lines[] = '# TYPE secretis_active_organizations_total gauge';
        $lines[] = 'secretis_active_organizations_total ' . $this->getActiveOrganizations();

        // ── secretis_active_users_total ─────────────────────────────────────
        $lines[] = '# HELP secretis_active_users_total Nombre d\'utilisateurs actifs (30 dernières minutes)';
        $lines[] = '# TYPE secretis_active_users_total gauge';
        $lines[] = 'secretis_active_users_total ' . $this->getActiveUsers();

        // ── secretis_db_query_duration_seconds ──────────────────────────────
        $lines[] = '# HELP secretis_db_query_duration_seconds Durée moyenne des requêtes DB (secondes)';
        $lines[] = '# TYPE secretis_db_query_duration_seconds gauge';
        $lines[] = 'secretis_db_query_duration_seconds ' . $this->getAvgDbQueryDuration();

        // ── secretis_cache_hits_total ────────────────────────────────────────
        $lines[] = '# HELP secretis_cache_hits_total Nombre de hits cache';
        $lines[] = '# TYPE secretis_cache_hits_total counter';
        $lines[] = 'secretis_cache_hits_total ' . $this->getCacheCounter('hits');

        // ── secretis_cache_misses_total ──────────────────────────────────────
        $lines[] = '# HELP secretis_cache_misses_total Nombre de misses cache';
        $lines[] = '# TYPE secretis_cache_misses_total counter';
        $lines[] = 'secretis_cache_misses_total ' . $this->getCacheCounter('misses');

        // ── secretis_queue_jobs_pending ──────────────────────────────────────
        $lines[] = '# HELP secretis_queue_jobs_pending Nombre de jobs en attente';
        $lines[] = '# TYPE secretis_queue_jobs_pending gauge';
        $lines[] = 'secretis_queue_jobs_pending ' . $this->getPendingJobs();

        // ── secretis_queue_jobs_failed ───────────────────────────────────────
        $lines[] = '# HELP secretis_queue_jobs_failed Nombre de jobs échoués';
        $lines[] = '# TYPE secretis_queue_jobs_failed gauge';
        $lines[] = 'secretis_queue_jobs_failed ' . $this->getFailedJobs();

        // ── secretis_storage_bytes_used ──────────────────────────────────────
        $lines[] = '# HELP secretis_storage_bytes_used Espace de stockage utilisé (octets)';
        $lines[] = '# TYPE secretis_storage_bytes_used gauge';
        $lines[] = 'secretis_storage_bytes_used ' . $this->getStorageBytesUsed();

        // ── secretis_licenses_active_total ──────────────────────────────────
        $lines[] = '# HELP secretis_licenses_active_total Nombre de licences actives';
        $lines[] = '# TYPE secretis_licenses_active_total gauge';
        $lines[] = 'secretis_licenses_active_total ' . $this->getActiveLicenses();

        $body = implode("\n", $lines) . "\n";

        return response($body, 200)
            ->header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    }

    // ─── Collecteurs ─────────────────────────────────────────────────────────

    private function getRequestCounters(): array
    {
        try {
            $keys   = Redis::keys('metrics:requests:*');
            $result = [];

            foreach ($keys as $key) {
                // key format: metrics:requests:{method}:{route}:{status}
                $parts = explode(':', str_replace('metrics:requests:', '', $key));
                if (count($parts) < 3) {
                    continue;
                }
                [$method, $route, $status] = $parts;
                $value                     = (int) Redis::get($key);
                $labels                    = "method=\"{$method}\",route=\"{$route}\",status=\"{$status}\"";
                $result[$labels]           = $value;
            }

            return $result;
        } catch (\Throwable) {
            return [];
        }
    }

    private function getRequestDurations(): array
    {
        try {
            $keys   = Redis::keys('metrics:duration:*');
            $result = [];

            foreach ($keys as $key) {
                $route    = str_replace('metrics:duration:', '', $key);
                $data     = Redis::hgetall($key);
                $labels   = "route=\"{$route}\"";
                $result[$labels] = [
                    'sum'   => (float) ($data['sum'] ?? 0),
                    'count' => (int)   ($data['count'] ?? 0),
                ];
            }

            return $result;
        } catch (\Throwable) {
            return [];
        }
    }

    private function getActiveOrganizations(): int
    {
        try {
            return (int) DB::table('organizations')->where('status', 'active')->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getActiveUsers(): int
    {
        try {
            return (int) DB::table('users')
                ->where('last_seen_at', '>=', now()->subMinutes(30))
                ->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getAvgDbQueryDuration(): float
    {
        try {
            $data = Redis::hgetall('metrics:db_duration');
            $sum  = (float) ($data['sum'] ?? 0);
            $cnt  = (int)   ($data['count'] ?? 1);

            return $cnt > 0 ? round($sum / $cnt, 6) : 0;
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getCacheCounter(string $type): int
    {
        try {
            return (int) Redis::get("metrics:cache:{$type}");
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getPendingJobs(): int
    {
        try {
            return (int) Redis::llen('queues:default');
        } catch (\Throwable) {
            return (int) DB::table('jobs')->count();
        }
    }

    private function getFailedJobs(): int
    {
        try {
            return (int) DB::table('failed_jobs')->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function getStorageBytesUsed(): int
    {
        try {
            $path = storage_path('app');

            return $this->dirSize($path);
        } catch (\Throwable) {
            return 0;
        }
    }

    private function dirSize(string $path): int
    {
        $size = 0;

        if (! is_dir($path)) {
            return 0;
        }

        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS)) as $file) {
            $size += $file->getSize();
        }

        return $size;
    }

    private function getActiveLicenses(): int
    {
        try {
            return (int) DB::table('licenses')
                ->where('status', 'active')
                ->where('expires_at', '>', now())
                ->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function isAllowed(string $ip): bool
    {
        return in_array($ip, $this->whitelist, true);
    }
}
