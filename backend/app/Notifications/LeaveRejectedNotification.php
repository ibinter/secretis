<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Demande de congé refusée — envoyee a l'employe.
 *
 * Appelee par App\Services\LeaveService::notifyEmployee($leave, 'rejected').
 */
class LeaveRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly LeaveRequest $leave,
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
        $reason = $this->leave->rejection_reason;

        return [
            'type'         => 'leave_rejected',
            'category'     => 'rh',
            'severity'     => 'warning',
            'title'        => 'Demande de congé refusée',
            'body'         => 'Votre demande de congé du '
                            . $this->formatDate($this->leave->start_date) . ' au '
                            . $this->formatDate($this->leave->end_date) . ' a été refusée.'
                            . ($reason ? ' Motif : ' . $reason : ''),
            'action_url'   => '/rh/conges/' . $this->leave->id,
            'action_label' => 'Voir ma demande',
            'leave_id'     => $this->leave->id,
            'reason'       => $reason,
            'start_date'   => $this->formatDate($this->leave->start_date),
            'end_date'     => $this->formatDate($this->leave->end_date),
        ];
    }

    private function formatDate(mixed $date): string
    {
        if ($date instanceof \DateTimeInterface) {
            return $date->format('d/m/Y');
        }

        return $date ? (string) $date : '-';
    }
}
