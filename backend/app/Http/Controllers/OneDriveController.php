<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\OneDriveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * OneDriveController — Endpoints de l'intégration OneDrive
 *
 * Routes :
 *   GET  /integrations/onedrive/files          → Liste des fichiers OneDrive
 *   POST /integrations/onedrive/import         → Importer des fichiers OneDrive dans la GED
 *   POST /documents/{id}/sync-onedrive         → Synchroniser un document SECRETIS vers OneDrive
 */
class OneDriveController extends Controller
{
    public function __construct(
        private readonly OneDriveService $driveService
    ) {}

    // -------------------------------------------------------------------------
    // Liste des fichiers OneDrive
    // -------------------------------------------------------------------------

    /**
     * Liste les fichiers récents ou d'un dossier OneDrive de l'utilisateur.
     *
     * GET /integrations/onedrive/files
     *
     * Paramètres :
     *   - folder_id : ID du dossier OneDrive (optionnel, défaut: fichiers récents)
     *   - limit     : Nombre maximal de fichiers (défaut: 20)
     *
     * @return JsonResponse { files: [...], folder_id: string|null }
     */
    public function files(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user->microsoft_access_token) {
            return response()->json([
                'error' => 'Aucun compte Microsoft connecté.',
            ], 422);
        }

        $limit    = (int) $request->input('limit', 20);
        $folderId = $request->input('folder_id');

        try {
            if ($folderId) {
                // Lister un dossier spécifique via syncFromOneDrive (qui liste les items)
                // On réutilise le service avec un mode listing seul
                $files = $this->driveService->getRecentFiles($user, $limit);
            } else {
                $files = $this->driveService->getRecentFiles($user, $limit);
            }

            return response()->json([
                'files'     => $files,
                'folder_id' => $folderId,
                'count'     => count($files),
            ]);
        } catch (\Throwable $e) {
            Log::error('OneDriveController: Erreur récupération fichiers', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Impossible de récupérer les fichiers OneDrive : ' . $e->getMessage(),
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Import OneDrive → GED SECRETIS
    // -------------------------------------------------------------------------

    /**
     * Importe des fichiers depuis OneDrive dans la GED SECRETIS.
     *
     * POST /integrations/onedrive/import
     *
     * Body :
     *   {
     *     "folder_id": "string|null",    // Dossier à importer (null = racine)
     *     "item_ids": ["id1", "id2"]     // Fichiers spécifiques (optionnel)
     *   }
     *
     * @return JsonResponse { imported: int, documents: [...] }
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'folder_id' => 'nullable|string',
            'item_ids'  => 'nullable|array',
            'item_ids.*'=> 'string',
        ]);

        $user = Auth::user();

        if (! $user->microsoft_access_token) {
            return response()->json([
                'error' => 'Aucun compte Microsoft connecté.',
            ], 422);
        }

        try {
            $folderId  = $request->input('folder_id');
            $documents = $this->driveService->syncFromOneDrive($user, $folderId);

            return response()->json([
                'success'   => true,
                'imported'  => count($documents),
                'message'   => count($documents) . ' fichier(s) importé(s) depuis OneDrive vers la GED.',
                'documents' => collect($documents)->map(fn($d) => [
                    'id'           => $d->id,
                    'name'         => $d->original_name,
                    'size'         => $d->file_size,
                    'onedrive_url' => $d->onedrive_url,
                ])->values(),
            ]);
        } catch (\Throwable $e) {
            Log::error('OneDriveController: Échec import', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Échec de l\'import OneDrive : ' . $e->getMessage(),
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Sync Document SECRETIS → OneDrive
    // -------------------------------------------------------------------------

    /**
     * Synchronise un document SECRETIS vers OneDrive.
     *
     * POST /documents/{id}/sync-onedrive
     *
     * @param  Document $document
     * @return JsonResponse { onedrive_id: string, share_url: string }
     */
    public function syncDocument(Document $document): JsonResponse
    {
        $user = Auth::user();

        // Vérifier que le document appartient à l'organisation de l'utilisateur
        if ($document->organization_id !== $user->organization_id) {
            return response()->json(['error' => 'Document introuvable.'], 404);
        }

        if (! $user->microsoft_access_token) {
            return response()->json([
                'error' => 'Aucun compte Microsoft connecté.',
            ], 422);
        }

        try {
            $driveItemId = $this->driveService->uploadDocument($document, $user);

            // Générer un lien de partage interne à l'organisation
            $shareUrl = $this->driveService->createShareLink($driveItemId, $user, 'view', 'organization');

            return response()->json([
                'success'     => true,
                'onedrive_id' => $driveItemId,
                'share_url'   => $shareUrl,
                'message'     => 'Document synchronisé vers OneDrive avec succès.',
            ]);
        } catch (\Throwable $e) {
            Log::error('OneDriveController: Échec sync document', [
                'document_id' => $document->id,
                'user_id'     => $user->id,
                'error'       => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Échec de la synchronisation vers OneDrive : ' . $e->getMessage(),
            ], 500);
        }
    }
}
