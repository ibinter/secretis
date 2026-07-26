<?php

namespace App\Http\Controllers;

use App\Services\SaraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class SaraController extends Controller
{
    public function __construct(protected SaraService $sara)
    {
    }

    /**
     * POST /api/sara/chat
     * Endpoint principal — message → réponse IA.
     *
     * Rate limiting : 20 messages / heure par utilisateur.
     */
    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'message' => ['required', 'string', 'min:2', 'max:2000'],
            'mode'    => ['sometimes', 'string', 'in:public,internal'],
        ]);

        $mode    = $request->input('mode', 'internal');
        $user    = $request->user();
        $message = trim($request->input('message'));

        // ── Rate limiting ──────────────────────────────────────────────────────
        $rateLimitKey = 'sara_chat:' . ($user ? $user->id : $request->ip());

        if (RateLimiter::tooManyAttempts($rateLimitKey, 20)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            return response()->json([
                'success' => false,
                'error'   => 'rate_limited',
                'message' => "Vous avez atteint la limite de 20 messages par heure. Réessayez dans {$seconds} secondes.",
                'retry_after' => $seconds,
            ], 429);
        }

        RateLimiter::hit($rateLimitKey, 3600); // fenêtre de 1 heure

        // ── Contexte ───────────────────────────────────────────────────────────
        $context = ['mode' => $mode];

        if ($user) {
            $org = $user->organization;
            if ($org) {
                $context = array_merge($context, $this->sara->buildContext($user, $org));
            } else {
                $context = array_merge($context, [
                    'user_name'       => $user->first_name,
                    'user_role'       => $user->role,
                    'user_locale'     => $user->locale ?? 'fr',
                    'organization'    => 'IBIG Soft (SuperAdmin)',
                    'plan'            => 'Enterprise',
                    'modules_enabled' => ['all'],
                ]);
            }
        }

        // ── Appel SARA ─────────────────────────────────────────────────────────
        try {
            $response = $this->sara->chat($message, $context, $user ?? $this->getGuestUser());

            return response()->json([
                'success'  => true,
                'response' => $response,
                'remaining_requests' => max(0, 20 - RateLimiter::attempts($rateLimitKey)),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'service_error',
                'message' => "SARA est temporairement indisponible. Veuillez réessayer dans quelques instants.",
            ], 503);
        }
    }

    /**
     * GET /api/sara/quick-questions
     * Retourne les questions suggérées selon le contexte.
     */
    public function getQuickQuestions(Request $request): JsonResponse
    {
        $mode = $request->query('mode', 'internal');
        $user = $request->user();

        $context = [];
        if ($user) {
            $context['user_role'] = $user->role;
        }

        $questions = $this->sara->getQuickQuestions($mode, $context);

        return response()->json([
            'success'   => true,
            'questions' => $questions,
        ]);
    }

    /**
     * GET /api/sara/status
     * Statut public de disponibilité de SARA (pour afficher le badge "En ligne").
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'online'   => true,
            'provider' => config('secretis.ai.provider', 'groq'),
            'version'  => '1.0',
        ]);
    }

    // ─── Helpers privés ────────────────────────────────────────────────────────

    /**
     * Utilisateur invité fictif pour le mode public (non authentifié).
     */
    protected function getGuestUser(): object
    {
        return new class {
            public int $id = 0;
            public ?int $organization_id = null;
            public string $first_name = 'Visiteur';
            public string $role = 'guest';
            public string $locale = 'fr';
            public ?object $organization = null;
        };
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
