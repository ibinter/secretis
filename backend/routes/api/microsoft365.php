<?php

use App\Http\Controllers\OneDriveController;
use App\Http\Controllers\OutlookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API — MODULE : Intégration Microsoft 365
|--------------------------------------------------------------------------
|
| Toutes les routes d'intégration Microsoft 365 (Outlook, Teams, OneDrive).
|
| Middleware :
|   - auth:sanctum  : authentification obligatoire
|   - tenant        : résolution du tenant (organization_id)
|   - throttle:30,1 : limite à 30 req/min (les appels Graph sont coûteux)
|
| Note : Le callback OAuth2 est hors du middleware 'license' car il doit
| fonctionner même si la licence est en période de grâce.
|
*/

// -------------------------------------------------------------------------
// OAuth2 — Hors middleware license (flux d'authentification)
// -------------------------------------------------------------------------

Route::middleware(['auth:sanctum', 'tenant', 'throttle:30,1'])
    ->prefix('integrations')
    ->name('integrations.')
    ->group(function () {

        // ---- Outlook Calendar ----
        Route::prefix('outlook')->name('outlook.')->group(function () {

            // Initiation du flux OAuth2 → redirige vers Microsoft
            Route::get('/auth', [OutlookController::class, 'auth'])
                ->name('auth');

            // Callback OAuth2 depuis Microsoft (code + state)
            Route::get('/callback', [OutlookController::class, 'callback'])
                ->name('callback');

            // Synchronisation manuelle des calendriers
            Route::post('/sync', [OutlookController::class, 'sync'])
                ->name('sync');

            // Déconnexion du compte Microsoft
            Route::delete('/disconnect', [OutlookController::class, 'disconnect'])
                ->name('disconnect');

            // Disponibilité free/busy des participants
            Route::get('/availability', [OutlookController::class, 'availability'])
                ->name('availability');
        });

        // ---- OneDrive ----
        Route::prefix('onedrive')->name('onedrive.')->group(function () {

            // Liste des fichiers OneDrive
            Route::get('/files', [OneDriveController::class, 'files'])
                ->name('files');

            // Importer des fichiers OneDrive dans la GED SECRETIS
            Route::post('/import', [OneDriveController::class, 'import'])
                ->name('import');
        });
    });

// -------------------------------------------------------------------------
// Sync document → OneDrive (dans le namespace Documents)
// -------------------------------------------------------------------------

Route::middleware(['auth:sanctum', 'tenant', 'license', 'throttle:30,1'])
    ->group(function () {
        Route::post('/documents/{document}/sync-onedrive', [OneDriveController::class, 'syncDocument'])
            ->name('documents.sync-onedrive');
    });
