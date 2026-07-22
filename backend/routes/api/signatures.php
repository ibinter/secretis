<?php

use App\Http\Controllers\SignatureController;
use App\Http\Controllers\OcrController;
use Illuminate\Support\Facades\Route;

// =============================================================================
// ROUTES PUBLIQUES — Signature électronique (sans authentification)
// =============================================================================
// Ces routes sont accessibles via un token unique envoyé par email au signataire.
Route::prefix('signatures')->name('signatures.')->group(function () {
    Route::get('/sign/{token}',          [SignatureController::class, 'signPage'])->name('sign');
    Route::post('/sign/{token}',         [SignatureController::class, 'submitSignature'])->name('sign.submit');
    Route::post('/sign/{token}/decline', [SignatureController::class, 'declineSignature'])->name('sign.decline');
});

// =============================================================================
// ROUTES AUTHENTIFIÉES — API JSON (tenant middleware via ResolveTenant)
// =============================================================================
Route::middleware(['auth:sanctum', 'resolve.tenant'])->group(function () {

    // ── Demandes de signature ──────────────────────────────────────────────
    Route::prefix('signatures')->name('signatures.')->group(function () {
        Route::get('/requests',                    [SignatureController::class, 'index'])->name('index');
        Route::post('/requests',                   [SignatureController::class, 'store'])->name('store');
        Route::get('/requests/{id}',               [SignatureController::class, 'show'])->name('show');
        Route::delete('/requests/{id}/cancel',     [SignatureController::class, 'cancel'])->name('cancel');
        Route::post('/requests/{id}/remind',       [SignatureController::class, 'remind'])->name('remind');
        Route::get('/{id}/certificate',            [SignatureController::class, 'downloadCertificate'])->name('certificate');
        Route::get('/verify/{hash}',               [SignatureController::class, 'verify'])->name('verify');
    });

    // ── OCR & Recherche full-text ──────────────────────────────────────────
    Route::prefix('documents')->group(function () {
        Route::post('/{id}/ocr',               [OcrController::class, 'triggerOcr']);
        Route::get('/{id}/ocr-text',           [OcrController::class, 'getText']);
        Route::get('/search',                  [OcrController::class, 'search']);
    });

    // Upload facture pour extraction structurée
    Route::post('/ocr/extract-invoice',        [OcrController::class, 'extractInvoice']);
});
