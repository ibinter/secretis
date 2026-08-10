<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * DocumentService — Gestion Électronique de Documents (GED)
 *
 * SECURITE :
 *  - Tous les fichiers sont stockés dans storage PRIVÉ (jamais /public)
 *  - Les téléchargements passent par des URLs signées temporaires (15 min)
 *  - Validation stricte des types MIME (whitelist)
 *  - Les partages génèrent des tokens opaques avec expiration
 */
class DocumentService
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    // -------------------------------------------------------------------------
    // MIME whitelist
    // -------------------------------------------------------------------------

    /**
     * Types MIME autorisés pour l'upload de documents.
     * Seuls ces types sont acceptés — jamais de .exe, .sh, .php, etc.
     */
    private const ALLOWED_MIME_TYPES = [
        // Documents bureautique
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/tiff',
        // Texte
        'text/plain',
        'text/csv',
        // Archives
        'application/zip',
        'application/x-rar-compressed',
        // OpenDocument
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
    ];

    /**
     * Valide le type MIME d'un fichier uploadé contre la whitelist.
     *
     * @throws \InvalidArgumentException si le type n'est pas autorisé
     */
    public function validateMimeType(UploadedFile $file): bool
    {
        $mimeType = $file->getMimeType();

        if (! in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
            throw new \InvalidArgumentException(
                "Type de fichier non autorisé : {$mimeType}. "
                . "Types acceptés : PDF, Word, Excel, PowerPoint, images, texte."
            );
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // Upload
    // -------------------------------------------------------------------------

    /**
     * Upload un nouveau document dans le stockage privé et crée l'entrée en base.
     *
     * Le fichier est stocké dans :
     *   storage/app/private/tenants/{organization_id}/documents/{uuid}.{ext}
     *
     * JAMAIS dans storage/public/ ou public/.
     */
    public function upload(UploadedFile $file, array $metadata, User $user): Document
    {
        $this->validateMimeType($file);

        return DB::transaction(function () use ($file, $metadata, $user) {
            // Chemin de stockage privé par tenant
            $path = $this->buildPrivateStoragePath($user->organization_id, $file);

            // Stocker dans le disque privé (local ou S3 selon config)
            $storedPath = Storage::disk('private')->putFileAs(
                dirname($path),
                $file,
                basename($path)
            );

            // Créer l'entrée document
            $document = Document::create([
                'organization_id' => $user->organization_id,
                'folder_id'       => $metadata['folder_id'] ?? null,
                'title'           => $metadata['title'] ?? $file->getClientOriginalName(),
                'description'     => $metadata['description'] ?? null,
                'author_id'       => $user->id,
                'created_by'      => $user->id,
                'current_version' => 1,
                'status'          => 'active',
                'access_level'    => $metadata['access_level'] ?? 'internal',
                'tags'            => json_encode($metadata['keywords'] ?? []),
                'mime_type'       => $file->getMimeType(),
                'file_path'       => $storedPath,
                'file_size'       => $file->getSize(),
                'file_name'       => $file->getClientOriginalName(),
            ]);

            // Créer la version initiale
            DocumentVersion::create([
                'document_id'    => $document->id,
                'version_number' => 1,
                'file_path'      => $storedPath,
                'file_size'      => $file->getSize(),
                'file_name'      => $file->getClientOriginalName(),
                'mime_type'      => $file->getMimeType(),
                'uploaded_by'    => $user->id,
                'change_summary' => 'Version initiale',
            ]);

            $this->auditService->logCreated(
                module: 'ged',
                resourceType: 'document',
                resourceId: $document->id,
                attributes: [
                    'title'     => $document->title,
                    'mime_type' => $document->mime_type,
                    'size'      => $document->file_size,
                ],
            );

            return $document;
        });
    }

    // -------------------------------------------------------------------------
    // Versioning
    // -------------------------------------------------------------------------

    /**
     * Crée une nouvelle version d'un document existant.
     * L'ancienne version reste accessible dans document_versions.
     */
    public function createNewVersion(Document $document, UploadedFile $file, User $user): DocumentVersion
    {
        $this->validateMimeType($file);

        return DB::transaction(function () use ($document, $file, $user) {
            $newVersionNumber = $document->current_version + 1;

            $path = $this->buildPrivateStoragePath($document->organization_id, $file, $document->id);

            $storedPath = Storage::disk('private')->putFileAs(
                dirname($path),
                $file,
                basename($path)
            );

            // Créer la nouvelle version
            $version = DocumentVersion::create([
                'document_id'    => $document->id,
                'version_number' => $newVersionNumber,
                'file_path'      => $storedPath,
                'file_size'      => $file->getSize(),
                'uploaded_by_id' => $user->id,
                'notes'          => "Version {$newVersionNumber}",
            ]);

            // Mettre à jour le document avec la nouvelle version
            $document->update([
                'current_version' => $newVersionNumber,
                'file_path'       => $storedPath,
                'file_size'       => $file->getSize(),
                'mime_type'       => $file->getMimeType(),
            ]);

            $this->auditService->log(
                action: 'new_version',
                module: 'ged',
                resourceType: 'document',
                resourceId: $document->id,
                newValues: ['version' => $newVersionNumber],
            );

            return $version;
        });
    }

    // -------------------------------------------------------------------------
    // Téléchargement sécurisé
    // -------------------------------------------------------------------------

    /**
     * Génère une URL de téléchargement sécurisée.
     *
     * Pour S3 : génère une URL pre-signée (15 min).
     * Pour stockage local : retourne une route contrôlée par le serveur.
     *
     * SECURITE :
     *  - Vérifie que l'utilisateur a le droit de télécharger ce document
     *  - Le fichier n'est JAMAIS exposé directement dans /public
     */
    public function getSecureDownloadUrl(Document $document, User $user): string
    {
        // Vérification des permissions
        $this->checkDownloadPermission($document, $user);

        // Log de l'accès
        $this->auditService->log(
            action: 'downloaded',
            module: 'ged',
            resourceType: 'document',
            resourceId: $document->id,
        );

        // Si S3 : URL pre-signée 15 minutes
        if (config('filesystems.default') === 's3' || config('filesystems.disks.private.driver') === 's3') {
            return Storage::disk('private')->temporaryUrl(
                $document->file_path,
                now()->addMinutes(15),
            );
        }

        // Stockage local : route sécurisée avec token signé
        return route('documents.download', [
            'document' => $document->id,
            'token'    => $this->signDownloadToken($document->id, $user->id),
        ]);
    }

    /**
     * Génère une URL de prévisualisation temporaire (15 min).
     */
    public function getPreviewUrl(Document $document, User $user): string
    {
        $this->checkDownloadPermission($document, $user);

        if (config('filesystems.default') === 's3' || config('filesystems.disks.private.driver') === 's3') {
            return Storage::disk('private')->temporaryUrl(
                $document->file_path,
                now()->addMinutes(15),
            );
        }

        return route('documents.preview', [
            'document' => $document->id,
            'token'    => $this->signDownloadToken($document->id, $user->id, 15),
        ]);
    }

    // -------------------------------------------------------------------------
    // Partage
    // -------------------------------------------------------------------------

    /**
     * Génère un token de partage temporaire sécurisé (opaque, non devinable).
     * Le token est stocké dans la table document_share_tokens avec expiration.
     *
     * @param  int $expiresInHours  Durée de validité du lien en heures
     */
    public function generateShareToken(Document $document, int $expiresInHours = 24): string
    {
        $token     = Str::random(64); // Token cryptographiquement aléatoire
        $expiresAt = now()->addHours($expiresInHours);

        // Stocker le token (table document_share_tokens)
        try {
            DB::table('document_share_tokens')->insert([
                'id'          => Str::uuid(),
                'document_id' => $document->id,
                'token'       => hash('sha256', $token), // Stocker le hash, pas le token brut
                'expires_at'  => $expiresAt,
                'created_at'  => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning("Table document_share_tokens absente", ['error' => $e->getMessage()]);
        }

        $this->auditService->log(
            action: 'share_link_created',
            module: 'ged',
            resourceType: 'document',
            resourceId: $document->id,
            newValues: ['expires_in_hours' => $expiresInHours],
        );

        return $token;
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Construit le chemin de stockage privé par tenant.
     * Format : private/tenants/{org_id}/documents/{doc_id}/{uuid}.{ext}
     */
    private function buildPrivateStoragePath(
        string $organizationId,
        UploadedFile $file,
        ?string $documentId = null,
    ): string {
        $ext      = $file->getClientOriginalExtension();
        $uuid     = Str::uuid();
        $docDir   = $documentId ?? $uuid;

        return "tenants/{$organizationId}/documents/{$docDir}/{$uuid}.{$ext}";
    }

    /**
     * Vérifie que l'utilisateur peut télécharger ce document.
     * Règles :
     *  - Super admin : toujours autorisé
     *  - Admin org : autorisé si même organisation
     *  - Utilisateur : accès selon access_level du document
     *
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    private function checkDownloadPermission(Document $document, User $user): void
    {
        // Vérification tenant (toujours)
        if ($document->organization_id !== $user->organization_id && ! $user->isSuperAdmin()) {
            throw new \Illuminate\Auth\Access\AuthorizationException(
                'Accès refusé : document d\'une autre organisation.'
            );
        }

        // Vérification niveau de confidentialité
        if ($document->access_level === 'top_secret' && ! $user->hasPermissionForModule('ged', 'view_confidential')) {
            throw new \Illuminate\Auth\Access\AuthorizationException(
                'Accès refusé : niveau de confidentialité insuffisant.'
            );
        }
    }

    /**
     * Signe un token de téléchargement pour le stockage local.
     * Le token contient : doc_id + user_id + expiration, signé par HMAC.
     */
    private function signDownloadToken(string $documentId, int|string $userId, int $minutesTtl = 15): string
    {
        $payload   = "{$documentId}:{$userId}:" . now()->addMinutes($minutesTtl)->timestamp;
        $signature = hash_hmac('sha256', $payload, config('app.key'));

        return base64_encode("{$payload}:{$signature}");
    }
}
