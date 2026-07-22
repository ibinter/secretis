<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\Response;

/**
 * MonitoringService — Service central de monitoring SECRETIS ERP
 *
 * Responsabilités :
 *  - Enregistrement des métriques par requête
 *  - Calcul du taux de hit cache
 *  - Santé des queues
 *  - Taux d'erreur et alerte automatique
 *  - Requêtes lentes
 *  - Organisations actives
 */
class MonitoringService
{
    // ─── Enregistrement des métriques ─────────────────────────────────────────

    public function recordRequest(Request $request, Response $response, float $duration): void
    {
        $status = $response->getStatusCode();
        $route  = $this->resolveRoute($request);
        $method = $request->method();

        try {
            // Compteur global des requêtes
            Redis::incr("metrics:requests:{$method}:{$route}:{$status}");

            // Durée par route
            Redis::hincrbyfloat("metrics:duration:{$route}", 'sum', $duration);
            Redis::hincrby("metrics:duration:{$route}", 'count', 1);

            // Compteur d'erreurs (5xx) pour alertes
            if ($status >= 500) {
                $minuteKey = 'metrics:errors:' . now()->format('YmdHi');
                Redis::incr($minuteKey);
                Redis::expire($minuteKey, 600); // expire après 10 min
            }
        } catch (\Throwable $e) {
            Log::channel('performance')->error('Erreur recordRequest', ['error' => $e->getMessage()]);
        }
    }

    // ─── Cache ───────────────────────────────────────────────────────────────

    public function getCacheHitRate(): float
    {
        try {
            $hits   = (int) Redis::get('metrics:cache:hits');
            $misses = (int) Redis::get('metrics:cache:misses');
            $total  = $hits + $misses;

            if ($total === 0) {
                return 0.0;
            }

            return round(($hits / $total) * 100, 2);
        } catch (\Throwable) {
            return 0.0;
        }
    }

    public function incrementCacheHit(): void
    {
        try {
            Redis::incr('metrics:cache:hits');
        } catch (\Throwable) {}
    }

    public function incrementCacheMiss(): void
    {
        try {
            Redis::incr('metrics:cache:misses');
        } catch (\Throwable) {}
    }

    // ─── Queue ───────────────────────────────────────────────────────────────

    public function getQueueHealth(): array
    {
        try {
            $pending = (int) Redis::llen('queues:default');
            $failed  = (int) DB::table('failed_jobs')->count();

            $status = 'healthy';
            if ($pending > 500 || $failed > 50) {
                $status = 'degraded';
            }
            if ($pending > 2000 || $failed > 200) {
                $status = 'unhealthy';
            }

            return [
                'status'  => $status,
                'pending' => $pending,
                'failed'  => $failed,
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'unhealthy',
                'pending' => 0,
                'failed'  => 0,
                'error'   => $e->getMessage(),
            ];
        }
    }

    // ─── Taux d'erreur ───────────────────────────────────────────────────────

    /**
     * Calcule le taux d'erreur HTTP 5xx sur les N dernières minutes.
     * Retourne un pourcentage (0–100).
     */
    public function getErrorRate(int $minutes = 60): float
    {
        try {
            $errorTotal   = 0;
            $requestTotal = 0;

            for ($i = 0; $i < $minutes; $i++) {
                $minute = now()->subMinutes($i)->format('YmdHi');

                // Erreurs 5xx
                $errorTotal += (int) Redis::get("metrics:errors:{$minute}");

                // Requêtes totales (on cherche la somme du count global)
                // Les compteurs par route/méthode/status sont agrégés différemment,
                // on utilise le total des requêtes pour ce calcul
                $requestTotal += (int) Redis::get("metrics:total:{$minute}");
            }

            if ($requestTotal === 0) {
                return 0.0;
            }

            return round(($errorTotal / $requestTotal) * 100, 2);
        } catch (\Throwable) {
            return 0.0;
        }
    }

    // ─── Requêtes lentes ─────────────────────────────────────────────────────

    /**
     * Retourne les N routes les plus lentes d'après les métriques Redis.
     */
    public function getSlowQueries(int $limit = 10): array
    {
        try {
            $keys    = Redis::keys('metrics:duration:*');
            $results = [];

            foreach ($keys as $key) {
                $route = str_replace('metrics:duration:', '', $key);
                if ($route === '__all__') {
                    continue;
                }
                $data  = Redis::hgetall($key);
                $count = (int) ($data['count'] ?? 0);
                $sum   = (float) ($data['sum'] ?? 0);

                if ($count === 0) {
                    continue;
                }

                $results[] = [
                    'route'      => $route,
                    'avg_ms'     => round(($sum / $count) * 1000, 2),
                    'total_calls' => $count,
                ];
            }

            usort($results, fn ($a, $b) => $b['avg_ms'] <=> $a['avg_ms']);

            return array_slice($results, 0, $limit);
        } catch (\Throwable) {
            return [];
        }
    }

    // ─── Organisations actives ───────────────────────────────────────────────

    public function getActiveOrganizations(): int
    {
        try {
            return (int) DB::table('organizations')
                ->where('status', 'active')
                ->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    // ─── Alertes ─────────────────────────────────────────────────────────────

    /**
     * Envoie une alerte email si le taux d'erreur dépasse 5% sur les 5 dernières minutes.
     * Anti-spam : 1 alerte max par 30 minutes (via Redis lock).
     */
    public function alertIfErrorRateHigh(): void
    {
        $rate = $this->getErrorRate(5);

        if ($rate < 5.0) {
            return;
        }

        $lockKey = 'monitoring:alert:error_rate';

        // Vérifie si une alerte a déjà été envoyée récemment
        if (Redis::exists($lockKey)) {
            return;
        }

        // Pose le verrou pour 30 minutes
        Redis::setex($lockKey, 1800, 1);

        $adminEmail = config('monitoring.admin_email', config('mail.from.address'));

        try {
            Mail::raw(
                "ALERTE SECRETIS ERP\n\n"
                . "Taux d'erreur HTTP 5xx élevé : {$rate}% sur les 5 dernières minutes.\n\n"
                . "Heure : " . now()->toDateTimeString() . "\n"
                . "Environnement : " . config('app.env') . "\n\n"
                . "Veuillez vérifier les logs et l'état des services.\n",
                fn ($message) => $message
                    ->to($adminEmail)
                    ->subject("[SECRETIS ALERTE] Taux d'erreur élevé : {$rate}%")
            );

            Log::channel('slack')->critical('Taux erreur HTTP élevé', [
                'error_rate_pct' => $rate,
                'window_minutes' => 5,
            ]);
        } catch (\Throwable $e) {
            Log::error('Impossible d\'envoyer l\'alerte monitoring', ['error' => $e->getMessage()]);
        }
    }

    // ─── Métriques temps réel (pour le dashboard SuperAdmin) ─────────────────

    /**
     * Retourne un résumé des métriques de la dernière heure (60 points, 1/min).
     */
    public function getLastHourTimeline(): array
    {
        $timeline = [];

        for ($i = 59; $i >= 0; $i--) {
            $minute = now()->subMinutes($i)->format('YmdHi');
            $timeline[] = [
                'minute'   => now()->subMinutes($i)->format('H:i'),
                'requests' => (int) Redis::get("metrics:total:{$minute}"),
                'errors'   => (int) Redis::get("metrics:errors:{$minute}"),
            ];
        }

        return $timeline;
    }

    /**
     * Incrémente le compteur de requêtes totales de la minute courante.
     * Appelé par le middleware RequestMetrics.
     */
    public function incrementMinuteCounter(): void
    {
        try {
            $key = 'metrics:total:' . now()->format('YmdHi');
            Redis::incr($key);
            Redis::expire($key, 7200); // 2h de rétention
        } catch (\Throwable) {}
    }

    // ─── Helpers privés ──────────────────────────────────────────────────────

    private function resolveRoute(Request $request): string
    {
        $route = $request->route();
        if ($route) {
            return $route->getName() ?? preg_replace('/\{[^}]+\}/', ':id', $route->uri());
        }

        return preg_replace('/\/\d+/', '/:id', $request->getPathInfo());
    }
}
