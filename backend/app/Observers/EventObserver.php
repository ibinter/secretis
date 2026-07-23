<?php

namespace App\Observers;

use App\Models\Event;
use App\Services\CacheService;
use Illuminate\Support\Facades\Log;

/**
 * EventObserver — Invalidation du cache module Agenda
 *
 * Déclenché sur chaque mutation du modèle Event.
 * Invalide les tags Redis : ['org:{id}', 'module:agenda']
 *
 * Enregistrement : voir AppServiceProvider::registerObservers()
 */
class EventObserver
{
    public function __construct(private readonly CacheService $cache) {}

    public function created(Event $event): void
    {
        $this->invalidate($event);
    }

    public function updated(Event $event): void
    {
        $this->invalidate($event);
    }

    public function deleted(Event $event): void
    {
        $this->invalidate($event);
    }

    public function restored(Event $event): void
    {
        $this->invalidate($event);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function invalidate(Event $event): void
    {
        $orgId = $event->organization_id;

        if (! $orgId) {
            return;
        }

        dispatch(function () use ($orgId) {
            // Vide l'intégralité du module agenda pour cette organisation
            $this->cache->flushModule('agenda');
            // Vide également les KPIs dashboard liés aux événements
            $this->cache->flushModule('dashboard');
            Log::debug("[EventObserver] Cache agenda + dashboard vidé pour org#{$orgId}.");
        })->afterResponse();
    }
}
