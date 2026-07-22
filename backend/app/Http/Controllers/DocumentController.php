<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\AuditService;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * DocumentController — GED (Gestion Électronique de Documents)
 *
 * SECURITE :
 *  - Tous les fichiers sont dans storage PRIVÉ (jamais accessibles via /public)
 *  - Les téléchargements passent obligatoirement par cette API (vérif permissions)
 *  - Les URLs de prévisualisation sont temporaires (15 min max)
 */
class DocumentController extends Controller
{
    public function __construct(
        private DocumentService $documentService,
        private AuditService    $auditService,
    ) {}

    // -------------------------------------------------------------------------
    // Index
    // -------------------------------------------------------------------------

    /**
     * Liste des documents avec filtres.
     *
     * Filtres supportés :
     *   folder_id     : UUID dossier
     *   type          : type de document
     *   access_level  : public | internal | confidential | top_secret
     *   author_id     : UUID utilisateur
     *   department_id : UUID département
     *   search        : recherche dans title, description, keywords
     */
    public function index(Request $request): Response|JsonResponse
    {
        $user = Auth::user();

        $query = Document::where('organization_id', $user->organization_id)
            ->where('status', 'active')
            ->with(['author:id,name,avatar', 'folder:id,name', 'department:id,name'])
            ->withCount('versions')
            ->orderBy('updated_at', 'desc');

        // Filtres
        if ($folderId = $request->query('folder_id')) {
            $query->where('folder_id', $folderId);
        } else {
            // Si aucun dossier spécifié, on retourne les documents racine
            if (! $request->query('all')) {
                $query->whereNull('folder_id');
            }
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($accessLevel = $request->query('access_level')) {
            $query->where('access_level', $accessLevel);
        }

        if ($authorId = $request->query('author_id')) {
            $query->where('author_id', $authorId);
        }

        if ($departmentId = $request->query('department_id')) {
            $query->where('department_id', $departmentId);
        }

        // Restriction par niveau de confidentialité
        if (! $user->hasPermissionForModule('ged', 'view_confidential')) {
            $query->whereNotIn('access_level', ['top_secret']);
        }

        // Recherche plein texte
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $like = '%' . addcslashes($search, '%_') . '%';
                $q->where('title', 'ilike', $like)
                  ->orWhere('description', 'ilike', $like)
                  ->orWhereRaw("array_to_string(keywords, ' ') ilike ?", [$like]);
            });
        }

        $documents = $query->paginate($request->query('per_page', 24));

        if ($request->wantsJson()) {
            return response()->json($documents);
        }

        return Inertia::render('GED/Index', [
            'documents' => $documents,
            'filters'   => $request->only(['folder_id', 'type', 'access_level', 'author_id', 'search']),
        ]);
    }

    // -------------------------------------------------------------------------
    // Store — Upload
    // -------------------------------------------------------------------------

    /**
     * Upload un nouveau document avec ses métadonnées.
     *
     * Le fichier est stocké dans le stockage privé du tenant.
     * La réponse inclut l'URL de prévisualisation signée si applicable.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file'         => ['required', 'file', 'max:51200'], // 50 Mo max
            'title'        => ['required', 'string', 'max:500'],
            'description'  => ['nullable', 'string', 'max:2000'],
            'folder_id'    => ['nullable', 'exists:document_folders,id'],
            'type'         => ['nullable', 'string', 'max:100'],
            'department_id'=> ['nullable', 'exists:departments,id'],
            'access_level' => ['required', 'in:public,internal,confidential,top_secret'],
            'keywords'     => ['nullable', 'array'],
            'keywords.*'   => ['string', 'max:100'],
        ]);

        $document = $this->documentService->upload(
            file: $request->file('file'),
            metadata: $validated,
            user: Auth::user(),
        );

        return response()->json([
            'message'  => 'Document uploadé avec succès.',
            'document' => $document->load(['author', 'folder']),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // Show
    // -------------------------------------------------------------------------

    /**
     * Détail d'un document avec son historique de versions.
     */
    public function show(string $id): Response|JsonResponse
    {
        $document = $this->findDocumentForCurrentOrg($id);
        $document->load(['author', 'folder', 'department', 'versions.uploadedBy:id,name']);

        $this->auditService->log(
            action: 'viewed',
            module: 'ged',
            resourceType: 'document',
            resourceId: $document->id,
        );

        if (request()->wantsJson()) {
            return response()->json($document);
        }

        return Inertia::render('GED/Show', [
            'document' => $document,
        ]);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    /**
     * Modifier les métadonnées ou uploader une nouvelle version.
     *
     * Si un fichier est joint, une nouvelle version est créée.
     * Si seulement des métadonnées, seul le document est mis à jour.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $document = $this->findDocumentForCurrentOrg($id);

        $validated = $request->validate([
            'file'         => ['nullable', 'file', 'max:51200'],
            'title'        => ['sometimes', 'required', 'string', 'max:500'],
            'description'  => ['nullable', 'string', 'max:2000'],
            'folder_id'    => ['nullable', 'exists:document_folders,id'],
            'type'         => ['nullable', 'string', 'max:100'],
            'department_id'=> ['nullable', 'exists:departments,id'],
            'access_level' => ['sometimes', 'required', 'in:public,internal,confidential,top_secret'],
            'keywords'     => ['nullable', 'array'],
            'keywords.*'   => ['string', 'max:100'],
            'version_notes'=> ['nullable', 'string', 'max:500'],
        ]);

        $original = $document->toArray();

        // Nouvelle version si fichier fourni
        if ($request->hasFile('file')) {
            $this->documentService->createNewVersion(
                document: $document,
                file: $request->file('file'),
                user: Auth::user(),
            );
        }

        // Mise à jour des métadonnées
        $metaFields = array_intersect_key($validated, array_flip([
            'title', 'description', 'folder_id', 'type', 'department_id', 'access_level', 'keywords',
        ]));

        if (! empty($metaFields)) {
            $document->update($metaFields);

            $this->auditService->logUpdated(
                module: 'ged',
                resourceType: 'document',
                resourceId: $document->id,
                original: $original,
                changes: $metaFields,
            );
        }

        return response()->json([
            'message'  => 'Document mis à jour.',
            'document' => $document->fresh(['author', 'folder', 'versions']),
        ]);
    }

    // -------------------------------------------------------------------------
    // Destroy — Soft delete
    // -------------------------------------------------------------------------

    /**
     * Suppression logique d'un document (soft delete).
     *
     * SECURITE : Seul l'auteur ou un admin peut supprimer.
     * Le fichier physique est conservé pour la traçabilité.
     */
    public function destroy(string $id): JsonResponse
    {
        $document = $this->findDocumentForCurrentOrg($id);
        $user     = Auth::user();

        // Vérification permission : auteur ou admin
        if ($document->author_id !== $user->id && ! $user->isAdmin()) {
            $this->auditService->logAccessDenied('ged', 'document', $id, ['action' => 'delete']);
            return response()->json(['message' => 'Vous n\'êtes pas autorisé à supprimer ce document.'], 403);
        }

        $this->auditService->logDeleted(
            module: 'ged',
            resourceType: 'document',
            resourceId: $document->id,
            lastState: $document->toArray(),
        );

        $document->update(['status' => 'deleted']);
        $document->delete();

        return response()->json(['message' => 'Document supprimé.']);
    }

    // -------------------------------------------------------------------------
    // Download — Téléchargement sécurisé
    // -------------------------------------------------------------------------

    /**
     * Téléchargement sécurisé d'un document.
     *
     * SECURITE :
     *  - Vérifie les permissions de l'utilisateur
     *  - Le fichier est servi depuis le stockage privé (jamais via /public)
     *  - Pour S3 : génère une URL pre-signée
     *  - Pour stockage local : streame le fichier directement
     */
    public function download(string $id): \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\RedirectResponse
    {
        $document = $this->findDocumentForCurrentOrg($id);
        $user     = Auth::user();

        // Génération URL sécurisée (vérif permissions incluse dans le service)
        if (config('filesystems.disks.private.driver') === 's3') {
            $url = $this->documentService->getSecureDownloadUrl($document, $user);
            return redirect($url);
        }

        // Stockage local : stream direct
        $this->auditService->log(
            action: 'downloaded',
            module: 'ged',
            resourceType: 'document',
            resourceId: $document->id,
        );

        if (! Storage::disk('private')->exists($document->file_path)) {
            abort(404, 'Fichier introuvable.');
        }

        return Storage::disk('private')->download(
            $document->file_path,
            $document->title . '.' . pathinfo($document->file_path, PATHINFO_EXTENSION)
        );
    }

    // -------------------------------------------------------------------------
    // Preview — URL temporaire signée
    // -------------------------------------------------------------------------

    /**
     * Retourne une URL de prévisualisation temporaire (15 min).
     *
     * Pour les PDF et images — côté client, on affiche dans un iframe ou un viewer.
     * SECURITE : L'URL expire après 15 minutes.
     */
    public function preview(string $id): JsonResponse
    {
        $document = $this->findDocumentForCurrentOrg($id);
        $user     = Auth::user();

        $url = $this->documentService->getPreviewUrl($document, $user);

        return response()->json([
            'preview_url' => $url,
            'expires_at'  => now()->addMinutes(15)->toIso8601String(),
            'mime_type'   => $document->mime_type,
        ]);
    }

    // -------------------------------------------------------------------------
    // Search — Recherche plein texte
    // -------------------------------------------------------------------------

    /**
     * Recherche plein texte dans les métadonnées et mots-clés.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:200'],
        ]);

        $user   = Auth::user();
        $search = $request->query('q');
        $like   = '%' . addcslashes($search, '%_') . '%';

        $results = Document::where('organization_id', $user->organization_id)
            ->where('status', 'active')
            ->where(function ($q) use ($like) {
                $q->where('title', 'ilike', $like)
                  ->orWhere('description', 'ilike', $like)
                  ->orWhereRaw("array_to_string(keywords, ' ') ilike ?", [$like]);
            })
            ->when(
                ! $user->hasPermissionForModule('ged', 'view_confidential'),
                fn ($q) => $q->whereNotIn('access_level', ['top_secret'])
            )
            ->with(['author:id,name', 'folder:id,name'])
            ->limit(20)
            ->get();

        return response()->json($results);
    }

    // -------------------------------------------------------------------------
    // Share — Lien de partage temporaire
    // -------------------------------------------------------------------------

    /**
     * Génère un lien de partage sécurisé avec expiration configurable.
     *
     * SECURITE :
     *  - Le token est cryptographiquement aléatoire (64 chars)
     *  - Le hash SHA-256 du token est stocké (jamais le token brut)
     *  - Le lien expire après le délai spécifié
     */
    public function share(Request $request, string $id): JsonResponse
    {
        $document = $this->findDocumentForCurrentOrg($id);

        $validated = $request->validate([
            'expires_in_hours' => ['nullable', 'integer', 'min:1', 'max:168'], // max 7 jours
        ]);

        $expiresIn = $validated['expires_in_hours'] ?? 24;

        $token    = $this->documentService->generateShareToken($document, $expiresIn);
        $shareUrl = route('documents.shared', ['token' => $token]);

        return response()->json([
            'share_url'  => $shareUrl,
            'token'      => $token,
            'expires_at' => now()->addHours($expiresIn)->toIso8601String(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Trouve un document et vérifie l'isolation tenant.
     */
    private function findDocumentForCurrentOrg(string $id): Document
    {
        return Document::where('id', $id)
            ->where('organization_id', Auth::user()->organization_id)
            ->firstOrFail();
    }
}
