<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| MODULE 9 — Rapports, Statistiques & Tableaux de bord
|--------------------------------------------------------------------------
|
| Toutes les routes sont protégées par :
|   - auth:sanctum       → authentification API token
|   - verified           → email vérifié
|   - tenant             → résolution du tenant actif (ResolveTenant middleware)
|
| Préfixe : /api/v1
|
*/

Route::middleware(['auth:sanctum', 'verified', 'tenant'])->prefix('v1')->group(function () {

    // =========================================================================
    // DASHBOARDS — données JSON pour TanStack Query
    // =========================================================================

    Route::prefix('dashboard')->name('dashboard.')->group(function () {

        // KPIs dirigeant (toutes les métriques en une réponse)
        Route::get('kpis', [DashboardController::class, 'apiKpis'])
            ->name('kpis');

        // Tendance : ?metric=mail|tasks|visitors|meetings|rooms&days=30
        Route::get('trends', [DashboardController::class, 'apiTrends'])
            ->name('trends');

        // Heatmap d'activité (grille 7×24)
        Route::get('heatmap', [DashboardController::class, 'apiHeatmap'])
            ->name('heatmap');

        // Utilisation des modules
        Route::get('module-usage', [DashboardController::class, 'apiModuleUsage'])
            ->name('module-usage');
    });

    // =========================================================================
    // RAPPORTS — tous les rapports métier
    //
    // Paramètres communs :
    //   start_date  (date, défaut : début du mois courant)
    //   end_date    (date, défaut : aujourd'hui)
    //   format      json | pdf | excel  (défaut : json)
    // =========================================================================

    Route::prefix('reports')->name('reports.')->group(function () {

        // Registre courrier (entrant + sortant)
        Route::get('mail', [ReportController::class, 'mailReport'])
            ->name('mail');

        // Réunions, participants, décisions
        Route::get('meetings', [ReportController::class, 'meetingReport'])
            ->name('meetings');

        // Tâches par service / responsable / période
        Route::get('tasks', [ReportController::class, 'taskReport'])
            ->name('tasks');

        // Flux visiteurs
        Route::get('visitors', [ReportController::class, 'visitorReport'])
            ->name('visitors');

        // Absences et congés
        Route::get('leaves', [ReportController::class, 'leaveReport'])
            ->name('leaves');

        // Taux occupation salles
        Route::get('rooms', [ReportController::class, 'roomReport'])
            ->name('rooms');

        // Niveaux fournitures + mouvements
        Route::get('supplies', [ReportController::class, 'supplyReport'])
            ->name('supplies');

        // Rapport global d'activité (synthèse tous modules)
        Route::get('global', [ReportController::class, 'globalActivityReport'])
            ->name('global');

        // Journal d'audit filtrable
        // Paramètres supplémentaires : module, action
        Route::get('audit', [ReportController::class, 'auditReport'])
            ->name('audit')
            ->middleware('can:view-audit');
    });
});

// =========================================================================
// PAGES INERTIA — rendu SSR
// =========================================================================

Route::middleware(['auth', 'verified', 'tenant'])->group(function () {

    // Tableau de bord Dirigeant
    Route::get('/dashboard/executive', [DashboardController::class, 'executiveDashboard'])
        ->name('dashboard.executive')
        ->middleware('can:view-executive-dashboard');

    // Tableau de bord Secrétariat
    Route::get('/dashboard/secretariat', [DashboardController::class, 'secretariatDashboard'])
        ->name('dashboard.secretariat');

    // Centre des rapports
    Route::get('/rapports', [ReportController::class, 'index'])
        ->name('rapports.index');

    // Visualiseur de rapport interactif
    Route::get('/rapports/viewer', [ReportController::class, 'viewer'])
        ->name('rapports.viewer');
});
