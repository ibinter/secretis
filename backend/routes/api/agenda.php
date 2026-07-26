<?php

use App\Http\Controllers\AgendaController;
use App\Http\Controllers\RoomController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API — MODULE 1 : AGENDA & PLANNING
|--------------------------------------------------------------------------
|
| Middleware appliqués :
|   - auth:sanctum   : authentification JWT/Session obligatoire
|   - tenant         : résolution du tenant (organization_id) depuis le token
|   - license        : vérification de la licence active de l'organisation
|   - throttle:60,1  : rate limiting 60 req/min par utilisateur
|
*/

Route::middleware(['auth:sanctum', 'tenant', 'license', 'throttle:60,1'])->group(function () {

    // -------------------------------------------------------------------------
    // Agenda — Événements
    // -------------------------------------------------------------------------

    Route::prefix('agenda')->name('agenda.')->group(function () {

        // Page principale Inertia
        Route::get('/', [AgendaController::class, 'index'])->name('index');

        // API : liste paginée des événements (format tableau/liste)
        Route::get('/events', [AgendaController::class, 'list'])->name('events.list');

        // API : format FullCalendar — interrogé par le frontend lors de la navigation
        // GET /agenda/calendar?start=2025-01-01&end=2025-02-01
        Route::get('/calendar', [AgendaController::class, 'getCalendarEvents'])->name('calendar');

        // API : vérification de disponibilité d'un créneau
        // POST /agenda/availability { user_id?, start_at, end_at, exclude_event_id? }
        Route::post('/availability', [AgendaController::class, 'checkAvailability'])->name('availability');

        // CRUD événements
        Route::post('/events', [AgendaController::class, 'store'])->name('events.store');
        Route::get('/events/{event}', [AgendaController::class, 'show'])->name('events.show');
        Route::put('/events/{event}', [AgendaController::class, 'update'])->name('events.update');
        Route::patch('/events/{event}', [AgendaController::class, 'update'])->name('events.patch');
        Route::delete('/events/{event}', [AgendaController::class, 'destroy'])->name('events.destroy');
    });

    // -------------------------------------------------------------------------
    // Rooms — Salles de réunion
    // -------------------------------------------------------------------------

    Route::prefix('rooms')->name('rooms.')->group(function () {

        // Liste des salles (avec filtre disponibilité optionnel)
        Route::get('/', [RoomController::class, 'index'])->name('index');

        // Création d'une salle (admin seulement)
        Route::post('/', [RoomController::class, 'store'])->name('store');

        // Détail d'une salle
        Route::get('/{room}', [RoomController::class, 'show'])->name('show');

        // Mise à jour (admin seulement)
        Route::put('/{room}', [RoomController::class, 'update'])->name('update');
        Route::patch('/{room}', [RoomController::class, 'update'])->name('patch');

        // Désactivation (admin seulement)
        Route::delete('/{room}', [RoomController::class, 'destroy'])->name('destroy');

        // Vérification disponibilité d'une salle pour un créneau
        // GET /rooms/{room}/availability?start_at=...&end_at=...
        Route::get('/{room}/availability', [RoomController::class, 'checkAvailability'])
            ->name('availability');

        // Planning hebdomadaire d'une salle
        // GET /rooms/{room}/schedule?week_start=2025-01-13
        Route::get('/{room}/schedule', [RoomController::class, 'getSchedule'])
            ->name('schedule');
    });
});
