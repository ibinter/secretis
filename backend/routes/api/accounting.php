<?php

use App\Http\Controllers\AccountingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| MODULE COMPTABILITE — Routes
|--------------------------------------------------------------------------
|
| Toutes ces routes nécessitent :
|   - auth:sanctum   → utilisateur authentifié
|   - verified       → email vérifié
|   - license        → licence organisation valide
|   - module:comptabilite → module activé
|
*/

Route::middleware(['auth:sanctum', 'verified', 'license'])
    ->prefix('comptabilite')
    ->name('comptabilite.')
    ->group(function () {

        // ------------------------------------------------------------------
        // Dashboard & Export
        // ------------------------------------------------------------------

        Route::get('/dashboard', [AccountingController::class, 'dashboard'])
            ->name('dashboard');

        Route::get('/export', [AccountingController::class, 'export'])
            ->name('export');

        // ------------------------------------------------------------------
        // Clients comptables
        // ------------------------------------------------------------------

        Route::prefix('clients')->name('clients.')->group(function () {
            Route::get('/', [AccountingController::class, 'clientsIndex'])->name('index');
            Route::post('/', [AccountingController::class, 'clientsStore'])->name('store');
            Route::put('/{id}', [AccountingController::class, 'clientsUpdate'])->name('update');
            Route::delete('/{id}', [AccountingController::class, 'clientsDestroy'])->name('destroy');
        });

        // ------------------------------------------------------------------
        // Factures
        // ------------------------------------------------------------------

        Route::prefix('invoices')->name('invoices.')->group(function () {
            Route::get('/', [AccountingController::class, 'invoicesIndex'])->name('index');
            Route::get('/create', [AccountingController::class, 'invoicesCreate'])->name('create');
            Route::post('/', [AccountingController::class, 'invoicesStore'])->name('store');
            Route::get('/{id}/edit', [AccountingController::class, 'invoicesEdit'])->name('edit');
            Route::put('/{id}', [AccountingController::class, 'invoicesUpdate'])->name('update');
            Route::delete('/{id}', [AccountingController::class, 'invoicesDestroy'])->name('destroy');

            // Actions spéciales
            Route::post('/{id}/send', [AccountingController::class, 'invoicesSend'])->name('send');
            Route::post('/{id}/pay', [AccountingController::class, 'invoicesPay'])->name('pay');
            Route::get('/{id}/pdf', [AccountingController::class, 'invoicesPdf'])->name('pdf');
        });

        // ------------------------------------------------------------------
        // Devis
        // ------------------------------------------------------------------

        Route::prefix('quotes')->name('quotes.')->group(function () {
            Route::get('/', [AccountingController::class, 'quotesIndex'])->name('index');
            Route::post('/', [AccountingController::class, 'quotesStore'])->name('store');
            Route::get('/{id}/pdf', [AccountingController::class, 'quotesPdf'])->name('pdf');
            Route::get('/{id}/convert', [AccountingController::class, 'quotesConvert'])->name('convert');
        });

        // ------------------------------------------------------------------
        // Dépenses
        // ------------------------------------------------------------------

        Route::prefix('expenses')->name('expenses.')->group(function () {
            Route::get('/', [AccountingController::class, 'expensesIndex'])->name('index');
            Route::post('/', [AccountingController::class, 'expensesStore'])->name('store');
            Route::post('/{id}/approve', [AccountingController::class, 'expensesApprove'])->name('approve');
            Route::post('/{id}/reject', [AccountingController::class, 'expensesReject'])->name('reject');
        });
    });
