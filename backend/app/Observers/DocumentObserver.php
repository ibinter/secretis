<?php

namespace App\Observers;

use App\Models\Document;
use App\Services\CacheService;
use Illuminate\Support\Facades\Log;

/**
 * DocumentObserver — Invalidation du cache module GED
 *
 * Déclenché sur chaque mutation du modèle Document.
 * Invalide les tags Redis : ['org:{id}', 'module:ged']
 *
 * Les documents n'impactent pas directement les KPIs du dashboard,
 * sauf lors d'une création (compteur "documents ce mois").
 *
 * Enregistrement : voir AppServiceProvider::registerObservers()
 */
class DocumentObserver
{
    public function __construct(private readonly CacheService $cache) {}

    public function created(Document $document): void
    {
        // Création → compteur documents du mois impacté
        $this->invalidate($document, withDashboard: true);
    }

    public function updated(Document $document): void
    {
        $this->invalidate($document, withDashboard: false);
    }

    public function deleted(Document $document): void
    {
        $this->invalidate($document, withDashboard: true);
    }

    public function restored(Document $document): void
    {
        $this->invalidate($document, withDashboard: false);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function invalidate(Document $document, bool $withDashboard): void
    {
        $orgId = $document->organization_id;

        if (! $orgId) {
            return;
        }

        dispatch(function () use ($orgId, $withDashboard) {
            $this->cache->flushModule('ged');

            if ($withDashboard) {
                $this->cache->flushModule('dashboard');
            }

            Log::debug("[DocumentObserver] Cache GED vidé pour org#{$orgId}.");
        })->afterResponse();
    }
}
