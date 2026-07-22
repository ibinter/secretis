<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * OneDriveService — Intégration OneDrive via Microsoft Graph API
 *
 * Gère :
 *  - Upload de documents SECRETIS vers OneDrive
 *  - Import de fichiers OneDrive dans la GED SECRETIS
 *  - Téléchargement local de fichiers OneDrive
 *  - Génération de liens de partage
 *  - Liste des fichiers récents
 *
 * Pré-requis : Scopes Files.ReadWrite, Files.ReadWrite.All
 */
class OneDriveService
{
    private const GRAPH_URL   = 'https://graph.microsoft.com/v1.0';
    private const MAX_RETRIES = 3;
    /** Seuil pour l'upload en une seule requête (4 MB) */
    private const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024;

    public function __construct(
        private readonly MicrosoftAuthService $authService
    ) {}

    // -------------------------------------------------------------------------
    // Upload SECRETIS → OneDrive
    // -------------------------------------------------------------------------

    /**
     * Uploade un document SECRETIS vers le OneDrive de l'utilisateur.
     * Pour les fichiers > 4 MB, utilise l'upload par segments (resumable upload).
     *
     * @param  Document $document  Document SECRETIS avec fichier sur disque local
     * @param  User     $user      Utilisateur OneDrive de destination
     * @return string              Drive Item ID OneDrive
     * @throws \RuntimeException   Si le fichier local n'existe pas ou l'upload échoue
     */
    public function uploadDocument(Document $document, User $user): string
    {
        if (! $user->microsoft_access_token) {
            throw new \RuntimeException("L'utilisateur #{$user->id} n'a pas de compte OneDrive connecté.");
        }

        $token    = $this->authService->refreshTokenIfNeeded($user);
        $filePath = Storage::path($document->file_path);

        if (! file_exists($filePath)) {
            throw new \RuntimeException("Fichier introuvable sur le disque : {$document->file_path}");
        }

        $fileSize = filesize($filePath);
        $fileName = $document->original_name ?? basename($document->file_path);

        // Dossier OneDrive destination : SECRETIS/{organization_slug}/
        $orgSlug    = $user->organization->slug ?? 'secretis';
        $remotePath = "SECRETIS/{$orgSlug}/{$fileName}";

        if ($fileSize <= self::SIMPLE_UPLOAD_MAX) {
            $driveItemId = $this->simpleUpload($token, $remotePath, $filePath);
        } else {
            $driveItemId = $this->resumableUpload($token, $remotePath, $filePath, $fileSize);
        }

        // Persister l'ID OneDrive sur le document SECRETIS
        $document->update(['onedrive_item_id' => $driveItemId]);

        Log::info('OneDriveService: Document uploadé', [
            'document_id'   => $document->id,
            'onedrive_id'   => $driveItemId,
            'file_size'     => $fileSize,
            'remote_path'   => $remotePath,
        ]);

        return $driveItemId;
    }

    // -------------------------------------------------------------------------
    // Import OneDrive → GED SECRETIS
    // -------------------------------------------------------------------------

    /**
     * Importe les fichiers d'un dossier OneDrive dans la GED SECRETIS.
     * Les fichiers déjà importés (par onedrive_item_id) sont mis à jour.
     *
     * @param  User        $user      Utilisateur OneDrive
     * @param  string|null $folderId  ID du dossier OneDrive (null = racine)
     * @return array                  Liste des documents créés/mis à jour
     */
    public function syncFromOneDrive(User $user, ?string $folderId = null): array
    {
        if (! $user->microsoft_access_token) {
            throw new \RuntimeException("L'utilisateur #{$user->id} n'a pas de compte OneDrive connecté.");
        }

        $token  = $this->authService->refreshTokenIfNeeded($user);
        $items  = $this->listDriveItems($token, $folderId);

        $documents = [];

        foreach ($items as $item) {
            // Ignorer les dossiers
            if (isset($item['folder'])) {
                continue;
            }

            try {
                $existing = Document::where('organization_id', $user->organization_id)
                    ->where('onedrive_item_id', $item['id'])
                    ->first();

                $documentData = [
                    'organization_id'  => $user->organization_id,
                    'uploaded_by'      => $user->id,
                    'original_name'    => $item['name'],
                    'file_size'        => $item['size'] ?? 0,
                    'mime_type'        => $item['file']['mimeType'] ?? 'application/octet-stream',
                    'onedrive_item_id' => $item['id'],
                    'onedrive_url'     => $item['webUrl'] ?? null,
                    'source'           => 'onedrive',
                    'status'           => 'active',
                ];

                if ($existing) {
                    $existing->update($documentData);
                    $documents[] = $existing;
                } else {
                    $documents[] = Document::create($documentData);
                }
            } catch (\Throwable $e) {
                Log::warning('OneDriveService: Échec import fichier OneDrive', [
                    'item_id' => $item['id'] ?? 'unknown',
                    'name'    => $item['name'] ?? 'unknown',
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        Log::info('OneDriveService: Import OneDrive terminé', [
            'user_id'  => $user->id,
            'imported' => count($documents),
            'total'    => count($items),
        ]);

        return $documents;
    }

    // -------------------------------------------------------------------------
    // Téléchargement OneDrive → Stockage local
    // -------------------------------------------------------------------------

    /**
     * Télécharge un fichier OneDrive vers le stockage local SECRETIS.
     *
     * @param  string $driveItemId  ID de l'élément OneDrive
     * @param  User   $user         Utilisateur propriétaire du fichier
     * @return string               Chemin local du fichier téléchargé (relatif au disque 'local')
     */
    public function downloadFromOneDrive(string $driveItemId, User $user): string
    {
        $token = $this->authService->refreshTokenIfNeeded($user);

        // Obtenir l'URL de téléchargement (@microsoft.graph.downloadUrl)
        $item = $this->graphRequest('GET', "/me/drive/items/{$driveItemId}?\$select=id,name,@microsoft.graph.downloadUrl", $token);

        $downloadUrl = $item['@microsoft.graph.downloadUrl'] ?? null;

        if (! $downloadUrl) {
            throw new \RuntimeException("Impossible d'obtenir l'URL de téléchargement pour l'item OneDrive : {$driveItemId}");
        }

        // Télécharger le contenu
        $response = Http::timeout(120)
            ->withOptions(['stream' => true])
            ->get($downloadUrl);

        if ($response->failed()) {
            throw new \RuntimeException("Échec du téléchargement OneDrive pour l'item : {$driveItemId}");
        }

        $fileName  = $item['name'] ?? Str::uuid() . '.bin';
        $localPath = "onedrive/{$user->organization_id}/" . Str::uuid() . '_' . $fileName;

        Storage::put($localPath, $response->body());

        Log::info('OneDriveService: Fichier téléchargé depuis OneDrive', [
            'drive_item_id' => $driveItemId,
            'local_path'    => $localPath,
        ]);

        return $localPath;
    }

    // -------------------------------------------------------------------------
    // Liens de partage
    // -------------------------------------------------------------------------

    /**
     * Génère un lien de partage OneDrive pour un fichier.
     *
     * @param  string $driveItemId  ID de l'élément OneDrive
     * @param  User   $user         Propriétaire du fichier
     * @param  string $type         'view' (lecture) ou 'edit' (lecture/écriture)
     * @param  string $scope        'organization' ou 'anonymous'
     * @return string               URL de partage
     */
    public function createShareLink(string $driveItemId, User $user, string $type = 'view', string $scope = 'organization'): string
    {
        $token = $this->authService->refreshTokenIfNeeded($user);

        $response = $this->graphRequest(
            'POST',
            "/me/drive/items/{$driveItemId}/createLink",
            $token,
            [
                'type'  => $type,
                'scope' => $scope,
            ]
        );

        $shareUrl = $response['link']['webUrl'] ?? null;

        if (! $shareUrl) {
            throw new \RuntimeException("Impossible de créer le lien de partage pour l'item : {$driveItemId}");
        }

        return $shareUrl;
    }

    // -------------------------------------------------------------------------
    // Fichiers récents
    // -------------------------------------------------------------------------

    /**
     * Retourne les fichiers récemment modifiés dans OneDrive.
     *
     * @param  User $user
     * @param  int  $limit  Nombre maximal de fichiers à retourner
     * @return array        [{id, name, size, mimeType, lastModifiedDateTime, webUrl}]
     */
    public function getRecentFiles(User $user, int $limit = 10): array
    {
        if (! $user->microsoft_access_token) {
            return [];
        }

        try {
            $token = $this->authService->refreshTokenIfNeeded($user);

            $response = $this->graphRequest('GET', '/me/drive/recent?' . http_build_query([
                '$top'    => $limit,
                '$select' => 'id,name,size,file,lastModifiedDateTime,webUrl,parentReference',
            ]), $token);

            return array_map(fn($item) => [
                'id'                   => $item['id'],
                'name'                 => $item['name'],
                'size'                 => $item['size'] ?? 0,
                'mime_type'            => $item['file']['mimeType'] ?? null,
                'last_modified'        => $item['lastModifiedDateTime'] ?? null,
                'web_url'              => $item['webUrl'] ?? null,
                'parent_folder'        => $item['parentReference']['name'] ?? null,
            ], $response['value'] ?? []);
        } catch (\Throwable $e) {
            Log::warning('OneDriveService: Impossible de récupérer les fichiers récents', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
            return [];
        }
    }

    // -------------------------------------------------------------------------
    // Méthodes privées — Upload
    // -------------------------------------------------------------------------

    /**
     * Upload simple (fichiers ≤ 4 MB) via PUT.
     */
    private function simpleUpload(string $token, string $remotePath, string $localPath): string
    {
        $content = file_get_contents($localPath);

        $response = Http::withToken($token)
            ->timeout(60)
            ->withHeaders(['Content-Type' => 'application/octet-stream'])
            ->put(self::GRAPH_URL . '/me/drive/root:/' . ltrim($remotePath, '/') . ':/content', $content);

        if ($response->failed()) {
            throw new \RuntimeException("Échec upload OneDrive : " . $response->body());
        }

        return $response->json('id');
    }

    /**
     * Upload resumable (fichiers > 4 MB) via session d'upload.
     * Envoie des chunks de 10 MB pour les gros fichiers.
     */
    private function resumableUpload(string $token, string $remotePath, string $localPath, int $fileSize): string
    {
        // 1. Créer la session d'upload
        $sessionResponse = Http::withToken($token)
            ->timeout(30)
            ->post(self::GRAPH_URL . '/me/drive/root:/' . ltrim($remotePath, '/') . ':/createUploadSession', [
                'item' => [
                    '@microsoft.graph.conflictBehavior' => 'replace',
                    'name' => basename($remotePath),
                ],
            ]);

        if ($sessionResponse->failed()) {
            throw new \RuntimeException("Impossible de créer la session d'upload OneDrive.");
        }

        $uploadUrl = $sessionResponse->json('uploadUrl');
        $chunkSize = 10 * 1024 * 1024; // 10 MB par chunk
        $handle    = fopen($localPath, 'rb');
        $offset    = 0;
        $driveItemId = null;

        // 2. Envoyer les chunks
        while ($offset < $fileSize) {
            $chunkData   = fread($handle, $chunkSize);
            $chunkLength = strlen($chunkData);
            $rangeEnd    = $offset + $chunkLength - 1;

            $chunkResponse = Http::withHeaders([
                'Content-Range'  => "bytes {$offset}-{$rangeEnd}/{$fileSize}",
                'Content-Length' => $chunkLength,
                'Content-Type'   => 'application/octet-stream',
            ])
            ->timeout(120)
            ->put($uploadUrl, $chunkData);

            // 202 Accepted = chunk reçu, continuer
            // 201/200 = upload terminé
            if (in_array($chunkResponse->status(), [200, 201])) {
                $driveItemId = $chunkResponse->json('id');
                break;
            }

            if ($chunkResponse->failed()) {
                fclose($handle);
                throw new \RuntimeException("Échec upload chunk OneDrive à l'offset {$offset}.");
            }

            $offset += $chunkLength;
        }

        fclose($handle);

        if (! $driveItemId) {
            throw new \RuntimeException("Upload OneDrive terminé mais aucun ID de fichier reçu.");
        }

        return $driveItemId;
    }

    /**
     * Liste les éléments d'un dossier OneDrive.
     */
    private function listDriveItems(string $token, ?string $folderId = null): array
    {
        $endpoint = $folderId
            ? "/me/drive/items/{$folderId}/children"
            : '/me/drive/root/children';

        $endpoint .= '?' . http_build_query([
            '$top'    => 200,
            '$select' => 'id,name,size,file,folder,webUrl,lastModifiedDateTime',
        ]);

        $response = $this->graphRequest('GET', $endpoint, $token);

        return $response['value'] ?? [];
    }

    /**
     * Exécute une requête Microsoft Graph avec gestion du throttling (429).
     */
    private function graphRequest(string $method, string $endpoint, string $token, ?array $body = null): array
    {
        $url     = str_starts_with($endpoint, 'https://') ? $endpoint : self::GRAPH_URL . $endpoint;
        $attempt = 0;

        while ($attempt < self::MAX_RETRIES) {
            $attempt++;

            $request = Http::withToken($token)
                ->timeout(30)
                ->withHeaders(['Accept' => 'application/json']);

            $response = match (strtoupper($method)) {
                'GET'   => $request->get($url),
                'POST'  => $request->post($url, $body ?? []),
                'PATCH' => $request->patch($url, $body ?? []),
                default => throw new \InvalidArgumentException("Méthode non supportée : {$method}"),
            };

            if ($response->successful()) {
                return $response->json() ?? [];
            }

            if ($response->status() === 429) {
                $retryAfter = (int) ($response->header('Retry-After') ?? pow(2, $attempt));
                $retryAfter = min($retryAfter, 60);

                Log::warning('OneDriveService: Throttling Graph (429)', [
                    'retry_after' => $retryAfter,
                    'attempt'     => $attempt,
                ]);

                if ($attempt < self::MAX_RETRIES) {
                    sleep($retryAfter);
                    continue;
                }
            }

            Log::error('OneDriveService: Erreur Graph', [
                'method'   => $method,
                'endpoint' => $endpoint,
                'status'   => $response->status(),
                'error'    => $response->json('error.message') ?? $response->body(),
            ]);

            throw new \RuntimeException(
                "Erreur OneDrive ({$response->status()}) : " . ($response->json('error.message') ?? 'Erreur inconnue')
            );
        }

        throw new \RuntimeException("OneDrive indisponible après " . self::MAX_RETRIES . " tentatives.");
    }
}
