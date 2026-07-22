<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\MonitoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * MonitoringApiController — API du dashboard monitoring SuperAdmin
 *
 * GET /api/superadmin/monitoring/metrics  → métriques temps réel
 * GET /api/superadmin/logs               → viewer de logs
 */
class MonitoringApiController extends Controller
{
    public function __construct(private readonly MonitoringService $monitoring) {}

    // ─── GET /api/superadmin/monitoring/metrics ───────────────────────────────

    public function metrics(): JsonResponse
    {
        $queue    = $this->monitoring->getQueueHealth();
        $slowRts  = $this->monitoring->getSlowQueries(5);
        $timeline = $this->monitoring->getLastHourTimeline();

        // Calcul requêtes/min depuis la dernière minute du timeline
        $lastMinute       = end($timeline);
        $requestsPerMinute = $lastMinute['requests'] ?? 0;

        // Temps de réponse moyen global
        try {
            $data = \Illuminate\Support\Facades\Redis::hgetall('metrics:duration:__all__');
            $sum  = (float) ($data['sum'] ?? 0);
            $cnt  = (int) ($data['count'] ?? 1);
            $avgMs = $cnt > 0 ? round(($sum / $cnt) * 1000, 1) : 0;
        } catch (\Throwable) {
            $avgMs = 0;
        }

        $errorRate = $this->monitoring->getErrorRate(5);

        // Organisations en trial
        try {
            $trials = DB::table('organizations')
                ->where('status', 'trial')
                ->select('id', 'name', 'trial_ends_at')
                ->orderBy('trial_ends_at')
                ->get()
                ->map(fn ($o) => [
                    'id'           => $o->id,
                    'name'         => $o->name,
                    'trial_ends_at' => $o->trial_ends_at,
                ])
                ->toArray();
        } catch (\Throwable) {
            $trials = [];
        }

        // 10 dernières erreurs (depuis les logs si disponibles)
        $recentErrors = $this->getRecentErrors();

        return response()->json([
            'summary' => [
                'requests_per_minute' => $requestsPerMinute,
                'avg_response_ms'     => $avgMs,
                'error_rate_pct'      => $errorRate,
                'queue_pending'       => $queue['pending'],
                'queue_failed'        => $queue['failed'],
                'cache_hit_rate_pct'  => $this->monitoring->getCacheHitRate(),
                'active_orgs'         => $this->monitoring->getActiveOrganizations(),
            ],
            'timeline'             => $timeline,
            'slow_routes'          => $slowRts,
            'recent_errors'        => $recentErrors,
            'trial_organizations'  => $trials,
            'generated_at'         => now()->toIso8601String(),
        ]);
    }

    // ─── GET /api/superadmin/logs ─────────────────────────────────────────────

    public function logs(Request $request): JsonResponse
    {
        $levels  = $request->string('levels', 'debug,info,warning,error,critical')
                           ->toString();
        $search  = $request->string('search')->toString();
        $limit   = min((int) $request->get('limit', 200), 500);
        $cursor  = $request->get('cursor'); // ligne de départ (offset)

        $logFile = storage_path('logs/secretis.log');

        if (! file_exists($logFile)) {
            return response()->json(['logs' => [], 'cursor' => null]);
        }

        $allowedLevels = array_map('trim', explode(',', $levels));

        // Lecture des N dernières lignes du fichier de log
        $lines     = $this->tailFile($logFile, 2000);
        $entries   = [];

        foreach ($lines as $line) {
            $parsed = $this->parseLogLine($line);
            if (! $parsed) {
                continue;
            }
            if (! in_array($parsed['level'], $allowedLevels, true)) {
                continue;
            }
            if ($search && ! $this->matchesSearch($parsed, $search)) {
                continue;
            }

            $entries[] = $parsed;
        }

        // Ordre chronologique inversé → les plus récentes en dernier
        $entries = array_reverse($entries);
        $offset  = $cursor ? (int) $cursor : 0;
        $slice   = array_slice($entries, $offset, $limit);

        return response()->json([
            'logs'   => $slice,
            'cursor' => count($slice) === $limit ? $offset + $limit : null,
            'total'  => count($entries),
        ]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function getRecentErrors(): array
    {
        $logFile = storage_path('logs/secretis.log');

        if (! file_exists($logFile)) {
            return [];
        }

        $lines   = $this->tailFile($logFile, 500);
        $errors  = [];

        foreach ($lines as $line) {
            $parsed = $this->parseLogLine($line);
            if (! $parsed) {
                continue;
            }
            if (! in_array($parsed['level'], ['error', 'critical'], true)) {
                continue;
            }
            $errors[] = $parsed;

            if (count($errors) >= 10) {
                break;
            }
        }

        return array_reverse($errors);
    }

    /**
     * Lit les N dernières lignes d'un fichier sans le charger entièrement.
     */
    private function tailFile(string $path, int $lines): array
    {
        $file = new \SplFileObject($path, 'r');
        $file->seek(PHP_INT_MAX);
        $total = $file->key();

        $start = max(0, $total - $lines);
        $file->seek($start);

        $result = [];
        while (! $file->eof()) {
            $line = trim($file->current());
            if ($line !== '') {
                $result[] = $line;
            }
            $file->next();
        }

        return $result;
    }

    /**
     * Parse une ligne de log Laravel standard.
     * Format : [2026-07-21 08:00:00] production.ERROR: message {"context":...}
     */
    private function parseLogLine(string $line): ?array
    {
        $pattern = '/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \w+\.(\w+): (.+?)(\s*\{.*\})?$/';

        if (! preg_match($pattern, $line, $m)) {
            return null;
        }

        $context = [];
        if (isset($m[4]) && $m[4] !== '') {
            $decoded = json_decode(trim($m[4]), true);
            if (is_array($decoded)) {
                $context = $decoded;
            }
        }

        return [
            'timestamp' => $m[1],
            'level'     => strtolower($m[2]),
            'message'   => $m[3],
            'context'   => $context,
            'route'     => $context['route'] ?? null,
            'status'    => $context['status'] ?? null,
            'time'      => $m[1],
        ];
    }

    private function matchesSearch(array $entry, string $q): bool
    {
        $q = strtolower($q);

        return str_contains(strtolower($entry['message']), $q)
            || str_contains(strtolower(json_encode($entry['context'])), $q);
    }
}
