<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\Response;

/**
 * RequestMetrics — Collecte des métriques HTTP par requête
 *
 * Collecte :
 *   - Méthode, route, durée, status code, user_id, org_id
 *   - Pousse dans Redis : compteurs + histogrammes
 *
 * Exclut automatiquement /health et /metrics pour éviter la récursion.
 */
class RequestMetrics
{
    /** Routes exclues de la collecte */
    private const EXCLUDED_PREFIXES = [
        '/health',
        '/metrics',
        '/favicon.ico',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        // Exclusion des routes de monitoring elles-mêmes
        $path = $request->getPathInfo();
        foreach (self::EXCLUDED_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return $response;
            }
        }

        $duration  = microtime(true) - $startTime;
        $method    = $request->method();
        $status    = $response->getStatusCode();
        $route     = $this->resolveRoute($request);
        $userId    = Auth::id();
        $orgId     = $request->get('_tenant_org_id'); // positionné par ResolveTenant

        // ── Push Redis ────────────────────────────────────────────────────────
        try {
            $this->incrementRequestCounter($method, $route, $status);
            $this->recordDuration($route, $duration);
            $this->recordDbDuration();
        } catch (\Throwable) {
            // Ne jamais bloquer la requête pour un échec de métriques
        }

        // ── Log structuré ─────────────────────────────────────────────────────
        Log::channel('performance')->info('http_request', [
            'method'      => $method,
            'route'       => $route,
            'status'      => $status,
            'duration_ms' => round($duration * 1000, 2),
            'user_id'     => $userId,
            'org_id'      => $orgId,
            'ip'          => $request->ip(),
        ]);

        // Alerte si requête très lente (> 3s)
        if ($duration > 3.0) {
            Log::channel('performance')->warning('slow_request', [
                'route'       => $route,
                'duration_ms' => round($duration * 1000, 2),
                'method'      => $method,
                'user_id'     => $userId,
                'org_id'      => $orgId,
            ]);
        }

        return $response;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function resolveRoute(Request $request): string
    {
        $laravelRoute = $request->route();

        if ($laravelRoute) {
            $name = $laravelRoute->getName();
            if ($name) {
                return $name;
            }
            $uri = $laravelRoute->uri();
            // Masquer les IDs numériques pour regrouper les métriques
            return preg_replace('/\{[^}]+\}/', ':id', $uri);
        }

        // Fallback : normaliser le chemin brut
        $path = $request->getPathInfo();

        return preg_replace('/\/\d+/', '/:id', $path);
    }

    private function incrementRequestCounter(string $method, string $route, int $status): void
    {
        $key = "metrics:requests:{$method}:{$route}:{$status}";
        Redis::incr($key);
        // Expiration 48h pour les compteurs (évite l'accumulation infinie)
        Redis::expire($key, 172800);
    }

    private function recordDuration(string $route, float $duration): void
    {
        $key = "metrics:duration:{$route}";
        Redis::hincrbyfloat($key, 'sum', $duration);
        Redis::hincrby($key, 'count', 1);
        Redis::expire($key, 172800);

        // Histogramme global (toutes routes confondues)
        Redis::hincrbyfloat('metrics:duration:__all__', 'sum', $duration);
        Redis::hincrby('metrics:duration:__all__', 'count', 1);
    }

    private function recordDbDuration(): void
    {
        // Laravel collecte les query logs si activé
        // On lit depuis le query log si disponible
        if (! config('logging.log_queries', false)) {
            return;
        }

        $queries = \DB::getQueryLog();
        $total   = collect($queries)->sum('time') / 1000; // ms → s

        if ($total > 0) {
            Redis::hincrbyfloat('metrics:db_duration', 'sum', $total);
            Redis::hincrby('metrics:db_duration', 'count', count($queries));
        }
    }
}
