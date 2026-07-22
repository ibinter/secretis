<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SystemController — Tableau de bord santé technique SuperAdmin
 *
 * Monitoring en temps réel : DB, Redis, Queue, Reverb, S3, SMTP, IA
 * Consultation logs, gestion cache, stats queues, CRON status
 */
class SystemController extends Controller
{
    // -------------------------------------------------------------------------
    // health() — Statut système complet
    // -------------------------------------------------------------------------

    public function health(): JsonResponse
    {
        $health = [
            'database' => $this->checkDatabase(),
            'redis'    => $this->checkRedis(),
            'queue'    => $this->checkQueue(),
            'reverb'   => $this->checkReverb(),
            's3'       => $this->checkS3(),
            'smtp'     => $this->checkSmtp(),
            'ai'       => $this->checkAi(),
        ];

        // Statut global : ok si tous OK, warning si au moins un warning, error si au moins un error
        $statuses = array_column($health, 'status');
        $global   = 'ok';
        if (in_array('error', $statuses)) {
            $global = 'error';
        } elseif (in_array('warning', $statuses)) {
            $global = 'warning';
        }

        return response()->json([
            'health'    => $health,
            'global'    => $global,
            'checked_at'=> now()->toIso8601String(),
        ]);
    }

    // -------------------------------------------------------------------------
    // logs($type) — Consultation des logs Laravel
    // -------------------------------------------------------------------------

    public function logs(Request $request, string $type = 'laravel'): JsonResponse
    {
        $allowedTypes = ['laravel', 'queue', 'reverb'];
        abort_unless(in_array($type, $allowedTypes), 400, 'Type de log invalide.');

        $logFiles = [
            'laravel' => storage_path('logs/laravel.log'),
            'queue'   => storage_path('logs/queue.log'),
            'reverb'  => storage_path('logs/reverb.log'),
        ];

        $logFile = $logFiles[$type];

        if (!file_exists($logFile)) {
            return response()->json(['lines' => [], 'message' => 'Fichier de log introuvable.']);
        }

        // Lire les 200 dernières lignes
        $lines = $this->tailFile($logFile, 200);

        // Filtrage par niveau
        if ($request->filled('level')) {
            $level = strtoupper($request->level);
            $lines = array_filter($lines, fn ($line) => str_contains(strtoupper($line), ".{$level}]") || str_contains(strtoupper($line), "[{$level}]"));
        }

        // Filtrage par recherche
        if ($request->filled('search')) {
            $search = $request->search;
            $lines  = array_filter($lines, fn ($line) => str_contains(strtolower($line), strtolower($search)));
        }

        // Parser les lignes pour un affichage structuré
        $parsed = array_map(fn ($line) => $this->parseLogLine($line), array_values($lines));

        return response()->json([
            'lines'   => array_slice($parsed, -100), // 100 dernières après filtre
            'total'   => count($parsed),
            'file'    => basename($logFile),
            'size_kb' => round(filesize($logFile) / 1024, 2),
        ]);
    }

    // -------------------------------------------------------------------------
    // clearCache() — Vider les caches config/route/view
    // -------------------------------------------------------------------------

    public function clearCache(Request $request): JsonResponse
    {
        $type    = $request->get('type', 'all');
        $cleared = [];

        try {
            if (in_array($type, ['all', 'config'])) {
                Artisan::call('config:clear');
                $cleared[] = 'config';
            }
            if (in_array($type, ['all', 'route'])) {
                Artisan::call('route:clear');
                $cleared[] = 'route';
            }
            if (in_array($type, ['all', 'view'])) {
                Artisan::call('view:clear');
                $cleared[] = 'view';
            }
            if (in_array($type, ['all', 'application'])) {
                Artisan::call('cache:clear');
                $cleared[] = 'application';
            }

            Log::info('SuperAdmin cache cleared', [
                'type'    => $type,
                'user_id' => auth()->id(),
                'ip'      => request()->ip(),
            ]);

            return response()->json([
                'success' => true,
                'cleared' => $cleared,
                'message' => 'Caches vidés : ' . implode(', ', $cleared),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // -------------------------------------------------------------------------
    // runMigrations() — Migrations en production (avec confirmation token)
    // -------------------------------------------------------------------------

    public function runMigrations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'confirm_token' => 'required|string', // token généré côté front pour éviter accident
        ]);

        // Vérifier le token de confirmation (stocké en session ou calculé)
        $expected = hash('sha256', 'migrate-' . date('Y-m-d') . '-' . config('app.key'));
        abort_unless(hash_equals($expected, $validated['confirm_token']), 403, 'Token de confirmation invalide.');

        try {
            Artisan::call('migrate', ['--force' => true]);
            $output = Artisan::output();

            Log::warning('SuperAdmin ran migrations in production', [
                'user_id' => auth()->id(),
                'ip'      => request()->ip(),
                'output'  => $output,
            ]);

            return response()->json([
                'success' => true,
                'output'  => $output,
                'message' => 'Migrations exécutées avec succès.',
            ]);
        } catch (\Throwable $e) {
            Log::error('Migration failed', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // -------------------------------------------------------------------------
    // cronStatus() — Dernière exécution de chaque CRON
    // -------------------------------------------------------------------------

    public function cronStatus(): JsonResponse
    {
        // Les CRON SECRETIS ERP
        $cronJobs = [
            ['command' => 'schedule:run',                  'description' => 'Scheduler Laravel'],
            ['command' => 'licenses:check-expiry',         'description' => 'Vérification expiration licences'],
            ['command' => 'queue:work --timeout=60',       'description' => 'Worker queue principal'],
            ['command' => 'backup:run',                    'description' => 'Sauvegarde base de données'],
            ['command' => 'horizon:snapshot',              'description' => 'Snapshot Horizon'],
            ['command' => 'telescope:prune',               'description' => 'Nettoyage Telescope'],
            ['command' => 'cache:prune-stale-tags',        'description' => 'Nettoyage tags cache'],
            ['command' => 'notifications:send-reminders',  'description' => 'Envoi rappels'],
        ];

        $statuses = [];
        foreach ($cronJobs as $job) {
            $key       = 'cron_last_run_' . md5($job['command']);
            $lastRun   = Cache::get($key);
            $statuses[] = [
                'command'     => $job['command'],
                'description' => $job['description'],
                'last_run'    => $lastRun,
                'status'      => $this->getCronStatus($lastRun),
                'next_run'    => $this->estimateNextRun($job['command']),
            ];
        }

        return response()->json(['crons' => $statuses]);
    }

    // -------------------------------------------------------------------------
    // queueStats() — Jobs pending/failed/processed par queue
    // -------------------------------------------------------------------------

    public function queueStats(): JsonResponse
    {
        try {
            $queues = ['default', 'emails', 'notifications', 'reports', 'heavy'];
            $stats  = [];

            foreach ($queues as $queue) {
                $stats[$queue] = [
                    'pending'   => DB::table('jobs')->where('queue', $queue)->count(),
                    'failed'    => DB::table('failed_jobs')->where('queue', $queue)->count(),
                    'processed' => Cache::get("queue_processed_{$queue}", 0),
                ];
            }

            // Jobs récents en erreur
            $recentFailed = DB::table('failed_jobs')
                ->orderByDesc('failed_at')
                ->limit(10)
                ->get(['id', 'queue', 'payload', 'exception', 'failed_at']);

            $recentFailed = $recentFailed->map(function ($job) {
                $payload = json_decode($job->payload, true);
                return [
                    'id'          => $job->id,
                    'queue'       => $job->queue,
                    'class'       => $payload['displayName'] ?? 'Unknown',
                    'failed_at'   => $job->failed_at,
                    'exception'   => substr($job->exception, 0, 300),
                ];
            });

            return response()->json([
                'queues'        => $stats,
                'recent_failed' => $recentFailed,
                'total_pending' => DB::table('jobs')->count(),
                'total_failed'  => DB::table('failed_jobs')->count(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // -------------------------------------------------------------------------
    // storageUsage() — Espace utilisé par organisation
    // -------------------------------------------------------------------------

    public function storageUsage(): JsonResponse
    {
        try {
            // Utilisation par organisation (fichiers dans storage/app/organizations/)
            $orgs = DB::table('organizations')
                ->select('id', 'name', 'slug')
                ->where('status', '!=', 'cancelled')
                ->get();

            $usage = $orgs->map(function ($org) {
                $path      = "organizations/{$org->id}";
                $sizeBytes = $this->getDirectorySize($path);
                return [
                    'org_id'   => $org->id,
                    'org_name' => $org->name,
                    'size_mb'  => round($sizeBytes / 1024 / 1024, 2),
                    'size_bytes' => $sizeBytes,
                ];
            })->sortByDesc('size_bytes')->values();

            $totalMb = $usage->sum('size_mb');

            return response()->json([
                'organizations' => $usage,
                'total_mb'      => round($totalMb, 2),
                'total_gb'      => round($totalMb / 1024, 3),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    // =========================================================================
    // Méthodes de vérification privées
    // =========================================================================

    private function checkDatabase(): array
    {
        try {
            $start = microtime(true);
            DB::select('SELECT 1');
            $latency = round((microtime(true) - $start) * 1000, 2);

            $status = $latency > 500 ? 'warning' : 'ok';
            return ['status' => $status, 'latency_ms' => $latency, 'message' => "Connecté ({$latency}ms)"];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Connexion DB impossible : ' . $e->getMessage()];
        }
    }

    private function checkRedis(): array
    {
        try {
            $start = microtime(true);
            Redis::ping();
            $latency = round((microtime(true) - $start) * 1000, 2);

            $info   = Redis::info('memory');
            $usedMb = isset($info['used_memory']) ? round($info['used_memory'] / 1024 / 1024, 2) : null;

            return [
                'status'     => 'ok',
                'latency_ms' => $latency,
                'used_mb'    => $usedMb,
                'message'    => "Connecté ({$latency}ms)" . ($usedMb ? " — {$usedMb}MB utilisés" : ''),
            ];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Redis inaccessible : ' . $e->getMessage()];
        }
    }

    private function checkQueue(): array
    {
        try {
            $pending = DB::table('jobs')->count();
            $failed  = DB::table('failed_jobs')->count();

            $status = 'ok';
            if ($failed > 50) {
                $status = 'error';
            } elseif ($failed > 10 || $pending > 500) {
                $status = 'warning';
            }

            return [
                'status'  => $status,
                'pending' => $pending,
                'failed'  => $failed,
                'message' => "{$pending} en attente, {$failed} en erreur",
            ];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Queue inaccessible : ' . $e->getMessage()];
        }
    }

    private function checkReverb(): array
    {
        try {
            $host = config('broadcasting.connections.reverb.options.host', 'localhost');
            $port = (int) config('broadcasting.connections.reverb.options.port', 8080);

            $conn = @fsockopen($host, $port, $errno, $errstr, 2);
            if ($conn) {
                fclose($conn);
                return ['status' => 'ok', 'message' => "Reverb actif sur {$host}:{$port}"];
            }

            return ['status' => 'error', 'message' => "Reverb inaccessible ({$errstr})"];
        } catch (\Throwable $e) {
            return ['status' => 'warning', 'message' => 'Vérification Reverb impossible : ' . $e->getMessage()];
        }
    }

    private function checkS3(): array
    {
        try {
            Storage::disk('s3')->exists('healthcheck');
            return ['status' => 'ok', 'message' => 'S3 accessible'];
        } catch (\Throwable $e) {
            // Fallback : vérifier le disque local
            if (Storage::disk('local')->exists('.')) {
                return ['status' => 'warning', 'message' => 'S3 inaccessible, stockage local actif : ' . $e->getMessage()];
            }
            return ['status' => 'error', 'message' => 'Stockage inaccessible : ' . $e->getMessage()];
        }
    }

    private function checkSmtp(): array
    {
        try {
            // Tenter une connexion SMTP sans envoyer d'email
            $transport = Mail::getSymfonyTransport();
            if (method_exists($transport, 'start')) {
                // @phpstan-ignore-next-line
                $transport->start();
            }
            return ['status' => 'ok', 'message' => 'SMTP configuré et accessible'];
        } catch (\Throwable $e) {
            return ['status' => 'warning', 'message' => 'SMTP : ' . substr($e->getMessage(), 0, 100)];
        }
    }

    private function checkAi(): array
    {
        $apiKey = config('services.openai.key') ?: config('services.anthropic.key');

        if (!$apiKey) {
            return ['status' => 'warning', 'message' => 'Clé IA non configurée'];
        }

        try {
            $host    = config('services.openai.base_url', 'api.openai.com');
            $conn    = @fsockopen('ssl://' . $host, 443, $errno, $errstr, 3);
            if ($conn) {
                fclose($conn);
                return ['status' => 'ok', 'message' => "IA accessible ({$host})"];
            }
            return ['status' => 'error', 'message' => "IA inaccessible : {$errstr}"];
        } catch (\Throwable $e) {
            return ['status' => 'warning', 'message' => 'Vérification IA : ' . $e->getMessage()];
        }
    }

    // =========================================================================
    // Utilitaires privés
    // =========================================================================

    private function tailFile(string $path, int $lines): array
    {
        $file    = new \SplFileObject($path, 'r');
        $file->seek(PHP_INT_MAX);
        $total   = $file->key();
        $start   = max(0, $total - $lines);

        $file->seek($start);
        $result  = [];
        while (!$file->eof()) {
            $line = $file->fgets();
            if (trim($line)) {
                $result[] = $line;
            }
        }

        return $result;
    }

    private function parseLogLine(string $line): array
    {
        // Format Laravel : [2026-07-21 14:30:00] local.ERROR: message {"context":{}}
        preg_match('/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \w+\.(\w+): (.+)$/', trim($line), $m);

        return [
            'timestamp' => $m[1] ?? null,
            'level'     => $m[2] ?? 'INFO',
            'message'   => $m[3] ?? $line,
            'raw'       => $line,
        ];
    }

    private function getCronStatus(?string $lastRun): string
    {
        if (!$lastRun) {
            return 'unknown';
        }
        $diff = now()->diffInMinutes(\Carbon\Carbon::parse($lastRun));
        if ($diff > 120) {
            return 'error';
        }
        if ($diff > 60) {
            return 'warning';
        }
        return 'ok';
    }

    private function estimateNextRun(string $command): ?string
    {
        // Estimation simple — à affiner selon le planning réel
        return now()->addMinutes(5)->format('H:i');
    }

    private function getDirectorySize(string $path): int
    {
        try {
            $files = Storage::allFiles($path);
            $total = 0;
            foreach ($files as $file) {
                $total += Storage::size($file);
            }
            return $total;
        } catch (\Throwable $e) {
            return 0;
        }
    }
}
