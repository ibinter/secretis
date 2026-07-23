<?php

namespace App\Observers;

use App\Models\Task;
use App\Services\CacheService;
use Illuminate\Support\Facades\Log;

/**
 * TaskObserver — Invalidation du cache module Tasks
 *
 * Déclenché sur chaque mutation du modèle Task.
 * Invalide les tags Redis : ['org:{id}', 'module:tasks']
 * Invalide aussi le dashboard quand le statut ou la date limite change.
 *
 * Enregistrement : voir AppServiceProvider::registerObservers()
 */
class TaskObserver
{
    public function __construct(private readonly CacheService $cache) {}

    public function created(Task $task): void
    {
        $this->invalidate($task, withDashboard: true);
    }

    public function updated(Task $task): void
    {
        // Le dashboard n'est impacté que si le statut ou la date limite change
        $touchesDashboard = $task->wasChanged(['status', 'due_date', 'priority']);
        $this->invalidate($task, withDashboard: $touchesDashboard);
    }

    public function deleted(Task $task): void
    {
        $this->invalidate($task, withDashboard: true);
    }

    public function restored(Task $task): void
    {
        $this->invalidate($task, withDashboard: true);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function invalidate(Task $task, bool $withDashboard): void
    {
        $orgId = $task->organization_id;

        if (! $orgId) {
            return;
        }

        dispatch(function () use ($orgId, $withDashboard) {
            $this->cache->flushModule('tasks');

            if ($withDashboard) {
                $this->cache->flushModule('dashboard');
            }

            Log::debug("[TaskObserver] Cache tasks vidé pour org#{$orgId}" . ($withDashboard ? ' + dashboard' : '') . '.');
        })->afterResponse();
    }
}
