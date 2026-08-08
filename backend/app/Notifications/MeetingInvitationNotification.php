<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Meeting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Invitation à une réunion — envoyee a chaque participant.
 *
 * Appelee par App\Services\MeetingService (creation de reunion).
 * La table `meetings` porte `scheduled_at` (pas `start_at`).
 */
class MeetingInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Meeting $meeting,
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
        $when = $this->meeting->scheduled_at instanceof \DateTimeInterface
            ? $this->meeting->scheduled_at->format('d/m/Y a H:i')
            : (string) $this->meeting->scheduled_at;

        return [
            'type'         => 'meeting_invitation',
            'category'     => 'meeting',
            'severity'     => 'info',
            'title'        => 'Invitation à une réunion',
            'body'         => "« {$this->meeting->title} » — le {$when}"
                            . ($this->meeting->location ? " ({$this->meeting->location})" : ''),
            'action_url'   => '/reunions/' . $this->meeting->id,
            'action_label' => 'Voir la réunion',
            'meeting_id'   => $this->meeting->id,
            'scheduled_at' => $this->meeting->scheduled_at instanceof \DateTimeInterface
                ? $this->meeting->scheduled_at->toIso8601String()
                : $this->meeting->scheduled_at,
            'location'     => $this->meeting->location,
        ];
    }
}
