<?php

use App\Http\Controllers\NotificationCenterController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API — MODULE : CENTRE DE NOTIFICATIONS INTELLIGENTES
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'tenant', 'license', 'throttle:120,1'])->group(function () {

    Route::prefix('notifications')->name('notifications.')->group(function () {

        // Page Inertia du centre de notifications
        Route::get('/center', [NotificationCenterController::class, 'center'])->name('center');

        // API : liste paginée et filtrée
        Route::get('/', [NotificationCenterController::class, 'list'])->name('list');

        // Digest du jour
        Route::get('/digest', [NotificationCenterController::class, 'digest'])->name('digest');

        // Marquer une notification comme lue
        Route::post('/{id}/read', [NotificationCenterController::class, 'markRead'])->name('read');

        // Marquer toutes comme lues
        Route::post('/read-all', [NotificationCenterController::class, 'markAllRead'])->name('read-all');

        // Snooze (reporter)
        Route::post('/snooze/{id}', [NotificationCenterController::class, 'snooze'])->name('snooze');

        // Archiver
        Route::post('/archive/{id}', [NotificationCenterController::class, 'archive'])->name('archive');

        // Préférences
        Route::get('/preferences', [NotificationCenterController::class, 'getPreferences'])->name('preferences.get');
        Route::put('/preferences', [NotificationCenterController::class, 'updatePreferences'])->name('preferences.update');

        // Feedback (apprentissage)
        Route::post('/feedback', [NotificationCenterController::class, 'feedback'])->name('feedback');

        // Statistiques
        Route::get('/stats', [NotificationCenterController::class, 'stats'])->name('stats');

        // Nombre de non-lues (léger, pour polling)
        Route::get('/unread-count', function () {
            $count = \App\Models\AppNotification::where('user_id', auth()->id())
                ->whereNull('read_at')
                ->whereNull('archived_at')
                ->count();
            return response()->json(['count' => $count]);
        })->name('unread-count');
    });
});
