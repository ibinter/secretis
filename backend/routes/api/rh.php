<?php

use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\LeaveController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes MODULE 8 — RESSOURCES HUMAINES
|--------------------------------------------------------------------------
|
| Toutes les routes sont protégées par :
|   - auth:sanctum     → utilisateur authentifié
|   - verified         → email vérifié
|   - module:rh        → middleware vérifiant que le module RH est activé
|
| RBAC (Spatie Permission) :
|   - rh_manager   → accès complet RH (validation, rapports, import)
|   - manager      → approbation N+1 de ses subordonnés
|   - employee     → ses propres congés et notes de frais
|   - accountant   → validation comptable des notes de frais
|   - admin_org    → accès total à l'organisation
|
*/

Route::middleware(['auth:sanctum', 'verified', 'module:rh'])->prefix('rh')->name('rh.')->group(function () {

    // =========================================================================
    // EMPLOYÉS
    // =========================================================================
    Route::prefix('employes')->name('employes.')->group(function () {

        // Liste et création
        Route::get('/', [EmployeeController::class, 'index'])
            ->middleware('can:rh.employees.view')
            ->name('index');

        Route::post('/', [EmployeeController::class, 'store'])
            ->middleware('can:rh.employees.create')
            ->name('store');

        // Organigramme (JSON — public pour tous les membres)
        Route::get('/org-chart', [EmployeeController::class, 'orgChart'])
            ->middleware('can:rh.employees.view')
            ->name('org-chart');

        // Import CSV/Excel (RH uniquement)
        Route::post('/import-csv', [EmployeeController::class, 'importCsv'])
            ->middleware('can:rh.employees.create')
            ->name('import-csv');

        // Fiche individuelle
        Route::get('/{employee}', [EmployeeController::class, 'show'])
            ->middleware('can:rh.employees.view')
            ->name('show');

        Route::put('/{employee}', [EmployeeController::class, 'update'])
            ->middleware('can:rh.employees.edit')
            ->name('update');

        Route::delete('/{employee}', [EmployeeController::class, 'destroy'])
            ->middleware('can:rh.employees.delete')
            ->name('destroy');
    });

    // =========================================================================
    // CONGÉS
    // =========================================================================
    Route::prefix('conges')->name('conges.')->group(function () {

        // Liste (mes demandes + à approuver selon rôle)
        Route::get('/', [LeaveController::class, 'index'])
            ->middleware('can:rh.leaves.view')
            ->name('index');

        // Créer une demande
        Route::post('/', [LeaveController::class, 'store'])
            ->middleware('can:rh.leaves.create')
            ->name('store');

        // Calendrier des absences (JSON)
        Route::get('/calendar', [LeaveController::class, 'calendar'])
            ->middleware('can:rh.leaves.view')
            ->name('calendar');

        // Rapport mensuel
        Route::get('/rapport-mensuel', [LeaveController::class, 'monthlyReport'])
            ->middleware('can:rh.leaves.report')
            ->name('monthly-report');

        // Détail d'une demande
        Route::get('/{leave}', [LeaveController::class, 'show'])
            ->middleware('can:rh.leaves.view')
            ->name('show');

        // Modifier (si pending)
        Route::put('/{leave}', [LeaveController::class, 'update'])
            ->middleware('can:rh.leaves.edit')
            ->name('update');

        // Workflow d'approbation
        Route::post('/{leave}/approve-n1', [LeaveController::class, 'approveN1'])
            ->middleware('can:rh.leaves.approve_n1')
            ->name('approve-n1');

        Route::post('/{leave}/approve-hr', [LeaveController::class, 'approveHR'])
            ->middleware('can:rh.leaves.approve_hr')
            ->name('approve-hr');

        Route::post('/{leave}/reject', [LeaveController::class, 'reject'])
            ->middleware('can:rh.leaves.approve_n1')
            ->name('reject');
    });

    // =========================================================================
    // NOTES DE FRAIS
    // =========================================================================
    Route::prefix('frais')->name('frais.')->group(function () {

        Route::get('/', [ExpenseController::class, 'index'])
            ->middleware('can:rh.expenses.view')
            ->name('index');

        Route::post('/', [ExpenseController::class, 'store'])
            ->middleware('can:rh.expenses.create')
            ->name('store');

        // Export comptabilité
        Route::get('/export-comptabilite', [ExpenseController::class, 'exportForAccounting'])
            ->middleware('can:rh.expenses.accounting')
            ->name('export-accounting');

        Route::get('/{expense}', [ExpenseController::class, 'show'])
            ->middleware('can:rh.expenses.view')
            ->name('show');

        Route::put('/{expense}', [ExpenseController::class, 'update'])
            ->middleware('can:rh.expenses.edit')
            ->name('update');

        Route::delete('/{expense}', [ExpenseController::class, 'destroy'])
            ->middleware('can:rh.expenses.edit')
            ->name('destroy');

        // Workflow
        Route::post('/{expense}/submit', [ExpenseController::class, 'submit'])
            ->middleware('can:rh.expenses.create')
            ->name('submit');

        Route::post('/{expense}/approve', [ExpenseController::class, 'approve'])
            ->middleware('can:rh.expenses.approve')
            ->name('approve');

        Route::post('/{expense}/approve-accounting', [ExpenseController::class, 'approveAccounting'])
            ->middleware('can:rh.expenses.accounting')
            ->name('approve-accounting');

        Route::post('/{expense}/reject', [ExpenseController::class, 'reject'])
            ->middleware('can:rh.expenses.approve')
            ->name('reject');
    });
});
