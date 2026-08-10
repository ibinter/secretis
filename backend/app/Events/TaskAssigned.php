<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Task;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * TaskAssigned — Une tache vient d'etre assignee a un utilisateur.
 *
 * Consomme par App\Listeners\SmartNotificationListener::handleTaskAssigned()
 * qui lit $event->task puis $event->assignee (fallback ?? User::find()).
 */
class TaskAssigned
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Task  $task,
        public readonly ?User $assignee = null,
    ) {}
}
