<?php

namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Message;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * MessageController — Messagerie interne temps réel
 *
 * Gère les conversations directes (1-to-1) et de groupe.
 * Les messages sont broadcastés via Laravel Reverb (WebSocket).
 * La pagination utilise cursor pagination pour les grandes conversations.
 *
 * SECURITE :
 *  - Isolation multi-tenant stricte (organization_id sur chaque requête)
 *  - Vérification de participation avant tout accès à une conversation
 *  - Soft delete des messages (traçabilité conservée)
 */
class MessageController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    // -------------------------------------------------------------------------
    // index() — Liste des conversations avec dernier message + nb non lus
    // -------------------------------------------------------------------------

    /**
     * Retourne toutes les conversations de l'utilisateur connecté,
     * triées par date du dernier message (les plus récentes en premier).
     * Chaque conversation inclut le dernier message et le nombre de messages non lus.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $conversations = Conversation::query()
            // Filtrer uniquement les conversations où l'utilisateur est participant
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id)->where('left_at', null))
            // Isolation tenant
            ->where('organization_id', $user->organization_id)
            // Charger les participants (pour l'affichage des avatars)
            ->with([
                'participants.user:id,name,avatar,status',
                // Dernier message (non supprimé)
                'latestMessage' => fn ($q) => $q->whereNull('deleted_at'),
                'latestMessage.sender:id,name,avatar',
            ])
            // Compter les messages non lus pour l'utilisateur courant
            ->withCount([
                'messages as unread_count' => fn ($q) => $q
                    ->whereNull('deleted_at')
                    ->whereDoesntHave('reads', fn ($r) => $r->where('user_id', $user->id)),
            ])
            // Trier par date du dernier message
            ->orderByDesc(
                Message::select('created_at')
                    ->whereColumn('conversation_id', 'conversations.id')
                    ->whereNull('deleted_at')
                    ->latest()
                    ->limit(1)
            )
            ->get()
            ->map(fn (Conversation $conv) => $this->formatConversation($conv, $user));

        return response()->json($conversations);
    }

    // -------------------------------------------------------------------------
    // getConversation($id) — Messages paginés (cursor pagination)
    // -------------------------------------------------------------------------

    /**
     * Retourne les messages d'une conversation avec cursor pagination.
     * Le cursor est l'ID du dernier message reçu (pagination vers le passé).
     * Charge 30 messages par page.
     *
     * Vérification d'accès : l'utilisateur doit être participant actif.
     */
    public function getConversation(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        // Récupérer la conversation et vérifier que l'utilisateur est participant
        $conversation = Conversation::where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id)->where('left_at', null))
            ->with(['participants.user:id,name,avatar,status'])
            ->firstOrFail();

        $perPage = min((int) $request->get('per_page', 30), 100);
        $cursor  = $request->get('cursor'); // ID du message le plus ancien déjà chargé

        $query = Message::where('conversation_id', $conversation->id)
            ->whereNull('deleted_at')
            ->with([
                'sender:id,name,avatar',
                'reads:message_id,user_id,read_at',
                'attachments',
                // Réponse à un message (thread léger)
                'replyTo:id,content,sender_id',
                'replyTo.sender:id,name',
            ])
            ->orderByDesc('id');

        // Cursor pagination : charger les messages plus anciens que le cursor
        if ($cursor) {
            $query->where('id', '<', (int) $cursor);
        }

        $messages   = $query->limit($perPage)->get()->reverse()->values();
        $nextCursor = $messages->isNotEmpty() ? $messages->first()->id : null;
        $hasMore    = $nextCursor && Message::where('conversation_id', $conversation->id)
            ->whereNull('deleted_at')
            ->where('id', '<', $nextCursor)
            ->exists();

        // Marquer les messages chargés comme lus automatiquement
        $this->markMessagesAsRead($conversation->id, $user->id, $messages->pluck('id')->toArray());

        return response()->json([
            'conversation' => $this->formatConversation($conversation, $user),
            'messages'     => $messages->map(fn (Message $msg) => $this->formatMessage($msg, $user)),
            'pagination'   => [
                'next_cursor' => $hasMore ? $nextCursor : null,
                'has_more'    => $hasMore,
                'per_page'    => $perPage,
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // sendMessage() — Envoyer message + broadcast Reverb
    // -------------------------------------------------------------------------

    /**
     * Envoie un message dans une conversation et le diffuse via Reverb.
     * Supporte : texte, pièces jointes (fichiers uploadés séparément), réponse à un message.
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'conversation_id' => ['required', 'integer'],
            'content'         => ['required_without:attachment_ids', 'nullable', 'string', 'max:10000'],
            'attachment_ids'  => ['nullable', 'array', 'max:10'],
            'attachment_ids.*'=> ['integer'],
            'reply_to_id'     => ['nullable', 'integer'],
            'type'            => ['in:text,file,image,voice'],
        ]);

        // Vérifier l'accès à la conversation
        $conversation = Conversation::where('id', $validated['conversation_id'])
            ->where('organization_id', $user->organization_id)
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id)->where('left_at', null))
            ->firstOrFail();

        $message = DB::transaction(function () use ($validated, $conversation, $user) {
            $msg = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id'       => $user->id,
                'content'         => $validated['content'] ?? null,
                'type'            => $validated['type'] ?? 'text',
                'reply_to_id'     => $validated['reply_to_id'] ?? null,
                'metadata'        => [],
            ]);

            // Associer les pièces jointes (préalablement uploadées)
            if (!empty($validated['attachment_ids'])) {
                $msg->attachments()->whereIn('id', $validated['attachment_ids'])
                    ->update(['message_id' => $msg->id]);
            }

            // Mettre à jour le timestamp de la conversation
            $conversation->touch();

            return $msg;
        });

        // Charger les relations pour la réponse et le broadcast
        $message->load([
            'sender:id,name,avatar',
            'attachments',
            'replyTo:id,content,sender_id',
            'replyTo.sender:id,name',
        ]);

        // ► BROADCAST REVERB — diffuser le message à tous les participants
        $participantIds = $conversation->participants()
            ->where('left_at', null)
            ->where('user_id', '!=', $user->id)
            ->pluck('user_id')
            ->toArray();

        broadcast(new MessageSent(
            message:      $message,
            conversation: $conversation,
            recipientIds: $participantIds,
        ))->toOthers();

        $this->auditService->log(
            action: 'message_sent',
            module: 'messagerie',
            resourceType: 'message',
            resourceId: $message->id,
            newValues: ['conversation_id' => $conversation->id],
        );

        return response()->json($this->formatMessage($message, $user), 201);
    }

    // -------------------------------------------------------------------------
    // createConversation() — Créer conversation directe ou groupe
    // -------------------------------------------------------------------------

    /**
     * Crée une conversation directe (2 utilisateurs) ou de groupe (N utilisateurs).
     * Pour les conversations directes, retourne la conversation existante si elle existe déjà.
     */
    public function createConversation(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'type'         => ['required', 'in:direct,group'],
            'name'         => ['required_if:type,group', 'nullable', 'string', 'max:255'],
            'participant_ids' => ['required', 'array', 'min:1'],
            'participant_ids.*' => ['integer'],
        ]);

        // Toujours inclure l'utilisateur courant
        $participantIds = array_unique(array_merge([$user->id], $validated['participant_ids']));

        // Vérifier que tous les participants appartiennent à la même organisation
        $validCount = User::where('organization_id', $user->organization_id)
            ->whereIn('id', $participantIds)
            ->count();

        if ($validCount !== count($participantIds)) {
            return response()->json(['message' => 'Certains utilisateurs sont invalides.'], 422);
        }

        // Pour une conversation directe, chercher si elle existe déjà
        if ($validated['type'] === 'direct' && count($participantIds) === 2) {
            $existing = $this->findExistingDirectConversation($participantIds, $user->organization_id);
            if ($existing) {
                $existing->load(['participants.user:id,name,avatar,status', 'latestMessage.sender:id,name']);
                return response()->json($this->formatConversation($existing, $user));
            }
        }

        $conversation = DB::transaction(function () use ($validated, $participantIds, $user) {
            $conv = Conversation::create([
                'organization_id' => $user->organization_id,
                'type'            => $validated['type'],
                'name'            => $validated['name'] ?? null,
                'created_by'      => $user->id,
                'token'           => Str::uuid(),
            ]);

            // Ajouter les participants
            foreach ($participantIds as $participantId) {
                ConversationParticipant::create([
                    'conversation_id' => $conv->id,
                    'user_id'         => $participantId,
                    'joined_at'       => now(),
                    'role'            => $participantId === $user->id ? 'admin' : 'member',
                ]);
            }

            return $conv;
        });

        $conversation->load(['participants.user:id,name,avatar,status']);

        $this->auditService->log(
            action: 'conversation_created',
            module: 'messagerie',
            resourceType: 'conversation',
            resourceId: $conversation->id,
            newValues: ['type' => $validated['type'], 'participants' => $participantIds],
        );

        return response()->json($this->formatConversation($conversation, $user), 201);
    }

    // -------------------------------------------------------------------------
    // markAsRead($conversationId) — Marquer comme lu
    // -------------------------------------------------------------------------

    /**
     * Marque tous les messages non lus d'une conversation comme lus.
     * Broadcast le statut de lecture aux autres participants.
     */
    public function markAsRead(Request $request, int $conversationId): JsonResponse
    {
        $user = Auth::user();

        $conversation = Conversation::where('id', $conversationId)
            ->where('organization_id', $user->organization_id)
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id))
            ->firstOrFail();

        // Récupérer les IDs des messages non lus
        $unreadIds = Message::where('conversation_id', $conversation->id)
            ->whereNull('deleted_at')
            ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id))
            ->pluck('id')
            ->toArray();

        $this->markMessagesAsRead($conversation->id, $user->id, $unreadIds);

        return response()->json(['marked_count' => count($unreadIds)]);
    }

    // -------------------------------------------------------------------------
    // deleteMessage($id) — Supprimer (soft delete)
    // -------------------------------------------------------------------------

    /**
     * Suppression douce d'un message.
     * L'auteur peut supprimer son propre message.
     * L'admin de conversation peut supprimer n'importe quel message.
     */
    public function deleteMessage(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        $message = Message::where('id', $id)
            ->whereHas('conversation', fn ($q) => $q->where('organization_id', $user->organization_id))
            ->firstOrFail();

        // Autorisation : auteur OU admin de la conversation
        $isAdmin = ConversationParticipant::where('conversation_id', $message->conversation_id)
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();

        if ($message->sender_id !== $user->id && !$isAdmin) {
            return response()->json(['message' => 'Action non autorisée.'], 403);
        }

        $message->update([
            'deleted_at'      => now(),
            'deleted_by'      => $user->id,
            'content'         => null, // Effacer le contenu pour la confidentialité
        ]);

        // Notifier les participants de la suppression via Reverb
        broadcast(new MessageSent(
            message:      $message,
            conversation: $message->conversation,
            recipientIds: [],
            eventType:    'message.deleted',
        ))->toOthers();

        $this->auditService->logDeleted('messagerie', 'message', $message->id);

        return response()->json(['message' => 'Message supprimé.']);
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    private function formatConversation(Conversation $conv, User $user): array
    {
        // Pour les conversations directes, le "nom" est celui de l'autre participant
        $otherParticipant = null;
        if ($conv->type === 'direct') {
            $otherParticipant = $conv->participants
                ->firstWhere('user_id', '!=', $user->id)
                ?->user;
        }

        return [
            'id'               => $conv->id,
            'type'             => $conv->type,
            'name'             => $conv->type === 'group' ? $conv->name : $otherParticipant?->name,
            'avatar'           => $conv->type === 'group' ? null : $otherParticipant?->avatar,
            'participants'     => $conv->participants->map(fn ($p) => [
                'id'     => $p->user_id,
                'name'   => $p->user?->name,
                'avatar' => $p->user?->avatar,
                'status' => $p->user?->status,
                'role'   => $p->role,
            ]),
            'latest_message'   => $conv->latestMessage ? $this->formatMessage($conv->latestMessage, $user) : null,
            'unread_count'     => $conv->unread_count ?? 0,
            'created_at'       => $conv->created_at?->toIso8601String(),
            'updated_at'       => $conv->updated_at?->toIso8601String(),
        ];
    }

    private function formatMessage(Message $msg, User $user): array
    {
        return [
            'id'             => $msg->id,
            'conversation_id'=> $msg->conversation_id,
            'content'        => $msg->content,
            'type'           => $msg->type,
            'sender'         => [
                'id'     => $msg->sender_id,
                'name'   => $msg->sender?->name,
                'avatar' => $msg->sender?->avatar,
            ],
            'is_mine'        => $msg->sender_id === $user->id,
            'reply_to'       => $msg->replyTo ? [
                'id'          => $msg->replyTo->id,
                'content'     => $msg->replyTo->content,
                'sender_name' => $msg->replyTo->sender?->name,
            ] : null,
            'attachments'    => $msg->attachments ?? [],
            'reads'          => $msg->reads ?? [],
            'is_deleted'     => $msg->deleted_at !== null,
            'created_at'     => $msg->created_at?->toIso8601String(),
        ];
    }

    private function markMessagesAsRead(int $conversationId, int $userId, array $messageIds): void
    {
        if (empty($messageIds)) {
            return;
        }

        // Insérer les lectures en bulk en ignorant les doublons
        $rows = array_map(fn ($id) => [
            'message_id' => $id,
            'user_id'    => $userId,
            'read_at'    => now()->toDateTimeString(),
        ], $messageIds);

        DB::table('message_reads')->insertOrIgnore($rows);
    }

    private function findExistingDirectConversation(array $participantIds, int $organizationId): ?Conversation
    {
        sort($participantIds);

        return Conversation::where('type', 'direct')
            ->where('organization_id', $organizationId)
            ->whereHas('participants', fn ($q) => $q->where('user_id', $participantIds[0]))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $participantIds[1]))
            ->withCount('participants')
            ->having('participants_count', 2)
            ->first();
    }
}
