<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\VisitLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Visiteur arrive a l'accueil — notification a l'hote.
 *
 * Appelee par App\Jobs\NotifyHostVisitorArrived::handle() ($host->notify(...)).
 * L'email dedie est envoye separement via App\Mail\VisitorArrivedMail.
 */
class VisitorArrivedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly VisitLog $visit,
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
        $visitor = $this->visit->visitor;
        $name    = $visitor
            ? trim(($visitor->first_name ?? '') . ' ' . ($visitor->last_name ?? ''))
            : 'Un visiteur';

        return [
            'type'         => 'visitor_arrived',
            'category'     => 'visitor',
            'severity'     => 'info',
            'title'        => 'Votre visiteur est arrivé',
            'body'         => $name
                            . ($visitor?->company ? " ({$visitor->company})" : '')
                            . ' vous attend à l\'accueil.',
            'action_url'   => '/accueil/visiteurs',
            'action_label' => 'Voir la réception',
            'visit_id'     => $this->visit->id,
            'visitor_id'   => $this->visit->visitor_id,
            'visitor_name' => $name,
            'badge_number' => $this->visit->badge_number,
        ];
    }
}
