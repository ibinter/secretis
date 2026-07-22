<?php

namespace App\Events;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * MessageSent — Event Reverb pour la messagerie temps réel
 *
 * Cet événement est broadcasté via Laravel Reverb (WebSocket) vers :
 *  - Le channel privé de la conversation : conversation.{id}
 *  - Les channels privés de chaque destinataire : user.{id} (pour la notification globale)
 *
 * Côté frontend (Echo) :
 *   Echo.private(`conversation.${conversationId}`)
 *        .listen('.message.sent', (e) => { ... })
 *
 *   Echo.private(`user.${userId}`)
 *        .listen('.message.sent', (e) => { ... }) // Badge non lus
 *
 * SECURITE : Les channels sont privés — vérification d'authentification
 * dans BroadcastServiceProvider via les Broadcast::channel() routes.
 */
class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  Message      $message      Le message envoyé (sera sérialisé en JSON)
     * @param  Conversation $conversation La conversation concernée
     * @param  array        $recipientIds IDs des destinataires (pour les channels individuels)
     * @param  string       $eventType    Type d'événement : 'message.sent' | 'message.deleted' | 'message.updated'
     */
    public function __construct(
        public readonly Message      $message,
        public readonly Conversation $conversation,
        public readonly array        $recipientIds = [],
        public readonly string       $eventType    = 'message.sent',
    ) {
        // Charger les relations nécessaires pour le broadcast payload
        $this->message->loadMissing([
            'sender:id,name,avatar',
            'attachments',
            'replyTo:id,content,sender_id',
            'replyTo.sender:id,name',
        ]);
    }

    // -------------------------------------------------------------------------
    // Channels de diffusion
    // -------------------------------------------------------------------------

    /**
     * Diffuse sur :
     *  1. Le channel privé de la conversation (pour les bulles de chat temps réel)
     *  2. Les channels privés de chaque destinataire (pour mettre à jour les badges)
     */
    public function broadcastOn(): array
    {
        $channels = [
            // Channel de la conversation — tous les participants connectés reçoivent
            new PrivateChannel("conversation.{$this->conversation->id}"),
        ];

        // Channel individuel de chaque destinataire — pour la notification badge
        foreach ($this->recipientIds as $recipientId) {
            $channels[] = new PrivateChannel("user.{$recipientId}");
        }

        return $channels;
    }

    // -------------------------------------------------------------------------
    // Nom de l'événement côté client
    // -------------------------------------------------------------------------

    /**
     * Le nom de l'événement tel qu'écouté par Echo côté frontend.
     * Le point devant indique à Echo que c'est un événement custom (pas préfixé par App\\Events\\).
     */
    public function broadcastAs(): string
    {
        return $this->eventType; // ex: 'message.sent', 'message.deleted'
    }

    // -------------------------------------------------------------------------
    // Payload envoyé au client
    // -------------------------------------------------------------------------

    /**
     * Données transmises au client via WebSocket.
     * SECURITE : Ne pas inclure de données sensibles dans le payload.
     */
    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id'              => $this->message->id,
                'conversation_id' => $this->message->conversation_id,
                'content'         => $this->eventType === 'message.deleted' ? null : $this->message->content,
                'type'            => $this->message->type,
                'is_deleted'      => $this->message->deleted_at !== null,
                'sender'          => [
                    'id'     => $this->message->sender_id,
                    'name'   => $this->message->sender?->name,
                    'avatar' => $this->message->sender?->avatar,
                ],
                'reply_to'    => $this->message->replyTo ? [
                    'id'          => $this->message->replyTo->id,
                    'content'     => $this->message->replyTo->content,
                    'sender_name' => $this->message->replyTo->sender?->name,
                ] : null,
                'attachments' => $this->message->attachments ?? [],
                'created_at'  => $this->message->created_at?->toIso8601String(),
            ],
            'conversation' => [
                'id'   => $this->conversation->id,
                'type' => $this->conversation->type,
                'name' => $this->conversation->name,
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Queue — Broadcast en arrière-plan
    // -------------------------------------------------------------------------

    /**
     * Nom de la queue pour le broadcast asynchrone.
     * Les événements Reverb sont traités par le worker queue.
     */
    public string $queue = 'broadcasts';
}
