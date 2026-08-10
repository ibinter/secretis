<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ExigeSara;
use App\Models\SaraConversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class SaraChatController extends Controller
{
    use ExigeSara;

    private const SYSTEM_PROMPT = <<<'PROMPT'
Tu es SARA, l'assistante IA officielle de SECRETIS ERP, la solution de gestion de secrétariat et de courrier de IBIG Soft (https://secretis.ibigsoft.com).

CONTEXTE PRODUIT :
- SECRETIS ERP gère : courrier entrant/sortant, documents (GED), agenda/événements, réunions, visiteurs, tâches, notes de frais, RH, facturation, circulaires, annuaire de contacts.
- Éditeur : IBIG Soft, écosystème de solutions métiers.
- Contact : secretis@ibigsoft.com — WhatsApp disponible sur le site.
- Les durées, plafonds, paliers et formules ne figurent PAS dans ce contexte :
  ils sont lus dans licence.config.json par l'outil dédié, jamais récités ici.

RÈGLES STRICTES (à respecter absolument) :
1. Réponds uniquement en français, sauf si l'utilisateur écrit dans une autre langue.
2. Reste dans le périmètre SECRETIS ERP et IBIG Soft. Pour toute question hors sujet, redirige poliment vers le produit.
3. Ne divulgue jamais d'informations techniques internes (serveurs, mots de passe, code, architecture).
4. N'invente jamais de prix précis ni de fonctionnalités inexistantes — invite à contacter l'équipe commerciale pour un devis.
5. Ne donne aucun conseil juridique, médical ou financier.
6. Sois concise : 2 à 5 phrases maximum par réponse.
7. Ton professionnel, chaleureux et orienté solution.
8. Si l'utilisateur veut essayer le produit, oriente-le vers le bouton « Essai » ou la page /login, sans citer de durée : c'est l'outil de licence qui la donne.
9. Ne traite jamais de données personnelles sensibles ; si l'utilisateur en partage, invite-le à ne pas le faire.
10. En cas de problème technique client, oriente vers le support : secretis@ibigsoft.com.
PROMPT;

    public function chat(Request $request): JsonResponse
    {
        // ── Droit `sara` — en tout premier ─────────────────────────────────────
        // Cette route était la porte ouverte du chantier : elle est déclarée
        // publique dans routes/api.php (« throttle:30,1 », sans authentification).
        // Or un appelant non authentifié est au mieux en Démo publique, où SARA
        // est fermée — et chaque message envoyé au fournisseur d'IA est facturé.
        if ($refus = $this->refusSiSaraFermee($request)) {
            return $refus instanceof JsonResponse
                ? $refus
                : response()->json($this->saraLicence()->refus($request->user()), 403);
        }

        $validated = $request->validate([
            'message'         => 'required|string|max:2000',
            'history'         => 'sometimes|array|max:10',
            'history.*.role'  => 'required_with:history|in:user,assistant',
            'history.*.content' => 'required_with:history|string|max:2000',
            'conversation_id' => 'sometimes|nullable|integer',
            'context_module'  => 'sometimes|nullable|string|max:50',
        ]);

        $key = 'sara-chat:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 20)) {
            return response()->json([
                'reply'        => "Vous avez atteint la limite de messages. Merci de réessayer dans quelques minutes ou de nous contacter à secretis@ibigsoft.com.",
                'response'     => "Vous avez atteint la limite de messages. Merci de réessayer dans quelques minutes ou de nous contacter à secretis@ibigsoft.com.",
                'rate_limited' => true,
            ], 429);
        }
        RateLimiter::hit($key, 300);

        // Charge la conversation persistée (utilisateur authentifié uniquement)
        $conversation = $this->resolveConversation($validated);

        // Construit l'historique : celui fourni par le client, sinon celui de la conversation persistée
        $history = $validated['history'] ?? $this->historyFromConversation($conversation);

        $licence  = $this->saraLicence();
        $reply    = null;
        $fallback = false;

        // ── Court-circuit licence ──────────────────────────────────────────────
        // Sur une question de licence, aucun appel au fournisseur d'IA n'a lieu :
        // la réponse vient de licence.config.json, lue par l'outil dédié.
        if ($fiche = $licence->courtCircuit($validated['message'])) {
            $conversationId = $this->persistConversation($conversation, $validated, $fiche['reponse']);

            return response()->json([
                'reply'           => $fiche['reponse'],
                'response'        => $fiche['reponse'],
                'conversation_id' => $conversationId,
                'faq_suggestions' => [],
                'fallback'        => false,
                'source'          => $fiche['source'],
                'fiche'           => $fiche['cle'],
            ]);
        }

        $apiKey   = config('services.groq.key', env('GROQ_API_KEY'));

        if ($apiKey) {
            $messages = [['role' => 'system', 'content' => self::SYSTEM_PROMPT . $licence->invite()]];
            foreach ($history as $h) {
                $messages[] = ['role' => $h['role'], 'content' => $h['content']];
            }
            $messages[] = ['role' => 'user', 'content' => $validated['message']];

            try {
                $response = Http::timeout(25)
                    ->withToken($apiKey)
                    ->post('https://api.groq.com/openai/v1/chat/completions', [
                        'model'       => env('SARA_AI_MODEL', 'llama-3.3-70b-versatile'),
                        'messages'    => $messages,
                        'max_tokens'  => 400,
                        'temperature' => 0.5,
                    ]);

                if ($response->successful()) {
                    $content = $response->json('choices.0.message.content');
                    if (is_string($content) && trim($content) !== '') {
                        $reply = trim($content);
                    }
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        if ($reply === null) {
            $reply    = $this->fallback();
            $fallback = true;
        }

        // ── Filtre de sortie ───────────────────────────────────────────────────
        // Relu systématiquement : terme banni, promesse commerciale ou chiffre
        // de licence absent de la configuration → la réponse est remplacée par
        // le renvoi officiel, pas rapiécée.
        $reply = $licence->filtrer($reply, $validated['message']);

        // Persiste la conversation si l'utilisateur est authentifié
        $conversationId = $this->persistConversation($conversation, $validated, $reply);

        return response()->json([
            'reply'           => $reply,
            'response'        => $reply,
            'conversation_id' => $conversationId,
            'faq_suggestions' => [],
            'fallback'        => $fallback,
        ]);
    }

    /**
     * Récupère la conversation persistée ciblée par la requête (si authentifié).
     */
    private function resolveConversation(array $validated): ?SaraConversation
    {
        if (! Auth::check() || empty($validated['conversation_id'])) {
            return null;
        }

        return SaraConversation::where('id', $validated['conversation_id'])
            ->where('user_id', Auth::id())
            ->where('organization_id', Auth::user()->organization_id)
            ->first();
    }

    /**
     * Reconstruit un historique (≤10 derniers messages) depuis une conversation persistée.
     */
    private function historyFromConversation(?SaraConversation $conversation): array
    {
        if (! $conversation) {
            return [];
        }

        return collect($conversation->messages ?? [])
            ->filter(fn ($m) => in_array($m['role'] ?? null, ['user', 'assistant'], true))
            ->map(fn ($m) => ['role' => $m['role'], 'content' => $m['content']])
            ->take(-10)
            ->values()
            ->all();
    }

    /**
     * Persiste (crée ou complète) la conversation. Retourne l'id ou null si non authentifié.
     */
    private function persistConversation(?SaraConversation $conversation, array $validated, string $reply): ?int
    {
        if (! Auth::check()) {
            return null;
        }

        $user = Auth::user();

        if (! $conversation) {
            $conversation = new SaraConversation();
            $conversation->organization_id = $user->organization_id;
            $conversation->user_id         = $user->id;
            $conversation->title           = Str::limit($validated['message'], 50, '…');
            $conversation->context_module  = $validated['context_module'] ?? null;
            $conversation->messages        = [];
            $conversation->provider        = 'groq';
        }

        $conversation->addMessage('user', $validated['message']);
        $conversation->addMessage('assistant', $reply);
        $conversation->model_used = env('SARA_AI_MODEL', 'llama-3.3-70b-versatile');
        $conversation->save();

        return $conversation->id;
    }

    private function fallback(): string
    {
        return "Je rencontre un souci technique momentané. Vous pouvez nous écrire à secretis@ibigsoft.com ou via WhatsApp — notre équipe vous répondra rapidement !";
    }


    /**
     * Page SARA standalone (iframe / accès public).
     */
    public function chatPage(Request $request)
    {
        if ($refus = $this->refusSiSaraFermee($request)) {
            return $refus;
        }

        return response()->view('sara-chat-standalone');
    }

    // ─── Conversations persistées (app authentifiée) ──────────────────────────

    /**
     * GET /api/sara/conversations — liste des conversations de l'utilisateur.
     */
    public function conversations(Request $request): JsonResponse
    {
        $user = Auth::user();

        $conversations = SaraConversation::where('user_id', $user->id)
            ->where('organization_id', $user->organization_id)
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get()
            ->map(fn (SaraConversation $c) => [
                'id'             => $c->id,
                'title'          => $c->title,
                'context_module' => $c->context_module,
                'updated_human'  => $c->updated_at?->diffForHumans(),
                'updated_at'     => $c->updated_at?->toIso8601String(),
            ]);

        return response()->json(['conversations' => $conversations]);
    }

    /**
     * GET /api/sara/conversations/{conversation} — détail + messages.
     */
    public function conversation(SaraConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($conversation);

        return response()->json([
            'conversation' => [
                'id'             => $conversation->id,
                'title'          => $conversation->title,
                'context_module' => $conversation->context_module,
                'messages'       => $conversation->messages ?? [],
                'feedback'       => $conversation->feedback,
            ],
        ]);
    }

    /**
     * DELETE /api/sara/conversations/{conversation}.
     */
    public function deleteConversation(SaraConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($conversation);
        $conversation->delete();

        return response()->json(['success' => true, 'message' => 'Conversation supprimée.']);
    }

    /**
     * POST /api/sara/conversations/{conversation}/feedback.
     */
    public function feedback(Request $request, SaraConversation $conversation): JsonResponse
    {
        $this->authorizeConversation($conversation);

        $validated = $request->validate([
            'feedback' => 'required|in:positive,negative',
            'comment'  => 'nullable|string|max:1000',
        ]);

        $conversation->update([
            'feedback'         => $validated['feedback'],
            'feedback_comment' => $validated['comment'] ?? null,
        ]);

        return response()->json(['success' => true, 'message' => 'Merci pour votre retour.']);
    }

    /**
     * Garde-fou multi-tenant : la conversation doit appartenir à l'utilisateur courant.
     */
    private function authorizeConversation(SaraConversation $conversation): void
    {
        abort_unless(
            Auth::check()
                && $conversation->user_id === Auth::id()
                && $conversation->organization_id === Auth::user()->organization_id,
            403
        );
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
