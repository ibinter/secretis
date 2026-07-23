<?php

namespace App\Http\Controllers;

use App\Models\SaraConversation;
use App\Services\SaraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SaraChatController extends Controller
{
    public function __construct(protected SaraService $sara) {}

    /**
     * Page dédiée SARA Chat (Inertia).
     */
    public function index(): Response
    {
        $user = Auth::user();

        $conversations = SaraConversation::forOrganization($user->organization_id)
            ->forUser($user->id)
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get(['id', 'title', 'context_module', 'provider', 'feedback', 'created_at', 'updated_at'])
            ->map(fn($c) => [
                'id'             => $c->id,
                'title'          => $c->title,
                'context_module' => $c->context_module,
                'provider'       => $c->provider,
                'feedback'       => $c->feedback,
                'created_at'     => $c->created_at->diffForHumans(),
                'updated_at'     => $c->updated_at->diffForHumans(),
            ]);

        $quickQuestions = $this->sara->getQuickQuestions('general');

        return Inertia::render('Sara/Chat', [
            'conversations'  => $conversations,
            'quickQuestions' => $quickQuestions,
        ]);
    }

    /**
     * POST /api/sara/chat — envoyer un message, créer/continuer une conversation.
     */
    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'message'         => 'required|string|max:2000',
            'conversation_id' => 'nullable|integer|exists:sara_conversations,id',
            'context_module'  => 'nullable|string|in:agenda,ged,tasks,visitors,hr,accounting,reporting,admin',
        ]);

        $user    = Auth::user();
        $orgId   = $user->organization_id;
        $message = $request->string('message')->trim()->value();

        // Charger ou créer la conversation
        if ($request->conversation_id) {
            $conversation = SaraConversation::where('id', $request->conversation_id)
                ->where('organization_id', $orgId)
                ->where('user_id', $user->id)
                ->firstOrFail();
        } else {
            $conversation = new SaraConversation([
                'organization_id' => $orgId,
                'user_id'         => $user->id,
                'title'           => $this->sara->generateTitle($message),
                'context_module'  => $request->context_module,
                'messages'        => [],
                'tokens_used'     => 0,
                'provider'        => config('sara.provider', config('secretis.ai.provider', 'groq')),
            ]);
        }

        // Ajouter le message utilisateur
        $conversation->addMessage('user', $message);

        // Obtenir la réponse de SARA
        $result = $this->sara->chat(
            $conversation->messages,
            $user,
            $conversation->context_module
        );

        // Ajouter la réponse SARA à l'historique
        $conversation->addMessage('assistant', $result['content']);
        $conversation->tokens_used += $result['tokens_used'];
        $conversation->provider    = $result['provider'];
        $conversation->model_used  = $result['model'] ?? null;
        $conversation->save();

        // Suggestions FAQ si pertinent
        $faqSuggestions = $this->sara->suggestFromFaq($message);

        return response()->json([
            'conversation_id' => $conversation->id,
            'response'        => $result['content'],
            'provider'        => $result['provider'],
            'model'           => $result['model'],
            'faq_suggestions' => array_slice($faqSuggestions, 0, 2),
        ]);
    }

    /**
     * GET /api/sara/conversations — liste des conversations de l'utilisateur.
     */
    public function conversations(): JsonResponse
    {
        $user = Auth::user();

        $conversations = SaraConversation::forOrganization($user->organization_id)
            ->forUser($user->id)
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get(['id', 'title', 'context_module', 'provider', 'feedback', 'tokens_used', 'created_at', 'updated_at'])
            ->map(fn($c) => [
                'id'             => $c->id,
                'title'          => $c->title,
                'context_module' => $c->context_module,
                'provider'       => $c->provider,
                'feedback'       => $c->feedback,
                'tokens_used'    => $c->tokens_used,
                'created_at'     => $c->created_at->toIso8601String(),
                'updated_at'     => $c->updated_at->toIso8601String(),
                'updated_human'  => $c->updated_at->diffForHumans(),
            ]);

        return response()->json(['conversations' => $conversations]);
    }

    /**
     * GET /api/sara/conversations/{conversation} — détail d'une conversation.
     */
    public function conversation(SaraConversation $conversation): JsonResponse
    {
        $user = Auth::user();

        abort_unless(
            $conversation->organization_id === $user->organization_id && $conversation->user_id === $user->id,
            403,
            'Accès refusé.'
        );

        return response()->json([
            'conversation' => [
                'id'             => $conversation->id,
                'title'          => $conversation->title,
                'context_module' => $conversation->context_module,
                'messages'       => $conversation->messages,
                'tokens_used'    => $conversation->tokens_used,
                'provider'       => $conversation->provider,
                'model_used'     => $conversation->model_used,
                'feedback'       => $conversation->feedback,
                'feedback_comment' => $conversation->feedback_comment,
                'created_at'     => $conversation->created_at->toIso8601String(),
                'updated_at'     => $conversation->updated_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * DELETE /api/sara/conversations/{conversation} — supprimer une conversation.
     */
    public function deleteConversation(SaraConversation $conversation): JsonResponse
    {
        $user = Auth::user();

        abort_unless(
            $conversation->organization_id === $user->organization_id && $conversation->user_id === $user->id,
            403,
            'Accès refusé.'
        );

        $conversation->delete();

        return response()->json(['message' => 'Conversation supprimée.']);
    }

    /**
     * POST /api/sara/conversations/{conversation}/feedback — laisser un feedback.
     */
    public function feedback(Request $request, SaraConversation $conversation): JsonResponse
    {
        $request->validate([
            'feedback'         => 'required|in:positive,negative',
            'feedback_comment' => 'nullable|string|max:1000',
        ]);

        $user = Auth::user();

        abort_unless(
            $conversation->organization_id === $user->organization_id && $conversation->user_id === $user->id,
            403,
            'Accès refusé.'
        );

        $conversation->update([
            'feedback'         => $request->feedback,
            'feedback_comment' => $request->feedback_comment,
        ]);

        return response()->json(['message' => 'Merci pour votre retour !']);
    }
}
