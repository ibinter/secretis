<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Tache en retard — rappel a l'assigne, escalade au createur apres 3 jours.
 *
 * Appelee par App\Services\TaskService :
 *   new TaskOverdueNotification($task, $daysLate)
 *   new TaskOverdueNotification($task, $daysLate, escalated: true)
 */
class TaskOverdueNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Task $task,
        public readonly int  $daysLate,
        public readonly bool $escalated = false,
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
        $plural = $this->daysLate > 1 ? 's' : '';

        return [
            'type'         => 'task_overdue',
            'category'     => 'task',
            'severity'     => $this->escalated ? 'error' : 'warning',
            'title'        => $this->escalated
                ? 'Escalade : tâche en retard'
                : 'Tâche en retard',
            'body'         => "« {$this->task->title} » accuse {$this->daysLate} jour{$plural} de retard."
                            . ($this->escalated ? ' Aucune action de l\'assigné depuis 3 jours.' : ''),
            'action_url'   => '/taches/' . $this->task->id,
            'action_label' => 'Ouvrir la tâche',
            'task_id'      => $this->task->id,
            'days_late'    => $this->daysLate,
            'escalated'    => $this->escalated,
            'project_id'   => $this->task->project_id,
        ];
    }
}
