<?php

declare(strict_types=1);

use App\Http\Controllers\FleetController;
use App\Http\Controllers\GpsWebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes Parc Auto Avancé — Module Fleet
|--------------------------------------------------------------------------
|
| Préfixe  : /fleet   (auth + tenant déjà appliqués par api.php)
| Webhooks GPS : publics, authentifiés par token device
|
*/

// =============================================================================
// WEBHOOKS GPS — Sans auth Sanctum, token device uniquement
// =============================================================================
Route::prefix('gps-webhook')->group(function () {
    Route::post('/',         [GpsWebhookController::class, 'generic'])  ->name('fleet.gps.generic');
    Route::post('/traccar',  [GpsWebhookController::class, 'traccar'])  ->name('fleet.gps.traccar');
    Route::post('/wialon',   [GpsWebhookController::class, 'wialon'])   ->name('fleet.gps.wialon');
});

// =============================================================================
// ROUTES PROTÉGÉES
// =============================================================================
Route::middleware(['auth:sanctum', 'tenant', 'ensureLicenseValid'])->group(function () {

    // -------------------------------------------------------------------------
    // Carte temps réel
    // -------------------------------------------------------------------------
    Route::get('/map',      [FleetController::class, 'getMapData'])->name('fleet.map');

    // -------------------------------------------------------------------------
    // Trajets
    // -------------------------------------------------------------------------
    Route::prefix('trips')->name('fleet.trips.')->group(function () {
        Route::post('/start',    [FleetController::class, 'startTrip'])->name('start');
        Route::post('/{id}/end', [FleetController::class, 'endTrip'])->name('end');
    });

    // -------------------------------------------------------------------------
    // Véhicules — endpoints spécifiques
    // -------------------------------------------------------------------------
    Route::prefix('vehicles/{id}')->name('fleet.vehicles.')->group(function () {
        Route::get('/trips',       [FleetController::class, 'trips'])->name('trips');
        Route::get('/maintenance', [FleetController::class, 'maintenanceSchedule'])->name('maintenance');
        Route::get('/fuel',        [FleetController::class, 'fuelHistory'])->name('fuel');
    });

    // -------------------------------------------------------------------------
    // Maintenance
    // -------------------------------------------------------------------------
    Route::post('/maintenance-logs', [FleetController::class, 'storeMaintenanceLog'])->name('fleet.maintenance.store');

    // -------------------------------------------------------------------------
    // Carburant
    // -------------------------------------------------------------------------
    Route::post('/fuel-logs', [FleetController::class, 'storeFuelLog'])->name('fleet.fuel.store');

    // -------------------------------------------------------------------------
    // Rapport mensuel
    // -------------------------------------------------------------------------
    Route::get('/report', [FleetController::class, 'report'])->name('fleet.report');

    // -------------------------------------------------------------------------
    // Géofences (CRUD)
    // -------------------------------------------------------------------------
    Route::prefix('geofences')->name('fleet.geofences.')->group(function () {
        Route::get('/',      [FleetController::class, 'geofences'])->name('index');
        Route::post('/',     [FleetController::class, 'storeGeofence'])->name('store');
        Route::put('/{id}',  [FleetController::class, 'updateGeofence'])->name('update');
        Route::delete('/{id}',[FleetController::class, 'destroyGeofence'])->name('destroy');
    });

    // -------------------------------------------------------------------------
    // Affectations
    // -------------------------------------------------------------------------
    Route::prefix('assignments')->name('fleet.assignments.')->group(function () {
        Route::get('/',  [FleetController::class, 'assignments'])->name('index');
        Route::post('/', [FleetController::class, 'storeAssignment'])->name('store');
    });
});
