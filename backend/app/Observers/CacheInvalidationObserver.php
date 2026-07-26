<?php

namespace App\Observers;

use App\Models\Document;
use App\Models\Event;
use App\Models\MailRegistry;
use App\Models\Meeting;
use App\Models\Task;
use App\Services\CacheService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class CacheInvalidationObserver
{
    public function __construct(private readonly CacheService $cache) {}

    public function created(Model $model): void
    {
        $this->dispatch($model);
    }

    public function updated(Model $model): void
    {
        $this->dispatch($model);
    }

    public function deleted(Model $model): void
    {
        $this->dispatch($model);
    }

    public function restored(Model $model): void
    {
        $this->dispatch($model);
    }

    private function dispatch(Model $model): void
    {
        match (true) {
            $model instanceof Task        => $this->invalidateTaskCaches($model),
            $model instanceof Event       => $this->invalidateEventCaches($model),
            $model instanceof MailRegistry => $this->invalidateMailCaches($model),
            $model instanceof Document    => $this->invalidateDocumentCaches($model),
            $model instanceof Meeting     => $this->invalidateMeetingCaches($model),
            default                       => null,
        };
    }

    private function invalidateTaskCaches(Task $task): void
    {
        $orgId = $this->getOrgId($task);
        if (! $orgId) return;

        $this->dispatchInvalidation(fn() => $this->cache->invalidateDashboardCache($orgId));
        $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, 'tasks.*'));

        if ($task->project_id) {
            $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, "projects.{$task->project_id}.*"));
        }

        $this->log('Task', $task->id, $orgId);
    }

    private function invalidateEventCaches(Event $event): void
    {
        $orgId = $this->getOrgId($event);
        if (! $orgId) return;

        $this->cache->invalidateCalendarCache($orgId);
        $this->dispatchInvalidation(fn() => $this->cache->invalidateDashboardCache($orgId));

        $this->log('Event', $event->id, $orgId);
    }

    private function invalidateMailCaches(MailRegistry $mail): void
    {
        $orgId = $this->getOrgId($mail);
        if (! $orgId) return;

        $this->dispatchInvalidation(fn() => $this->cache->invalidateDashboardCache($orgId));
        $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, 'mail.*'));

        $this->log('MailRegistry', $mail->id, $orgId);
    }

    private function invalidateDocumentCaches(Document $document): void
    {
        $orgId = $this->getOrgId($document);
        if (! $orgId) return;

        $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, 'documents.*'));

        $this->log('Document', $document->id, $orgId);
    }

    private function invalidateMeetingCaches(Meeting $meeting): void
    {
        $orgId = $this->getOrgId($meeting);
        if (! $orgId) return;

        $this->dispatchInvalidation(fn() => $this->cache->invalidateDashboardCache($orgId));
        $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, 'meetings.*'));
        $this->dispatchInvalidation(fn() => $this->cache->invalidateCalendarCache($orgId));

        $this->log('Meeting', $meeting->id, $orgId);
    }

    private function getOrgId(Model $model): int|string|null
    {
        return $model->organization_id ?? null;
    }

    private function invalidateKey(int|string $orgId, string $pattern): void
    {
        try {
            $this->cache->invalidateOrganizationCache((int) $orgId);
        } catch (\Exception $e) {
            Log::error("[CacheInvalidationObserver] Erreur invalidation pattern {$pattern}: " . $e->getMessage());
        }
    }

    private function dispatchInvalidation(callable $fn): void
    {
        try {
            dispatch(function () use ($fn) {
                $fn();
            })->afterResponse();
        } catch (\Exception $e) {
            try {
                $fn();
            } catch (\Exception $innerE) {
                Log::error('[CacheInvalidationObserver] Invalidation échouée: ' . $innerE->getMessage());
            }
        }
    }

    private function log(string $model, mixed $id, mixed $orgId): void
    {
        if (config('app.debug')) {
            Log::debug("[CacheInvalidationObserver] {$model}#{$id} → invalidation org#{$orgId}");
        }
    }
}
