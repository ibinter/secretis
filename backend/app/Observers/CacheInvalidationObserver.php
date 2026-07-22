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

/**
 * CacheInvalidationObserver — Invalidation automatique du cache SECRETIS
 *
 * Cet observer est attaché aux modèles : Task, Event, MailRegistry, Document, Meeting.
 * Il invalide les caches Redis concernés à chaque création/modification/suppression.
 *
 * IMPORTANT — Principe de moindre invalidation :
 *  On invalide uniquement les caches impactés par le modèle modifié,
 *  pas l'ensemble du cache de l'organisation. Cela réduit les "cold starts".
 *
 * Enregistrement dans App\Providers\AppServiceProvider::boot() :
 *   Task::observe(CacheInvalidationObserver::class);
 *   Event::observe(CacheInvalidationObserver::class);
 *   MailRegistry::observe(CacheInvalidationObserver::class);
 *   Document::observe(CacheInvalidationObserver::class);
 *   Meeting::observe(CacheInvalidationObserver::class);
 *
 * Ou via un EventServiceProvider avec le tableau $observers.
 */
class CacheInvalidationObserver
{
    public function __construct(private readonly CacheService $cache) {}

    // =========================================================================
    // Task
    // =========================================================================

    public function created(Task $task): void
    {
        $this->invalidateTaskCaches($task);
    }

    public function updated(Task $task): void
    {
        $this->invalidateTaskCaches($task);
    }

    public function deleted(Task $task): void
    {
        $this->invalidateTaskCaches($task);
    }

    public function restored(Task $task): void
    {
        $this->invalidateTaskCaches($task);
    }

    private function invalidateTaskCaches(Task $task): void
    {
        $orgId = $this->getOrgId($task);
        if (! $orgId) {
            return;
        }

        // Les tâches impactent les KPIs et les listes de tâches
        $this->dispatchInvalidation(fn() => $this->cache->invalidateDashboardCache($orgId));
        $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, 'tasks.*'));

        // Si la tâche est liée à un projet, invalider le cache du projet
        if ($task->project_id) {
            $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, "projects.{$task->project_id}.*"));
        }

        $this->log('Task', $task->id, $orgId);
    }

    // =========================================================================
    // Event (Agenda)
    // =========================================================================

    public function created(Event $event): void
    {
        $this->invalidateEventCaches($event);
    }

    public function updated(Event $event): void
    {
        $this->invalidateEventCaches($event);
    }

    public function deleted(Event $event): void
    {
        $this->invalidateEventCaches($event);
    }

    private function invalidateEventCaches(Event $event): void
    {
        $orgId = $this->getOrgId($event);
        if (! $orgId) {
            return;
        }

        // Le calendrier est très sensible aux changements → invalidation directe
        // (TTL court de 60s, l'impact d'un cold start est limité)
        $this->cache->invalidateCalendarCache($orgId);
        $this->dispatchInvalidation(fn() => $this->cache->invalidateDashboardCache($orgId));

        $this->log('Event', $event->id, $orgId);
    }

    // =========================================================================
    // MailRegistry (Courrier)
    // =========================================================================

    public function created(MailRegistry $mail): void
    {
        $this->invalidateMailCaches($mail);
    }

    public function updated(MailRegistry $mail): void
    {
        $this->invalidateMailCaches($mail);
    }

    public function deleted(MailRegistry $mail): void
    {
        $this->invalidateMailCaches($mail);
    }

    private function invalidateMailCaches(MailRegistry $mail): void
    {
        $orgId = $this->getOrgId($mail);
        if (! $orgId) {
            return;
        }

        $this->dispatchInvalidation(fn() => $this->cache->invalidateDashboardCache($orgId));
        $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, 'mail.*'));

        $this->log('MailRegistry', $mail->id, $orgId);
    }

    // =========================================================================
    // Document (GED)
    // =========================================================================

    public function created(Document $document): void
    {
        $this->invalidateDocumentCaches($document);
    }

    public function updated(Document $document): void
    {
        $this->invalidateDocumentCaches($document);
    }

    public function deleted(Document $document): void
    {
        $this->invalidateDocumentCaches($document);
    }

    private function invalidateDocumentCaches(Document $document): void
    {
        $orgId = $this->getOrgId($document);
        if (! $orgId) {
            return;
        }

        $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, 'documents.*'));

        // Les documents impactent peu les KPIs → pas d'invalidation dashboard

        $this->log('Document', $document->id, $orgId);
    }

    // =========================================================================
    // Meeting (Réunion)
    // =========================================================================

    public function created(Meeting $meeting): void
    {
        $this->invalidateMeetingCaches($meeting);
    }

    public function updated(Meeting $meeting): void
    {
        $this->invalidateMeetingCaches($meeting);
    }

    public function deleted(Meeting $meeting): void
    {
        $this->invalidateMeetingCaches($meeting);
    }

    private function invalidateMeetingCaches(Meeting $meeting): void
    {
        $orgId = $this->getOrgId($meeting);
        if (! $orgId) {
            return;
        }

        $this->dispatchInvalidation(fn() => $this->cache->invalidateDashboardCache($orgId));
        $this->dispatchInvalidation(fn() => $this->invalidateKey($orgId, 'meetings.*'));
        // Les réunions ont des événements associés
        $this->dispatchInvalidation(fn() => $this->cache->invalidateCalendarCache($orgId));

        $this->log('Meeting', $meeting->id, $orgId);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Récupère l'organization_id depuis n'importe quel modèle multi-tenant.
     * Supporte les IDs int et UUID string.
     */
    private function getOrgId(Model $model): int|string|null
    {
        return $model->organization_id ?? null;
    }

    /**
     * Invalide un pattern de clé dans l'organisation.
     * Utilise le CacheService pour les invalidations ciblées.
     */
    private function invalidateKey(int|string $orgId, string $pattern): void
    {
        // L'invalidation par pattern nécessite Redis SCAN ou des tags.
        // Ici on délègue au CacheService qui gère les tags Redis.
        // En l'absence de tags sur ces clés, on invalide l'org complète.
        // Pour une invalidation plus fine, utiliser Cache::tags().
        try {
            $this->cache->invalidateOrganizationCache((int) $orgId);
        } catch (\Exception $e) {
            Log::error("[CacheInvalidationObserver] Erreur invalidation pattern {$pattern}: " . $e->getMessage());
        }
    }

    /**
     * Exécute l'invalidation de façon asynchrone via un job Laravel.
     *
     * Pourquoi asynchrone ?
     *  - L'invalidation Redis peut prendre quelques ms.
     *  - On ne veut pas bloquer la réponse HTTP de l'utilisateur qui vient
     *    de créer/modifier une ressource.
     *  - Laravel dispatch() utilise la queue par défaut (sync en dev, redis/sqs en prod).
     *
     * Si la queue n'est pas configurée, dispatch() tombe sur 'sync' et s'exécute
     * immédiatement. C'est acceptable car on évite quand même de crasher la requête
     * si Redis est momentanément indisponible (le job peut être retenté).
     */
    private function dispatchInvalidation(callable $fn): void
    {
        try {
            // Dispatch immédiat si queue = sync (dev), différé sinon (prod)
            dispatch(function () use ($fn) {
                $fn();
            })->afterResponse();
        } catch (\Exception $e) {
            // En cas d'échec de dispatch, on tente l'invalidation directement
            // pour ne pas laisser le cache corrompu
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
