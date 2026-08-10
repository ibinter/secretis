<?php

use App\Http\Controllers\ResourceController;
use App\Http\Controllers\VehicleRequestController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API — MODULE 7 : RESSOURCES & STOCKS ADMINISTRATIFS
|--------------------------------------------------------------------------
|
| Middleware appliqués :
|   - auth:sanctum   : authentification obligatoire
|   - tenant         : résolution du tenant (organization_id)
|   - license        : licence active de l'organisation
|   - throttle:60,1  : 60 req/min par utilisateur
|
*/

Route::middleware(['auth:sanctum', 'tenant', 'license', 'throttle:60,1'])->group(function () {

    // =========================================================================
    // Dashboard synthèse ressources
    // =========================================================================

    Route::get('/resources', [ResourceController::class, 'dashboard'])->name('resources.dashboard');

    // =========================================================================
    // SALLES
    // =========================================================================

    Route::prefix('resources/salles')->name('resources.salles.')->group(function () {

        Route::get('/', [ResourceController::class, 'roomsIndex'])->name('index');
        Route::post('/', [ResourceController::class, 'roomsStore'])->name('store');

        Route::get('/{room}', [ResourceController::class, 'roomsShow'])->name('show');
        Route::put('/{room}', [ResourceController::class, 'roomsUpdate'])->name('update');
        Route::patch('/{room}', [ResourceController::class, 'roomsUpdate'])->name('patch');
        Route::delete('/{room}', [ResourceController::class, 'roomsDestroy'])->name('destroy');

        // Vérification disponibilité : GET /resources/salles/{room}/availability?start_at=...&end_at=...
        Route::get('/{room}/availability', [ResourceController::class, 'checkAvailability'])->name('availability');

        // Planning hebdomadaire : GET /resources/salles/{room}/schedule?week_start=YYYY-MM-DD
        Route::get('/{room}/schedule', [ResourceController::class, 'getSchedule'])->name('schedule');
    });

    // =========================================================================
    // MATÉRIEL
    // =========================================================================

    Route::prefix('resources/materiel')->name('resources.materiel.')->group(function () {

        Route::get('/', [ResourceController::class, 'equipmentIndex'])->name('index');
        Route::post('/', [ResourceController::class, 'equipmentStore'])->name('store');

        Route::get('/{equipment}', [ResourceController::class, 'equipmentShow'])->name('show');
        Route::put('/{equipment}', [ResourceController::class, 'equipmentUpdate'])->name('update');
        Route::patch('/{equipment}', [ResourceController::class, 'equipmentUpdate'])->name('patch');

        // POST /resources/materiel/{equipment}/assign   { user_id }
        Route::post('/{equipment}/assign', [ResourceController::class, 'assignEquipment'])->name('assign');

        // POST /resources/materiel/{equipment}/maintenance  { reason }
        Route::post('/{equipment}/maintenance', [ResourceController::class, 'requestMaintenance'])->name('maintenance');
    });

    // =========================================================================
    // FOURNITURES
    // =========================================================================

    Route::prefix('resources/fournitures')->name('resources.fournitures.')->group(function () {

        // Alertes stock bas (avant le paramètre {supply} pour éviter un conflit)
        Route::get('/low-stock', [ResourceController::class, 'getLowStockAlert'])->name('low-stock');

        Route::get('/', [ResourceController::class, 'suppliesIndex'])->name('index');
        Route::post('/', [ResourceController::class, 'suppliesStore'])->name('store');

        Route::get('/{supply}', [ResourceController::class, 'suppliesShow'])->name('show');
        Route::put('/{supply}', [ResourceController::class, 'suppliesUpdate'])->name('update');
        Route::patch('/{supply}', [ResourceController::class, 'suppliesUpdate'])->name('patch');

        // POST /resources/fournitures/{supply}/movement  { type: in|out, quantity, reason }
        Route::post('/{supply}/movement', [ResourceController::class, 'addMovement'])->name('movement');
    });

    // =========================================================================
    // VÉHICULES
    // =========================================================================

    Route::prefix('resources/vehicules')->name('resources.vehicules.')->group(function () {

        // Alertes globales (avant {vehicle})
        Route::get('/alerts', [ResourceController::class, 'getVehicleAlerts'])->name('alerts');

        // Demandes de véhicule
        Route::prefix('requests')->name('requests.')->group(function () {
            Route::get('/', [VehicleRequestController::class, 'index'])->name('index');
            Route::post('/', [VehicleRequestController::class, 'store'])->name('store');
            Route::post('/{vehicleRequest}/approve', [VehicleRequestController::class, 'approve'])->name('approve');
            Route::post('/{vehicleRequest}/reject', [VehicleRequestController::class, 'reject'])->name('reject');
            Route::post('/{vehicleRequest}/log', [VehicleRequestController::class, 'addLog'])->name('log');
        });

        Route::get('/', [ResourceController::class, 'vehiclesIndex'])->name('index');
        Route::post('/', [ResourceController::class, 'vehiclesStore'])->name('store');

        Route::get('/{vehicle}', [ResourceController::class, 'vehiclesShow'])->name('show');
        Route::put('/{vehicle}', [ResourceController::class, 'vehiclesUpdate'])->name('update');
        Route::patch('/{vehicle}', [ResourceController::class, 'vehiclesUpdate'])->name('patch');

        // Demande de mise à disposition rapide
        Route::post('/request', [ResourceController::class, 'requestVehicle'])->name('request');
    });
});
