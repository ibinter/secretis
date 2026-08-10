<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Demande de congé approuvée — envoyee a l'employe.
 *
 * Appelee par App\Services\LeaveService::notifyEmployee($leave, 'approved').
 */
class LeaveApprovedNotification extends Notification implements ShouldQueue
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
        return [
            'type'         => 'leave_approved',
            'category'     => 'rh',
            'severity'     => 'success',
            'title'        => 'Demande de congé approuvée',
            'body'         => 'Votre demande de congé du '
                            . $this->formatDate($this->leave->start_date) . ' au '
                            . $this->formatDate($this->leave->end_date) . ' a été approuvée.',
            'action_url'   => '/rh/conges/' . $this->leave->id,
            'action_label' => 'Voir ma demande',
            'leave_id'     => $this->leave->id,
            'leave_type'   => $this->leave->type,
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
