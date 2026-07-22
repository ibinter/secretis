<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentFolder;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * DocumentFolderController — Arborescence GED
 *
 * Gère l'arborescence des dossiers de la GED.
 * Chaque dossier appartient à une organisation (multi-tenant strict).
 */
class DocumentFolderController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    // -------------------------------------------------------------------------
    // Index — Arborescence complète
    // -------------------------------------------------------------------------

    /**
     * Retourne l'arborescence complète des dossiers de l'organisation.
     *
     * Structure retournée :
     *   [
     *     { id, name, parent_id, access_level, children: [...], documents_count }
     *   ]
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();

        $folders = DocumentFolder::where('organization_id', $user->organization_id)
            ->with('children')
            ->withCount('documents')
            ->whereNull('parent_id') // Racines uniquement, les enfants chargés via relation
            ->orderBy('name')
            ->get();

        return response()->json($this->buildTree($folders));
    }

    // -------------------------------------------------------------------------
    // Store
    // -------------------------------------------------------------------------

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'parent_id'    => ['nullable', 'exists:document_folders,id'],
            'access_level' => ['required', 'in:public,internal,confidential,top_secret'],
        ]);

        $user = Auth::user();

        // Vérifier que le dossier parent appartient à la même organisation
        if (isset($validated['parent_id'])) {
            $parent = DocumentFolder::where('id', $validated['parent_id'])
                ->where('organization_id', $user->organization_id)
                ->firstOrFail();
        }

        $folder = DocumentFolder::create([
            'organization_id' => $user->organization_id,
            'name'            => $validated['name'],
            'parent_id'       => $validated['parent_id'] ?? null,
            'access_level'    => $validated['access_level'],
            'created_by_id'   => $user->id,
        ]);

        $this->auditService->logCreated(
            module: 'ged',
            resourceType: 'document_folder',
            resourceId: $folder->id,
            attributes: ['name' => $folder->name],
        );

        return response()->json([
            'message' => 'Dossier créé.',
            'folder'  => $folder,
        ], 201);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function update(Request $request, string $id): JsonResponse
    {
        $folder = $this->findFolderForCurrentOrg($id);

        $validated = $request->validate([
            'name'         => ['sometimes', 'required', 'string', 'max:255'],
            'access_level' => ['sometimes', 'required', 'in:public,internal,confidential,top_secret'],
        ]);

        $original = $folder->toArray();
        $folder->update($validated);

        $this->auditService->logUpdated(
            module: 'ged',
            resourceType: 'document_folder',
            resourceId: $folder->id,
            original: $original,
            changes: $validated,
        );

        return response()->json([
            'message' => 'Dossier mis à jour.',
            'folder'  => $folder,
        ]);
    }

    // -------------------------------------------------------------------------
    // Destroy
    // -------------------------------------------------------------------------

    /**
     * Supprime un dossier vide.
     * Refuse la suppression si le dossier contient des documents ou des sous-dossiers.
     */
    public function destroy(string $id): JsonResponse
    {
        $folder = $this->findFolderForCurrentOrg($id);

        // Vérifier que le dossier est vide
        $documentCount  = Document::where('folder_id', $id)->where('status', 'active')->count();
        $childrenCount  = DocumentFolder::where('parent_id', $id)->count();

        if ($documentCount > 0 || $childrenCount > 0) {
            return response()->json([
                'message' => "Impossible de supprimer un dossier non vide ({$documentCount} document(s), {$childrenCount} sous-dossier(s)).",
            ], 422);
        }

        $this->auditService->logDeleted(
            module: 'ged',
            resourceType: 'document_folder',
            resourceId: $folder->id,
            lastState: $folder->toArray(),
        );

        $folder->delete();

        return response()->json(['message' => 'Dossier supprimé.']);
    }

    // -------------------------------------------------------------------------
    // Move — Déplacer un document vers un autre dossier
    // -------------------------------------------------------------------------

    /**
     * Déplace un document vers un autre dossier.
     *
     * Vérifie que les deux entités appartiennent à la même organisation.
     */
    public function move(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'document_id'     => ['required', 'exists:documents,id'],
            'target_folder_id'=> ['nullable', 'exists:document_folders,id'],
        ]);

        $user     = Auth::user();
        $document = Document::where('id', $validated['document_id'])
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        // Vérifier le dossier cible si spécifié
        if ($validated['target_folder_id']) {
            $targetFolder = $this->findFolderForCurrentOrg($validated['target_folder_id']);
        }

        $previousFolderId = $document->folder_id;

        $document->update(['folder_id' => $validated['target_folder_id'] ?? null]);

        $this->auditService->logUpdated(
            module: 'ged',
            resourceType: 'document',
            resourceId: $document->id,
            original: ['folder_id' => $previousFolderId],
            changes: ['folder_id' => $validated['target_folder_id']],
        );

        return response()->json([
            'message'  => 'Document déplacé.',
            'document' => $document->fresh(['folder']),
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function findFolderForCurrentOrg(string $id): DocumentFolder
    {
        return DocumentFolder::where('id', $id)
            ->where('organization_id', Auth::user()->organization_id)
            ->firstOrFail();
    }

    /**
     * Construit l'arborescence récursive depuis les dossiers racines.
     */
    private function buildTree($folders): array
    {
        return $folders->map(function (DocumentFolder $folder) {
            return [
                'id'             => $folder->id,
                'name'           => $folder->name,
                'parent_id'      => $folder->parent_id,
                'access_level'   => $folder->access_level,
                'documents_count'=> $folder->documents_count ?? 0,
                'children'       => $this->buildTree($folder->children ?? collect()),
            ];
        })->toArray();
    }
}
