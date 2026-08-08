<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Nouvelle demande de congé a valider (manager N+1 puis RH).
 *
 * Appelee par App\Services\LeaveService::notifyManager() / notifyHr().
 */
class LeaveRequestedNotification extends Notification implements ShouldQueue
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
        $employee = $this->leave->employee;
        $name     = $employee
            ? trim(($employee->first_name ?? '') . ' ' . ($employee->last_name ?? ''))
            : 'Un collaborateur';

        return [
            'type'         => 'leave_requested',
            'category'     => 'rh',
            'severity'     => 'info',
            'title'        => 'Nouvelle demande de congé',
            'body'         => "{$name} demande un congé du "
                            . $this->formatDate($this->leave->start_date) . ' au '
                            . $this->formatDate($this->leave->end_date)
                            . ' (' . (int) $this->leave->working_days . ' jour(s) ouvré(s)).',
            'action_url'   => '/rh/conges/' . $this->leave->id,
            'action_label' => 'Traiter la demande',
            'leave_id'     => $this->leave->id,
            'employee_id'  => $this->leave->employee_id,
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
