<?php

namespace App\Events;

use App\Models\AppNotification;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * NotificationCreated — Event Reverb pour les notifications globales
 *
 * Broadcasté quand une notification est créée pour un utilisateur.
 * Met à jour le badge de notifications dans le header en temps réel
 * sans que l'utilisateur ait besoin de recharger la page.
 *
 * Côté frontend (Echo) :
 *   Echo.private(`user.${userId}`)
 *        .listen('.notification.created', (e) => {
 *            // Incrémenter le badge, afficher le toast
 *        })
 *
 * Types de notifications gérés :
 *  - message        : Nouveau message reçu
 *  - task_assigned  : Tâche assignée
 *  - circular       : Nouvelle circulaire
 *  - visitor        : Visiteur arrivé
 *  - meeting        : Réunion dans X minutes
 *  - mail_urgent    : Courrier urgent reçu
 *  - system         : Message système (licence, maintenance)
 */
class NotificationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  AppNotification $notification La notification créée en base
     * @param  User            $user         L'utilisateur destinataire
     */
    public function __construct(
        public readonly AppNotification $notification,
        public readonly User            $user,
    ) {}

    // -------------------------------------------------------------------------
    // Channel privé de l'utilisateur
    // -------------------------------------------------------------------------

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->user->id}"),
        ];
    }

    // -------------------------------------------------------------------------
    // Nom de l'événement client
    // -------------------------------------------------------------------------

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    // -------------------------------------------------------------------------
    // Payload
    // -------------------------------------------------------------------------

    public function broadcastWith(): array
    {
        return [
            'notification' => [
                'id'         => $this->notification->id,
                'type'       => $this->notification->type,
                'title'      => $this->notification->title,
                'body'       => $this->notification->body,
                'data'       => $this->notification->data ?? [],
                'read_at'    => null, // Nouvelle notification → non lue
                'created_at' => $this->notification->created_at?->toIso8601String(),
                // URL de redirection selon le type
                'action_url' => $this->resolveActionUrl(),
                // Icône et couleur selon le type
                'icon'       => $this->resolveIcon(),
                'color'      => $this->resolveColor(),
            ],
            // Compteur total de notifications non lues (pour mettre à jour le badge)
            'unread_count' => AppNotification::where('user_id', $this->user->id)
                ->whereNull('read_at')
                ->count(),
        ];
    }

    // -------------------------------------------------------------------------
    // Helpers — Métadonnées de la notification selon son type
    // -------------------------------------------------------------------------

    private function resolveActionUrl(): ?string
    {
        $data = $this->notification->data ?? [];

        return match ($this->notification->type) {
            'message'       => "/messages/{$data['conversation_id']}",
            'task_assigned' => "/taches/{$data['task_id']}",
            'circular'      => "/circulaires/{$data['circular_id']}",
            'visitor'       => "/accueil/visiteurs/{$data['visitor_id']}",
            'meeting'       => "/agenda/reunions/{$data['event_id']}",
            'mail_urgent'   => "/courrier/{$data['courrier_id']}",
            default         => null,
        };
    }

    private function resolveIcon(): string
    {
        return match ($this->notification->type) {
            'message'       => 'chat-bubble-left-right',
            'task_assigned' => 'clipboard-document-check',
            'circular'      => 'megaphone',
            'visitor'       => 'user-plus',
            'meeting'       => 'calendar',
            'mail_urgent'   => 'envelope-open',
            'system'        => 'cog-6-tooth',
            default         => 'bell',
        };
    }

    private function resolveColor(): string
    {
        return match ($this->notification->type) {
            'mail_urgent'   => 'red',
            'visitor'       => 'blue',
            'task_assigned' => 'orange',
            'circular'      => 'purple',
            'meeting'       => 'green',
            'message'       => 'indigo',
            default         => 'gray',
        };
    }

    // -------------------------------------------------------------------------
    // Queue
    // -------------------------------------------------------------------------

    public string $queue = 'broadcasts';
}
