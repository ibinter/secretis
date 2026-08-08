<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Tache assignee — notification in-app pour l'assigne.
 *
 * Referencee par App\Http\Resources\NotificationResource (mapping du FQCN vers
 * le type court `task.assigned`). Aucun appelant actif a ce jour : la classe
 * existe pour que le mapping et les envois futurs ne cassent pas.
 */
class TaskAssigned extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Task  $task,
        public readonly ?User $assignedBy = null,
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
        $due = $this->task->due_date instanceof \DateTimeInterface
            ? $this->task->due_date->format('d/m/Y')
            : null;

        return [
            'type'         => 'task_assigned',
            'category'     => 'task',
            'severity'     => 'info',
            'title'        => 'Nouvelle tâche assignée',
            'body'         => "« {$this->task->title} »"
                            . ($due ? " — échéance le {$due}" : '')
                            . ($this->assignedBy ? " (assignée par {$this->assignedBy->name})" : ''),
            'action_url'   => '/taches/' . $this->task->id,
            'action_label' => 'Ouvrir la tâche',
            'task_id'      => $this->task->id,
            'project_id'   => $this->task->project_id,
            'priority'     => $this->task->priority,
            'due_date'     => $due,
        ];
    }
}
