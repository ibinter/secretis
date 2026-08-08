<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Alerte activite suspecte — envoyee aux super-admins.
 *
 * Appelee par App\Services\IntrusionDetectionService :
 *   new SuspiciousActivityAlert($user, $type, $count, $context)
 */
class SuspiciousActivityAlert extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param array<string, mixed> $context
     */
    public function __construct(
        public readonly User   $user,
        public readonly string $activityType,
        public readonly int    $count,
        public readonly array  $context = [],
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
        return [
            'type'          => 'suspicious_activity',
            'category'      => 'system',
            'severity'      => 'error',
            'title'         => 'Activité suspecte détectée',
            'body'          => "{$this->count} événement(s) « {$this->activityType} » détecté(s) "
                             . "pour le compte {$this->user->email}.",
            'action_url'    => '/admin/securite/incidents',
            'action_label'  => 'Analyser',
            'user_id'       => $this->user->id,
            'user_email'    => $this->user->email,
            'activity_type' => $this->activityType,
            'count'         => $this->count,
            'context'       => $this->context,
        ];
    }
}
