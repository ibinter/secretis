<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\VisitorInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Invitation visiteur bientôt expirée et non utilisee — rappel a l'hote.
 *
 * Appelee par App\Console\Commands\VisitorAlerts :
 *   $inv->invitedBy?->notify(new InvitationExpiringNotification($inv))
 */
class InvitationExpiringNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly VisitorInvitation $invitation,
    ) {
        $this->queue = 'notifications';
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $expiresAt = $this->invitation->expires_at;
        $expires   = $expiresAt instanceof \DateTimeInterface
            ? $expiresAt->format('d/m/Y a H:i')
            : (string) $expiresAt;

        return [
            'type'          => 'visitor_invitation_expiring',
            'category'      => 'visitor',
            'severity'      => 'warning',
            'title'         => 'Invitation visiteur bientôt expirée',
            'body'          => "L'invitation de {$this->invitation->visitor_name} expire le {$expires} "
                             . 'et n\'a pas encore été utilisée.',
            'action_url'    => '/accueil/invitations',
            'action_label'  => 'Voir l\'invitation',
            'invitation_id' => $this->invitation->id,
            'visitor_name'  => $this->invitation->visitor_name,
            'visitor_email' => $this->invitation->visitor_email,
            'expires_at'    => $expiresAt instanceof \DateTimeInterface
                ? $expiresAt->toIso8601String()
                : $expiresAt,
        ];
    }
}
