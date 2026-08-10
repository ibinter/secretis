<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * TaskOverdue — Une tache a depasse sa date d'echeance.
 *
 * Consomme par App\Listeners\SmartNotificationListener::handleTaskOverdue()
 * qui lit $event->task (->assigned_to, ->title, ->due_date, ->id).
 */
class TaskOverdue
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Task $task,
    ) {}
}
