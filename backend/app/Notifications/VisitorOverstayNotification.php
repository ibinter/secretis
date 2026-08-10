<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\VisitLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Depassement de duree de visite — alerte aux receptionnistes.
 *
 * Appelee par App\Console\Commands\VisitorAlerts :
 *   new VisitorOverstayNotification($visit, $item['duration_min'])
 */
class VisitorOverstayNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly VisitLog $visit,
        public readonly int      $durationMinutes,
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

        $hours   = intdiv($this->durationMinutes, 60);
        $minutes = $this->durationMinutes % 60;

        return [
            'type'             => 'visitor_overstay',
            'category'         => 'visitor',
            'severity'         => 'warning',
            'title'            => 'Visiteur présent depuis trop longtemps',
            'body'             => "{$name} est présent depuis {$hours}h{$minutes}min sans avoir été enregistré en sortie.",
            'action_url'       => '/accueil/visiteurs',
            'action_label'     => 'Régulariser la sortie',
            'visit_id'         => $this->visit->id,
            'visitor_id'       => $this->visit->visitor_id,
            'visitor_name'     => $name,
            'duration_minutes' => $this->durationMinutes,
        ];
    }
}
