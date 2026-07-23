<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * PerformanceMonitor — Surveillance des performances par requête HTTP
 *
 * Mesure :
 *   - Temps d'exécution total (microtime)
 *   - Nombre de requêtes SQL exécutées (DB::listen)
 *
 * Déclenche une alerte (canal 'performance') si :
 *   - Durée > 2 000 ms  OU
 *   - Nombre de requêtes SQL > 20  (indicateur de N+1)
 *
 * En mode debug (APP_DEBUG=true) uniquement :
 *   - X-Response-Time: 342ms
 *   - X-DB-Queries: 7
 *
 * Ces headers ne sont JAMAIS exposés en production (APP_DEBUG=false).
 *
 * Enregistrement dans bootstrap/app.php :
 *   $middleware->appendToGroup('web', PerformanceMonitor::class);
 *   $middleware->appendToGroup('api', PerformanceMonitor::class);
 */
class PerformanceMonitor
{
    /** Seuil de durée (ms) au-delà duquel la requête est loguée */
    private const SLOW_REQUEST_THRESHOLD_MS = 2000;

    /** Seuil de requêtes SQL au-delà duquel la requête est loguée (N+1 potentiel) */
    private const HIGH_QUERY_THRESHOLD = 20;

    /** Routes exclues du monitoring (health checks, assets…) */
    private const EXCLUDED_PREFIXES = [
        '/health',
        '/metrics',
        '/favicon.ico',
        '/_debugbar',
        '/telescope',
        '/horizon',
    ];

    /** Collecteur des requêtes SQL */
    private array $queries = [];

    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        // Exclure les routes de monitoring pour éviter toute récursion
        if ($this->isExcluded($request->getPathInfo())) {
            return $next($request);
        }

        // ── Écoute des requêtes SQL ──────────────────────────────────────────
        $this->queries = [];

        DB::listen(function ($query) {
            $this->queries[] = [
                'sql'      => $query->sql,
                'bindings' => $query->bindings,
                'time_ms'  => $query->time,
            ];
        });

        /** @var Response $response */
        $response = $next($request);

        // ── Calculs post-requête ─────────────────────────────────────────────
        $durationMs = (int) round((microtime(true) - $startTime) * 1000);
        $queryCount = count($this->queries);

        $userId = Auth::id();
        $orgId  = $request->attributes->get('_tenant_org_id') ?? $request->get('_tenant_org_id');
        $route  = $this->resolveRouteName($request);

        // ── Alerte si seuils dépassés ────────────────────────────────────────
        if ($durationMs > self::SLOW_REQUEST_THRESHOLD_MS || $queryCount > self::HIGH_QUERY_THRESHOLD) {
            Log::channel('performance')->warning('performance_alert', [
                'url'        => $request->fullUrl(),
                'method'     => $request->method(),
                'route'      => $route,
                'duration_ms' => $durationMs,
                'db_queries' => $queryCount,
                'user_id'    => $userId,
                'org_id'     => $orgId,
                'ip'         => $request->ip(),
                'threshold'  => [
                    'slow'     => $durationMs > self::SLOW_REQUEST_THRESHOLD_MS,
                    'n_plus_1' => $queryCount > self::HIGH_QUERY_THRESHOLD,
                ],
                // Top 5 requêtes les plus lentes pour le diagnostic
                'top_queries' => collect($this->queries)
                    ->sortByDesc('time_ms')
                    ->take(5)
                    ->map(fn($q) => [
                        'sql'     => substr($q['sql'], 0, 200),
                        'time_ms' => $q['time_ms'],
                    ])
                    ->values()
                    ->toArray(),
            ]);
        }

        // ── Headers de debug (APP_DEBUG uniquement) ──────────────────────────
        // IMPORTANT : ne jamais ajouter ces headers en production.
        // La condition APP_DEBUG garantit qu'ils sont absents si quelqu'un
        // définit APP_ENV=production sans désactiver APP_DEBUG — on vérifie les deux.
        if (config('app.debug') === true && config('app.env') !== 'production') {
            $response->headers->set('X-Response-Time', "{$durationMs}ms");
            $response->headers->set('X-DB-Queries', (string) $queryCount);
        }

        return $response;
    }

    // ─── Helpers privés ──────────────────────────────────────────────────────

    private function isExcluded(string $path): bool
    {
        foreach (self::EXCLUDED_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }

        return false;
    }

    private function resolveRouteName(Request $request): string
    {
        $route = $request->route();

        if (! $route) {
            return preg_replace('/\/\d+/', '/:id', $request->getPathInfo()) ?? $request->getPathInfo();
        }

        if ($name = $route->getName()) {
            return $name;
        }

        $uri = $route->uri();

        return preg_replace('/\{[^}]+\}/', ':id', $uri) ?? $uri;
    }
}
