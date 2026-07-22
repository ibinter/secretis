<?php

use App\Http\Controllers\BudgetController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes — Module Gestion Budgétaire
|--------------------------------------------------------------------------
|
| Toutes les routes nécessitent auth + appartenance à l'organisation.
| Inertia = rendu React | JSON = réponses API directes.
|
*/

Route::middleware(['auth', 'verified'])->group(function () {

    // ── Tableau de bord ──────────────────────────────────────────────────
    Route::get('/budget/dashboard',  [BudgetController::class, 'dashboard'])->name('budget.dashboard');

    // ── Alertes ──────────────────────────────────────────────────────────
    Route::get('/budget/alerts',     [BudgetController::class, 'alertsConfig'])->name('budget.alerts');
    Route::post('/budget/alerts',    [BudgetController::class, 'saveAlerts'])->name('budget.alerts.save');

    // ── Import CSV ───────────────────────────────────────────────────────
    Route::post('/budget/import',    [BudgetController::class, 'import'])->name('budget.import');

    // ── CRUD budgets ─────────────────────────────────────────────────────
    Route::get('/budget',            [BudgetController::class, 'index'])->name('budget.index');
    Route::get('/budget/create',     [BudgetController::class, 'create'])->name('budget.create');
    Route::post('/budget',           [BudgetController::class, 'store'])->name('budget.store');
    Route::get('/budget/{budget}',   [BudgetController::class, 'show'])->name('budget.show');
    Route::get('/budget/{budget}/edit',   [BudgetController::class, 'edit'])->name('budget.edit');
    Route::put('/budget/{budget}',        [BudgetController::class, 'update'])->name('budget.update');
    Route::delete('/budget/{budget}',     [BudgetController::class, 'destroy'])->name('budget.destroy');

    // ── Actions métier ───────────────────────────────────────────────────
    Route::post('/budget/{budget}/approve',   [BudgetController::class, 'approve'])->name('budget.approve');
    Route::post('/budget/{budget}/duplicate', [BudgetController::class, 'duplicate'])->name('budget.duplicate');
    Route::post('/budget/{budget}/export',    [BudgetController::class, 'export'])->name('budget.export');

    // ── Révision ─────────────────────────────────────────────────────────
    Route::get('/budget/{budget}/revise',     [BudgetController::class, 'revisePage'])->name('budget.revise.page');
    Route::post('/budget/{budget}/revise',    [BudgetController::class, 'revise'])->name('budget.revise');

    // ── Analyse des écarts ───────────────────────────────────────────────
    Route::get('/budget/{budget}/variance',     [BudgetController::class, 'variancePage'])->name('budget.variance.page');
    Route::get('/budget/{budget}/variance-api', [BudgetController::class, 'variance'])->name('budget.variance');
    Route::get('/budget/{budget}/variance-pdf', [BudgetController::class, 'variancePdf'])->name('budget.variance.pdf');

    // ── Prévisions ───────────────────────────────────────────────────────
    Route::get('/budget/{budget}/forecast',     [BudgetController::class, 'forecastPage'])->name('budget.forecast.page');
    Route::get('/budget/{budget}/forecast-api', [BudgetController::class, 'forecast'])->name('budget.forecast');

    // ── Réels comptables ─────────────────────────────────────────────────
    Route::get('/budget/{budget}/actuals',      [BudgetController::class, 'actuals'])->name('budget.actuals');

    // ── Lignes (pour import budget précédent) ────────────────────────────
    Route::get('/budget/{budget}/lines', function (\App\Models\Budget $budget) {
        if ($budget->organization_id !== auth()->user()->organization_id) abort(403);
        return response()->json(['lines' => $budget->lines]);
    })->name('budget.lines');
});
