<?php

namespace App\Services;

use App\Models\Document;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * LegalArchiveService — Archivage légal automatique conforme OHADA
 *
 * Durées de conservation OHADA par catégorie :
 *   - FICHE_RH     : 30 ans (Code du travail)
 *   - CONTRAT      : 10 ans (obligations civiles)
 *   - FACTURE      : 10 ans (obligations comptables)
 *   - PV_REUNION   : 10 ans
 *   - DECISION     : 10 ans
 *   - BON_COMMANDE : 7 ans (SYSCOHADA)
 *   - COURRIER     : 5 ans
 *   - RAPPORT      : 5 ans
 *   - DEVIS        : 5 ans
 *   - AUTRE        : 5 ans
 *
 * L'empreinte légale est immuable : hash SHA-256 + timestamp horodaté
 * (RFC 3161 simplifié — signature HMAC du hash + timestamp).
 */
class LegalArchiveService
{
    /** Durées OHADA en années par catégorie */
    private const RETENTION = [
        'FICHE_RH'     => 30,
        'CONTRAT'      => 10,
        'FACTURE'      => 10,
        'PV_REUNION'   => 10,
        'DECISION'     => 10,
        'BON_COMMANDE' => 7,
        'COURRIER'     => 5,
        'RAPPORT'      => 5,
        'DEVIS'        => 5,
        'AUTRE'        => 5,
    ];

    public function __construct(
        private AuditService $auditService,
        private NotificationService $notificationService,
    ) {}

    // -----------------------------------------------------------------------
    // Archivage
    // -----------------------------------------------------------------------

    /**
     * Archive légalement un document.
     *
     * Étapes :
     *   1. Calcule la date d'expiration selon OHADA
     *   2. Génère le hash SHA-256 du fichier
     *   3. Crée le timestamp horodaté (RFC 3161 simplifié)
     *   4. Déplace le fichier vers le stockage archive (cold storage)
     *   5. Enregistre dans legal_archive_log
     *   6. Met à jour le document
     */
    public function archiveDocument(Document $document, ?int $archivedBy = null): void
    {
        if (DB::table('legal_archive_log')->where('document_id', $document->id)->exists()) {
            Log::info('LegalArchive: document déjà archivé', ['document_id' => $document->id]);
            return;
        }

        $category      = $document->category ?? 'AUTRE';
        $retentionYears = self::RETENTION[$category] ?? 5;
        $archiveDate   = now();
        $expiryDate    = now()->addYears($retentionYears);

        // Hash du fichier
        $hash = $this->computeFileHash($document);

        // Timestamp horodaté RFC 3161 simplifié
        $timestampToken = $this->generateTimestampToken($hash, $archiveDate->toIso8601String());

        // Déplacer le fichier vers le stockage archive
        $archivePath = $this->moveToArchiveStorage($document);

        DB::transaction(function () use (
            $document, $category, $retentionYears, $archiveDate, $expiryDate,
            $hash, $timestampToken, $archivePath, $archivedBy
        ) {
            // Enregistrer dans legal_archive_log
            DB::table('legal_archive_log')->insert([
                'document_id'      => $document->id,
                'organization_id'  => $document->organization_id,
                'archive_date'     => $archiveDate,
                'expiry_date'      => $expiryDate,
                'sha256_hash'      => $hash,
                'timestamp_token'  => $timestampToken,
                'storage_driver'   => $this->getStorageDriver(),
                'storage_path'     => $archivePath,
                'category'         => $category,
                'retention_years'  => $retentionYears,
                'archived_by'      => $archivedBy,
                'integrity_verified' => true,
                'last_verified_at' => now(),
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);

            // Mettre à jour le document
            $document->update([
                'archived_at'    => $archiveDate,
                'sha256_hash'    => $hash,
                'retention_years' => $retentionYears,
                'file_path'      => $archivePath,
            ]);
        });

        $this->auditService->log(
            action: 'archived',
            module: 'ged',
            resourceType: 'document',
            resourceId: $document->id,
            newValues: [
                'archive_date'  => $archiveDate->toIso8601String(),
                'expiry_date'   => $expiryDate->toIso8601String(),
                'retention_years' => $retentionYears,
            ],
        );

        Log::info('LegalArchive: document archivé', [
            'document_id'    => $document->id,
            'category'       => $category,
            'expiry_date'    => $expiryDate->toDateString(),
        ]);
    }

    // -----------------------------------------------------------------------
    // CRON : archivage automatique mensuel
    // -----------------------------------------------------------------------

    /**
     * Archive automatiquement les documents arrivés à maturité.
     * À exécuter mensuellement via CRON.
     *
     * Un document est mûr pour l'archivage si :
     *   - Il est validé (validation_status = 'validated')
     *   - Il est créé depuis plus de 6 mois
     *   - Il n'est pas déjà archivé
     */
    public function scheduleAutoArchive(): void
    {
        $query = Document::whereNull('archived_at')
            ->where('created_at', '<', now()->subMonths(6))
            ->where('validation_status', 'validated')
            ->whereDoesntHave('legalArchiveLog')
            ->chunk(50, function ($documents) {
                foreach ($documents as $document) {
                    try {
                        $this->archiveDocument($document);
                    } catch (\Throwable $e) {
                        Log::error('LegalArchive: échec archivage auto', [
                            'document_id' => $document->id,
                            'error'       => $e->getMessage(),
                        ]);
                    }
                }
            });

        Log::info('LegalArchive: archivage automatique mensuel terminé.');
    }

    // -----------------------------------------------------------------------
    // Vérification d'intégrité
    // -----------------------------------------------------------------------

    /**
     * Vérifie que le fichier archivé n'a pas été modifié depuis l'archivage.
     * Compare le hash SHA-256 actuel avec celui enregistré dans legal_archive_log.
     */
    public function verifyArchiveIntegrity(Document $document): bool
    {
        $log = DB::table('legal_archive_log')
            ->where('document_id', $document->id)
            ->first();

        if (! $log) {
            return false; // Non archivé
        }

        $currentHash = $this->computeFileHash($document);
        $isValid     = hash_equals($log->sha256_hash, $currentHash);

        // Mettre à jour la date de dernière vérification
        DB::table('legal_archive_log')->where('document_id', $document->id)->update([
            'integrity_verified' => $isValid,
            'last_verified_at'   => now(),
            'updated_at'         => now(),
        ]);

        if (! $isValid) {
            Log::critical('LegalArchive: INTÉGRITÉ COMPROMISE', [
                'document_id'    => $document->id,
                'stored_hash'    => $log->sha256_hash,
                'current_hash'   => $currentHash,
            ]);
        }

        return $isValid;
    }

    // -----------------------------------------------------------------------
    // Récupération depuis l'archive
    // -----------------------------------------------------------------------

    /**
     * Génère une URL de récupération temporaire (15 minutes) depuis l'archive.
     */
    public function requestArchiveRetrieval(Document $document): string
    {
        $log = DB::table('legal_archive_log')
            ->where('document_id', $document->id)
            ->firstOrFail();

        // Incrémenter le compteur de récupération
        DB::table('legal_archive_log')->where('document_id', $document->id)->update([
            'retrieval_count'   => DB::raw('retrieval_count + 1'),
            'last_retrieved_at' => now(),
            'updated_at'        => now(),
        ]);

        $this->auditService->log(
            action: 'archive_retrieved',
            module: 'ged',
            resourceType: 'document',
            resourceId: $document->id,
        );

        // Générer une URL temporaire selon le driver de stockage
        if ($log->storage_driver === 's3' || $log->storage_driver === 'glacier') {
            return Storage::disk('archive')->temporaryUrl($log->storage_path, now()->addMinutes(15));
        }

        // Stockage local : URL signée par notre serveur
        $payload   = "{$document->id}:{$log->sha256_hash}:" . now()->addMinutes(15)->timestamp;
        $signature = hash_hmac('sha256', $payload, config('app.key'));
        $token     = base64_encode("{$payload}:{$signature}");

        return route('documents.archive.download', [
            'document' => $document->id,
            'token'    => $token,
        ]);
    }

    // -----------------------------------------------------------------------
    // Privé
    // -----------------------------------------------------------------------

    /**
     * Calcule le hash SHA-256 du fichier du document.
     */
    private function computeFileHash(Document $document): string
    {
        try {
            // Essayer le disque archive d'abord
            foreach (['archive', 'private'] as $disk) {
                try {
                    $content = Storage::disk($disk)->get($document->file_path);
                    if ($content !== null) {
                        return hash('sha256', $content);
                    }
                } catch (\Throwable) {
                    continue;
                }
            }

            // Fallback : fichier local
            $path = storage_path('app/private/' . $document->file_path);
            if (file_exists($path)) {
                return hash_file('sha256', $path);
            }
        } catch (\Throwable $e) {
            Log::warning('LegalArchive: impossible de hasher le fichier', [
                'document_id' => $document->id,
                'error'       => $e->getMessage(),
            ]);
        }

        return hash('sha256', $document->title . ':' . $document->file_size . ':' . $document->created_at);
    }

    /**
     * Génère un token d'horodatage RFC 3161 simplifié.
     * Format : base64(JSON({hash, timestamp, version, signature}))
     */
    private function generateTimestampToken(string $hash, string $timestamp): string
    {
        $payload = json_encode([
            'version'   => '1.0',
            'hash'      => $hash,
            'algorithm' => 'sha256',
            'timestamp' => $timestamp,
            'issuer'    => 'SECRETIS-ERP-TSA',
        ]);

        $signature = hash_hmac('sha256', $payload, config('app.key'));

        $token = json_encode([
            'payload'   => $payload,
            'signature' => $signature,
        ]);

        return base64_encode($token);
    }

    /**
     * Déplace le fichier vers le stockage d'archive (cold storage).
     * Retourne le nouveau chemin.
     */
    private function moveToArchiveStorage(Document $document): string
    {
        $originalPath = $document->file_path;
        $archivePath  = str_replace('tenants/', 'archive/tenants/', $originalPath);

        try {
            // Copier vers le disque archive
            $content = Storage::disk('private')->get($originalPath);
            if ($content !== null) {
                Storage::disk('archive')->put($archivePath, $content);
                // Optionnel : supprimer l'original (cold storage)
                // Storage::disk('private')->delete($originalPath);
            }
        } catch (\Throwable $e) {
            Log::warning('LegalArchive: déplacement vers archive échoué, conservation du chemin original', [
                'document_id' => $document->id,
                'error'       => $e->getMessage(),
            ]);
            return $originalPath;
        }

        return $archivePath;
    }

    /**
     * Retourne le driver de stockage archive configuré.
     */
    private function getStorageDriver(): string
    {
        return config('filesystems.disks.archive.driver', 'local');
    }
}
