<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * RateLimitByRole — Rate limiting différencié selon le rôle Spatie de l'utilisateur.
 *
 * Les limites sont définies par minute et par combinaison IP + user_id (authentifié)
 * ou IP seule (non authentifié).
 *
 * Enregistrement dans bootstrap/app.php :
 *   $middleware->api(append: [RateLimitByRole::class])
 */
class RateLimitByRole
{
    /**
     * Nombre de requêtes autorisées par minute selon le rôle.
     */
    private const ROLE_LIMITS = [
        'super-admin'         => 1000,
        'superadmin_ibig'     => 1000,
        'admin'               => 300,
        'secretaire'          => 120,
        'rh_manager'          => 120,
        'comptable'           => 120,
        'chef_projet'         => 120,
        'dirigeant'           => 60,
        'auditeur'            => 60,
        'technicien_qualite'  => 60,
        'visiteur_externe'    => 20,
    ];

    /**
     * Limite pour les requêtes non authentifiées.
     */
    private const UNAUTHENTICATED_LIMIT = 30;

    /**
     * Durée de la fenêtre en secondes (1 minute).
     */
    private const WINDOW_SECONDS = 60;

    public function __construct(
        private readonly RateLimiter $limiter
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $key   = $this->resolveKey($request);
        $limit = $this->resolveLimit($request);

        if ($this->limiter->tooManyAttempts($key, $limit)) {
            $retryAfter = $this->limiter->availableIn($key);

            return response()->json([
                'error'       => 'rate_limit_exceeded',
                'message'     => 'Trop de requêtes. Veuillez patienter.',
                'retry_after' => $retryAfter,
            ], Response::HTTP_TOO_MANY_REQUESTS, [
                'Retry-After'            => $retryAfter,
                'X-RateLimit-Limit'      => $limit,
                'X-RateLimit-Remaining'  => 0,
            ]);
        }

        $this->limiter->hit($key, self::WINDOW_SECONDS);

        $remaining = max(0, $limit - $this->limiter->attempts($key));

        $response = $next($request);

        $response->headers->set('X-RateLimit-Limit', (string) $limit);
        $response->headers->set('X-RateLimit-Remaining', (string) $remaining);

        return $response;
    }

    /**
     * Génère la clé unique de rate limiting pour cette requête.
     * Combine IP + user_id (si authentifié) pour une isolation précise.
     */
    private function resolveKey(Request $request): string
    {
        $ip     = $request->ip();
        $userId = Auth::id() ?? 'guest';

        return 'rl:' . sha1("{$ip}:{$userId}");
    }

    /**
     * Détermine la limite applicable en fonction du rôle de l'utilisateur.
     * Retourne la limite la plus élevée si l'utilisateur a plusieurs rôles.
     */
    private function resolveLimit(Request $request): int
    {
        if (! Auth::check()) {
            return self::UNAUTHENTICATED_LIMIT;
        }

        /** @var \App\Models\User $user */
        $user  = Auth::user();
        $roles = $user->getRoleNames()->toArray();

        $maxLimit = 0;

        foreach ($roles as $role) {
            $roleLimit = self::ROLE_LIMITS[$role] ?? 60;
            if ($roleLimit > $maxLimit) {
                $maxLimit = $roleLimit;
            }
        }

        return $maxLimit > 0 ? $maxLimit : 60;
    }
}
