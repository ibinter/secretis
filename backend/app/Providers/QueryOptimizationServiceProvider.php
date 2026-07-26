<?php

namespace App\Providers;

use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;

/**
 * QueryOptimizationServiceProvider
 *
 * Enregistre des listeners sur les événements de base de données pour :
 *  1. Détecter les requêtes N+1 en développement (seuil : 20 requêtes/request)
 *  2. Logger les requêtes lentes (> 200 ms) en production
 *  3. Alerter si une request HTTP dépasse le seuil global de requêtes DB
 *
 * Ce provider est sans impact en production car les fonctionnalités de debug
 * ne sont activées que lorsque APP_ENV=local ou APP_DEBUG=true.
 *
 * Enregistrement dans config/app.php → providers[] ou bootstrap/providers.php :
 *   App\Providers\QueryOptimizationServiceProvider::class,
 */
class QueryOptimizationServiceProvider extends ServiceProvider
{
    /** Seuil d'alerte : nombre maximum de requêtes DB par requête HTTP */
    private const MAX_QUERIES_PER_REQUEST = 20;

    /** Seuil de détection de requête lente (en millisecondes) */
    private const SLOW_QUERY_THRESHOLD_MS = 200;

    /** Compteur de requêtes pour la request courante */
    private int $queryCount = 0;

    /** Accumulateur de temps total de requêtes (ms) */
    private float $totalQueryTime = 0.0;

    /** Tableau des requêtes enregistrées (pour détection N+1) */
    private array $executedQueries = [];

    public function register(): void
    {
        // Rien à lier dans le conteneur
    }

    public function boot(): void
    {
        // En production : uniquement la détection des requêtes lentes
        if (app()->isProduction()) {
            $this->registerSlowQueryLogger();
            return;
        }

        // En développement : détection N+1 + compteur + requêtes lentes
        if (config('app.debug')) {
            $this->registerQueryCounter();
            $this->registerN1Detector();
            $this->registerSlowQueryLogger();
            $this->registerRequestSummaryLogger();
        }
    }

    // =========================================================================
    // Détection N+1
    // =========================================================================

    /**
     * Détecte les patterns N+1 en cherchant des requêtes quasi-identiques
     * (même table principale, même structure WHERE) exécutées plusieurs fois.
     *
     * Stratégie : normaliser les requêtes SQL (remplacer les valeurs par ?)
     * et compter les occurrences. Si une requête normalisée apparaît > 3 fois,
     * c'est un candidat N+1.
     */
    private function registerN1Detector(): void
    {
        DB::listen(function (QueryExecuted $event) {
            $normalized = $this->normalizeQuery($event->sql);
            $this->executedQueries[$normalized] = ($this->executedQueries[$normalized] ?? 0) + 1;

            $count = $this->executedQueries[$normalized];

            // Seuil N+1 : même requête exécutée plus de 3 fois
            if ($count === 4) {
                Log::warning('[SECRETIS N+1 DETECTED] Requête répétée ' . $count . ' fois', [
                    'sql'         => $event->sql,
                    'normalized'  => $normalized,
                    'time_ms'     => $event->time,
                    'connection'  => $event->connectionName,
                    'url'         => request()->fullUrl(),
                    'hint'        => 'Vérifiez les eager loadings manquants (with()). '
                        . 'Utilisez Laravel Telescope ou Debugbar pour identifier la source.',
                ]);
            }
        });
    }

    /**
     * Normalise une requête SQL en remplaçant les valeurs littérales par ?.
     * Cela permet de regrouper des requêtes structurellement identiques.
     */
    private function normalizeQuery(string $sql): string
    {
        // Remplacer les chaînes entres guillemets
        $normalized = preg_replace("/'[^']*'/", '?', $sql);
        // Remplacer les nombres
        $normalized = preg_replace('/\b\d+\b/', '?', $normalized ?? $sql);
        // Supprimer les espaces multiples
        $normalized = preg_replace('/\s+/', ' ', $normalized ?? $sql);

        return trim($normalized ?? $sql);
    }

    // =========================================================================
    // Compteur de requêtes
    // =========================================================================

    private function registerQueryCounter(): void
    {
        DB::listen(function (QueryExecuted $event) {
            $this->queryCount++;
            $this->totalQueryTime += $event->time;

            // Alerte immédiate si on dépasse le seuil
            if ($this->queryCount === self::MAX_QUERIES_PER_REQUEST) {
                Log::warning('[SECRETIS DB] Seuil de requêtes atteint : ' . self::MAX_QUERIES_PER_REQUEST, [
                    'url'        => request()->fullUrl(),
                    'method'     => request()->method(),
                    'route'      => request()->route()?->getName(),
                    'total_time' => round($this->totalQueryTime, 2) . 'ms',
                    'hint'       => 'Activez config(\'performance.query_log\') pour voir toutes les requêtes.',
                ]);
            }
        });
    }

    // =========================================================================
    // Détection des requêtes lentes
    // =========================================================================

    /**
     * En production, les requêtes lentes sont loggées dans le canal 'slow-queries'.
     * Configurer un canal dédié dans config/logging.php pour les isoler facilement.
     */
    private function registerSlowQueryLogger(): void
    {
        DB::listen(function (QueryExecuted $event) {
            if ($event->time < self::SLOW_QUERY_THRESHOLD_MS) {
                return;
            }

            $context = [
                'sql'        => $event->sql,
                'bindings'   => $event->bindings,
                'time_ms'    => round($event->time, 2),
                'connection' => $event->connectionName,
                'url'        => request()->fullUrl(),
                'route'      => request()->route()?->getName(),
                'user_id'    => auth()->id(),
                'org_id'     => auth()->user()?->organization_id,
            ];

            // Canal spécifique si configuré, sinon canal par défaut
            $channel = config('logging.channels.slow_queries') ? 'slow_queries' : null;

            if ($channel) {
                Log::channel($channel)->warning(
                    sprintf('[SLOW QUERY] %.2fms sur %s', $event->time, $event->connectionName),
                    $context
                );
            } else {
                Log::warning(
                    sprintf('[SECRETIS SLOW QUERY] %.2fms', $event->time),
                    $context
                );
            }
        });
    }

    // =========================================================================
    // Résumé en fin de request (dev uniquement)
    // =========================================================================

    /**
     * En développement, affiche un résumé dans les logs à la fin de chaque request.
     * Utile pour surveiller l'évolution des performances pendant le développement.
     */
    private function registerRequestSummaryLogger(): void
    {
        // Le hook 'terminating' est appelé après l'envoi de la réponse
        app()->terminating(function () {
            if ($this->queryCount === 0) {
                return;
            }

            $level = $this->queryCount >= self::MAX_QUERIES_PER_REQUEST ? 'warning' : 'debug';

            Log::$level('[SECRETIS DB SUMMARY]', [
                'queries'    => $this->queryCount,
                'total_ms'   => round($this->totalQueryTime, 2),
                'avg_ms'     => round($this->totalQueryTime / $this->queryCount, 2),
                'url'        => request()->fullUrl(),
                'route'      => request()->route()?->getName(),
                'n1_suspects' => array_filter(
                    $this->executedQueries,
                    fn(int $count) => $count >= 4
                ),
            ]);
        });
    }
}
