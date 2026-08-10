<?php

use App\Http\Controllers\CourrierController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentFolderController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| MODULE 2 — COURRIER & GED : Routes API
|--------------------------------------------------------------------------
|
| Toutes ces routes nécessitent :
|   - auth:sanctum   → utilisateur authentifié
|   - verified       → email vérifié
|   - license        → licence organisation valide
|   - module:courrier → module courrier activé pour l'organisation
|
| Les permissions fines (courrier.create, ged.view, etc.) sont vérifiées
| dans chaque contrôleur ou via des policies Spatie.
|
*/

Route::middleware(['auth:sanctum', 'verified', 'license', 'module:courrier'])
    ->prefix('courrier')
    ->name('courrier.')
    ->group(function () {

        // ------------------------------------------------------------------
        // Registre courrier
        // ------------------------------------------------------------------

        Route::get('/', [CourrierController::class, 'index'])
            ->name('index')
            ->middleware('can:courrier.view');

        Route::post('/', [CourrierController::class, 'store'])
            ->name('store')
            ->middleware('can:courrier.create');

        Route::get('/export/pdf', [CourrierController::class, 'exportPdf'])
            ->name('export.pdf')
            ->middleware('can:courrier.export');

        Route::get('/export/excel', [CourrierController::class, 'exportExcel'])
            ->name('export.excel')
            ->middleware('can:courrier.export');

        Route::get('/{id}', [CourrierController::class, 'show'])
            ->name('show')
            ->middleware('can:courrier.view');

        Route::put('/{id}', [CourrierController::class, 'update'])
            ->name('update')
            ->middleware('can:courrier.edit');

        Route::delete('/{id}', [CourrierController::class, 'destroy'])
            ->name('destroy')
            ->middleware('can:courrier.delete');

        // Actions workflow
        Route::post('/{id}/assign', [CourrierController::class, 'assign'])
            ->name('assign')
            ->middleware('can:courrier.assign');

        Route::post('/{id}/status', [CourrierController::class, 'changeStatus'])
            ->name('change-status')
            ->middleware('can:courrier.edit');
    });

// --------------------------------------------------------------------------
// GED — Documents
// --------------------------------------------------------------------------

Route::middleware(['auth:sanctum', 'verified', 'license', 'module:courrier'])
    ->prefix('ged')
    ->name('ged.')
    ->group(function () {

        // Dossiers
        Route::get('/folders', [DocumentFolderController::class, 'index'])
            ->name('folders.index')
            ->middleware('can:ged.view');

        Route::post('/folders', [DocumentFolderController::class, 'store'])
            ->name('folders.store')
            ->middleware('can:ged.create');

        Route::put('/folders/{id}', [DocumentFolderController::class, 'update'])
            ->name('folders.update')
            ->middleware('can:ged.edit');

        Route::delete('/folders/{id}', [DocumentFolderController::class, 'destroy'])
            ->name('folders.destroy')
            ->middleware('can:ged.delete');

        Route::post('/folders/{id}/move', [DocumentFolderController::class, 'move'])
            ->name('folders.move')
            ->middleware('can:ged.edit');

        // Documents
        Route::get('/documents', [DocumentController::class, 'index'])
            ->name('documents.index')
            ->middleware('can:ged.view');

        Route::post('/documents', [DocumentController::class, 'store'])
            ->name('documents.store')
            ->middleware('can:ged.create');

        Route::get('/documents/search', [DocumentController::class, 'search'])
            ->name('documents.search')
            ->middleware('can:ged.view');

        Route::get('/documents/{id}', [DocumentController::class, 'show'])
            ->name('documents.show')
            ->middleware('can:ged.view');

        Route::post('/documents/{id}', [DocumentController::class, 'update'])
            ->name('documents.update')
            ->middleware('can:ged.edit');

        Route::delete('/documents/{id}', [DocumentController::class, 'destroy'])
            ->name('documents.destroy')
            ->middleware('can:ged.delete');

        // Actions fichier (pas de permission middleware supplémentaire —
        // la vérification se fait dans le service avec la confidentialité)
        Route::get('/documents/{id}/download', [DocumentController::class, 'download'])
            ->name('documents.download')
            ->middleware('can:ged.view');

        Route::get('/documents/{id}/preview', [DocumentController::class, 'preview'])
            ->name('documents.preview')
            ->middleware('can:ged.view');

        Route::post('/documents/{id}/share', [DocumentController::class, 'share'])
            ->name('documents.share')
            ->middleware('can:ged.share');
    });

// --------------------------------------------------------------------------
// Route publique — Accès document via lien de partage (sans auth)
// --------------------------------------------------------------------------

Route::get('/ged/shared/{token}', function (string $token) {
    // Vérifier le token de partage
    $shareRecord = \Illuminate\Support\Facades\DB::table('document_share_tokens')
        ->where('token', hash('sha256', $token))
        ->where('expires_at', '>', now())
        ->first();

    if (! $shareRecord) {
        abort(404, 'Lien invalide ou expiré.');
    }

    $document = \App\Models\Document::findOrFail($shareRecord->document_id);

    // SECURITE : seuls les documents public ou internal sont accessibles via lien
    if ($document->access_level === 'top_secret') {
        abort(403, 'Ce document ne peut pas être partagé via lien.');
    }

    // Log de l'accès anonyme
    \Illuminate\Support\Facades\Log::info('Document partagé accédé', [
        'document_id' => $document->id,
        'ip'          => request()->ip(),
    ]);

    // Rediriger vers le téléchargement sécurisé via stockage privé
    if (config('filesystems.disks.private.driver') === 's3') {
        $url = \Illuminate\Support\Facades\Storage::disk('private')->temporaryUrl(
            $document->file_path,
            now()->addMinutes(15),
        );
        return redirect($url);
    }

    return \Illuminate\Support\Facades\Storage::disk('private')->download(
        $document->file_path,
        $document->title . '.' . pathinfo($document->file_path, PATHINFO_EXTENSION),
    );
})->name('documents.shared');
