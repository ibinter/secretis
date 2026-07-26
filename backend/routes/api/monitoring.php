<?php

declare(strict_types=1);

use App\Http\Controllers\HealthController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\SuperAdmin\MonitoringApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes de monitoring SECRETIS ERP
|--------------------------------------------------------------------------
|
| Ces routes sont enregistrées HORS du préfixe /api/v1 :
|   GET /health            → public, sans auth
|   GET /health/detailed   → auth SuperAdmin
|   GET /metrics           → auth IP whitelist (Prometheus scrape)
|
| Les routes API SuperAdmin monitoring restent sous /api/superadmin/...
|
*/

// ── Health checks ─────────────────────────────────────────────────────────────

Route::get('/health', [HealthController::class, 'index'])
     ->name('health.index')
     ->middleware(['throttle:60,1']); // max 60 req/min (anti-DDoS)

Route::get('/health/detailed', [HealthController::class, 'detailed'])
     ->name('health.detailed')
     ->middleware(['auth:sanctum', 'throttle:30,1']);

// ── Métriques Prometheus ──────────────────────────────────────────────────────

Route::get('/metrics', [MetricsController::class, 'index'])
     ->name('metrics.prometheus');
// L'auth par IP est gérée dans le contrôleur lui-même

// ── API SuperAdmin — Monitoring dashboard ─────────────────────────────────────

Route::prefix('api/superadmin')
     ->middleware(['auth:sanctum', 'role:super_admin'])
     ->group(function () {

    // Métriques pour le dashboard temps réel
    Route::get('/monitoring/metrics', [MonitoringApiController::class, 'metrics'])
         ->name('superadmin.monitoring.metrics');

    // Viewer de logs
    Route::get('/logs', [MonitoringApiController::class, 'logs'])
         ->name('superadmin.logs');

});
