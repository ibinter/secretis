<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;

class SaraChatController extends Controller
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
Tu es SARA, l'assistante IA officielle de SECRETIS ERP, la solution de gestion de secrétariat et de courrier de IBIG Soft (https://secretis.ibigsoft.com).

CONTEXTE PRODUIT :
- SECRETIS ERP gère : courrier entrant/sortant, documents (GED), agenda/événements, réunions, visiteurs, tâches, notes de frais, RH, facturation, circulaires, annuaire de contacts.
- Éditeur : IBIG Soft (Côte d'Ivoire), écosystème de 16 solutions métiers.
- Essai gratuit disponible, plusieurs formules d'abonnement, support 7j/7.
- Contact : secretis@ibigsoft.com — WhatsApp disponible sur le site.

RÈGLES STRICTES (à respecter absolument) :
1. Réponds uniquement en français, sauf si l'utilisateur écrit dans une autre langue.
2. Reste dans le périmètre SECRETIS ERP et IBIG Soft. Pour toute question hors sujet, redirige poliment vers le produit.
3. Ne divulgue jamais d'informations techniques internes (serveurs, mots de passe, code, architecture).
4. N'invente jamais de prix précis ni de fonctionnalités inexistantes — invite à contacter l'équipe commerciale pour un devis.
5. Ne donne aucun conseil juridique, médical ou financier.
6. Sois concise : 2 à 5 phrases maximum par réponse.
7. Ton professionnel, chaleureux et orienté solution.
8. Si l'utilisateur veut essayer le produit, oriente-le vers le bouton "Essai gratuit" ou la page /login.
9. Ne traite jamais de données personnelles sensibles ; si l'utilisateur en partage, invite-le à ne pas le faire.
10. En cas de problème technique client, oriente vers le support : secretis@ibigsoft.com.
PROMPT;

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
            'history' => 'sometimes|array|max:10',
            'history.*.role' => 'required_with:history|in:user,assistant',
            'history.*.content' => 'required_with:history|string|max:2000',
        ]);

        $key = 'sara-chat:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 20)) {
            return response()->json([
                'reply' => "Vous avez atteint la limite de messages. Merci de réessayer dans quelques minutes ou de nous contacter à secretis@ibigsoft.com.",
                'rate_limited' => true,
            ], 429);
        }
        RateLimiter::hit($key, 300);

        $apiKey = config('services.groq.key', env('GROQ_API_KEY'));
        if (!$apiKey) {
            return response()->json(['reply' => $this->fallback(), 'fallback' => true]);
        }

        $messages = [['role' => 'system', 'content' => self::SYSTEM_PROMPT]];
        foreach ($validated['history'] ?? [] as $h) {
            $messages[] = ['role' => $h['role'], 'content' => $h['content']];
        }
        $messages[] = ['role' => 'user', 'content' => $validated['message']];

        try {
            $response = Http::timeout(25)
                ->withToken($apiKey)
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => env('SARA_AI_MODEL', 'llama-3.3-70b-versatile'),
                    'messages' => $messages,
                    'max_tokens' => 400,
                    'temperature' => 0.5,
                ]);

            if ($response->successful()) {
                $reply = $response->json('choices.0.message.content');
                if (is_string($reply) && trim($reply) !== '') {
                    return response()->json(['reply' => trim($reply)]);
                }
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['reply' => $this->fallback(), 'fallback' => true]);
    }

    private function fallback(): string
    {
        return "Je rencontre un souci technique momentané. Vous pouvez nous écrire à secretis@ibigsoft.com ou via WhatsApp — notre équipe vous répondra rapidement !";
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
