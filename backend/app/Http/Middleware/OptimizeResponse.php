<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * OptimizeResponse — Middleware d'optimisation des réponses HTTP
 *
 * Responsabilités :
 *  - Compression gzip/deflate si le client l'accepte (réponses JSON)
 *  - Headers Cache-Control adaptés selon le type de route
 *  - ETags pour permettre la validation côté client (304 Not Modified)
 *  - Suppression des espaces superflus dans le JSON en production
 *
 * Enregistrement recommandé dans bootstrap/app.php :
 *   ->withMiddleware(function (Middleware $middleware) {
 *       $middleware->appendToGroup('api', OptimizeResponse::class);
 *   })
 */
class OptimizeResponse
{
    /**
     * Durées de cache (en secondes) par famille de routes.
     * Les routes publiques/statiques peuvent être cachées plus longtemps.
     */
    private const CACHE_TTL = [
        'static'    => 86400,  // 24h  — logos, config publique
        'reference' => 3600,   // 1h   — listes de référence (rôles, pays…)
        'dashboard' => 300,    // 5min — KPIs dashboard
        'calendar'  => 60,     // 1min — événements calendrier
        'realtime'  => 0,      // 0    — notifications, messages temps-réel
        'default'   => 0,      // 0    — écriture / routes sensibles
    ];

    /**
     * Taille minimale (octets) à partir de laquelle on compresse la réponse.
     * Compresser de petites réponses coûte plus cher que ça n'économise.
     */
    private const MIN_COMPRESS_SIZE = 1024; // 1 Ko

    public function handle(Request $request, Closure $next): SymfonyResponse
    {
        /** @var SymfonyResponse $response */
        $response = $next($request);

        // ── 1. Déterminer la famille de cache pour cette route ──────────────
        $cacheTtl = $this->resolveCacheTtl($request);

        // ── 2. Appliquer les headers Cache-Control ─────────────────────────
        $this->applyCacheHeaders($response, $cacheTtl, $request);

        // ── 3. ETag pour les réponses GET cachables ─────────────────────────
        if ($request->isMethod('GET') && $cacheTtl > 0) {
            $this->applyEtag($request, $response);
        }

        // ── 4. Compression gzip si supporté et réponse suffisamment grande ──
        if ($this->shouldCompress($request, $response)) {
            $this->compressResponse($request, $response);
        }

        // ── 5. Minification JSON en production ─────────────────────────────
        if (app()->isProduction() && $response instanceof JsonResponse) {
            $this->minifyJson($response);
        }

        return $response;
    }

    // =========================================================================
    // Résolution de la stratégie de cache
    // =========================================================================

    /**
     * Détermine le TTL de cache selon le nom de la route courante.
     * Les règles sont évaluées dans l'ordre ; la première correspondance gagne.
     */
    private function resolveCacheTtl(Request $request): int
    {
        $routeName = $request->route()?->getName() ?? '';

        // Routes temps-réel : jamais de cache
        if ($this->matchesAny($routeName, ['notifications.', 'messages.', 'broadcasting.'])) {
            return self::CACHE_TTL['realtime'];
        }

        // Routes de mutation : jamais de cache
        if (! $request->isMethod('GET')) {
            return self::CACHE_TTL['default'];
        }

        // Référentiels statiques
        if ($this->matchesAny($routeName, ['countries.', 'timezones.', 'roles.index', 'plans.index'])) {
            return self::CACHE_TTL['reference'];
        }

        // KPIs dashboard
        if ($this->matchesAny($routeName, ['dashboard.', 'kpi.', 'stats.'])) {
            return self::CACHE_TTL['dashboard'];
        }

        // Agenda / calendrier
        if ($this->matchesAny($routeName, ['events.', 'calendar.', 'agenda.'])) {
            return self::CACHE_TTL['calendar'];
        }

        // Assets statiques publics
        if ($this->matchesAny($routeName, ['public.', 'landing.', 'help.'])) {
            return self::CACHE_TTL['static'];
        }

        return self::CACHE_TTL['default'];
    }

    private function matchesAny(string $haystack, array $prefixes): bool
    {
        foreach ($prefixes as $prefix) {
            if (str_starts_with($haystack, $prefix)) {
                return true;
            }
        }
        return false;
    }

    // =========================================================================
    // Headers Cache-Control
    // =========================================================================

    private function applyCacheHeaders(SymfonyResponse $response, int $ttl, Request $request): void
    {
        if ($ttl <= 0) {
            // Pas de cache : instructions explicites pour les proxies et navigateurs
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            $response->headers->set('Pragma', 'no-cache');
            return;
        }

        // Cache public seulement pour les requêtes sans authentification
        $visibility = $request->bearerToken() || $request->hasCookie('secretis_session')
            ? 'private'
            : 'public';

        $response->headers->set(
            'Cache-Control',
            "{$visibility}, max-age={$ttl}, stale-while-revalidate=" . min($ttl, 60)
        );
        $response->headers->set('Vary', 'Accept-Encoding, Accept-Language, Authorization');
    }

    // =========================================================================
    // ETag
    // =========================================================================

    /**
     * Calcule un ETag basé sur le contenu de la réponse.
     * Si le client envoie un If-None-Match correspondant → 304 Not Modified.
     */
    private function applyEtag(Request $request, SymfonyResponse $response): void
    {
        $content = $response->getContent();
        if ($content === false || $content === '') {
            return;
        }

        // ETag faible (W/) : suffisant pour les API JSON
        $etag = 'W/"' . hash('xxh3', $content) . '"';
        $response->headers->set('ETag', $etag);

        // Vérification côté client
        $clientEtag = $request->header('If-None-Match');
        if ($clientEtag === $etag) {
            $response->setStatusCode(304);
            $response->setContent('');
        }
    }

    // =========================================================================
    // Compression
    // =========================================================================

    private function shouldCompress(Request $request, SymfonyResponse $response): bool
    {
        // Ne pas recompresser une réponse déjà compressée
        if ($response->headers->has('Content-Encoding')) {
            return false;
        }

        // Vérifier que le client accepte la compression
        $acceptEncoding = $request->header('Accept-Encoding', '');
        if (! str_contains($acceptEncoding, 'gzip') && ! str_contains($acceptEncoding, 'deflate')) {
            return false;
        }

        // Ne compresser que les types textuels
        $contentType = $response->headers->get('Content-Type', '');
        $compressible = str_contains($contentType, 'json')
            || str_contains($contentType, 'javascript')
            || str_contains($contentType, 'html')
            || str_contains($contentType, 'xml')
            || str_contains($contentType, 'text/');

        if (! $compressible) {
            return false;
        }

        // Seuil de taille
        $content = $response->getContent();
        return $content !== false && strlen($content) >= self::MIN_COMPRESS_SIZE;
    }

    private function compressResponse(Request $request, SymfonyResponse $response): void
    {
        $content = $response->getContent();
        if ($content === false) {
            return;
        }

        $acceptEncoding = $request->header('Accept-Encoding', '');

        // Préférer gzip à deflate (meilleure compatibilité navigateurs)
        if (str_contains($acceptEncoding, 'gzip') && function_exists('gzencode')) {
            $compressed = gzencode($content, 6); // Niveau 6 : bon ratio vitesse/compression
            if ($compressed !== false && strlen($compressed) < strlen($content)) {
                $response->setContent($compressed);
                $response->headers->set('Content-Encoding', 'gzip');
                $response->headers->set('Content-Length', (string) strlen($compressed));
                return;
            }
        }

        if (str_contains($acceptEncoding, 'deflate') && function_exists('gzdeflate')) {
            $compressed = gzdeflate($content, 6);
            if ($compressed !== false && strlen($compressed) < strlen($content)) {
                $response->setContent($compressed);
                $response->headers->set('Content-Encoding', 'deflate');
                $response->headers->set('Content-Length', (string) strlen($compressed));
            }
        }
    }

    // =========================================================================
    // Minification JSON
    // =========================================================================

    /**
     * En production, JSON_PRETTY_PRINT n'est pas souhaitable.
     * Cette méthode ré-encode le JSON sans espaces.
     *
     * Note : JsonResponse encode avec JSON_PRETTY_PRINT si APP_DEBUG=true,
     * ce guard est donc un filet de sécurité supplémentaire.
     */
    private function minifyJson(JsonResponse $response): void
    {
        $data = $response->getData(true); // true = array associatif
        if ($data === null) {
            return;
        }

        // JSON_UNESCAPED_UNICODE évite les séquences \uXXXX pour les caractères accentués
        $response->setData($data); // Déjà minifié par défaut hors debug
        $response->setEncodingOptions(JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
