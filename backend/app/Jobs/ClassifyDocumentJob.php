<?php

namespace App\Jobs;

use App\Models\Document;
use App\Services\DocumentClassifierService;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ClassifyDocumentJob — Classification asynchrone d'un document
 *
 * Déclenché après upload + OCR terminé.
 * Pipeline :
 *   1. Classification (regex → LLM si ambigu)
 *   2. Extraction des métadonnées structurées
 *   3. Détection des doublons
 *   4. Mise à jour du document
 *   5. Notification utilisateur avec suggestions
 */
class ClassifyDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Nombre de tentatives en cas d'échec */
    public int $tries = 3;

    /** Délai entre tentatives (secondes) */
    public int $backoff = 30;

    /** Timeout du job (secondes) */
    public int $timeout = 120;

    public function __construct(
        public readonly int $documentId,
        public readonly int $userId,
    ) {}

    public function handle(
        DocumentClassifierService $classifier,
        NotificationService $notificationService,
    ): void {
        $document = Document::find($this->documentId);

        if (! $document) {
            Log::warning('ClassifyDocumentJob: document introuvable', ['id' => $this->documentId]);
            return;
        }

        // Ignorer si déjà classifié manuellement
        if ($document->classification_locked) {
            Log::info('ClassifyDocumentJob: classification verrouillée, job ignoré', ['id' => $this->documentId]);
            return;
        }

        try {
            // 1. Classifier le document
            $classification = $classifier->classifyDocument($document);

            // 2. Extraire les métadonnées
            $metadata = $classifier->extractKeyMetadata($document, $classification['category']);

            // 3. Détecter les doublons
            $duplicates = $classifier->detectDuplicates($document);

            // 4. Calculer le hash et la rétention
            $hash      = $classifier->computeHash($document);
            $retention = $classifier->suggestRetentionPolicy($document);

            // 5. Mettre à jour le document en base
            DB::transaction(function () use ($document, $classification, $metadata, $hash, $retention, $duplicates) {
                $document->update([
                    'category'           => $classification['category'],
                    'classification_confidence' => $classification['confidence'],
                    'classification_method'     => $classification['method'],
                    'tags'               => array_unique(array_merge(
                        $document->tags ?? [],
                        $classification['tags'],
                    )),
                    'metadata_extracted' => $metadata,
                    'sha256_hash'        => $hash,
                    'retention_years'    => $retention,
                    'has_duplicates'     => ! empty($duplicates['exact']) || ! empty($duplicates['similar']),
                    'classification_suggestions' => [
                        'category'        => $classification['category'],
                        'confidence'      => $classification['confidence'],
                        'tags'            => $classification['tags'],
                        'confidentiality' => $classification['confidentiality'],
                        'folder'          => self::SUGGESTED_FOLDERS[$classification['category']] ?? 'GED/Divers',
                        'metadata'        => $metadata,
                        'duplicates'      => $duplicates,
                        'classified_at'   => now()->toIso8601String(),
                    ],
                ]);
            });

            // 6. Notifier l'utilisateur des suggestions de classification
            $notificationService->send(
                userId: $this->userId,
                type: 'document_classified',
                title: 'Document classifié automatiquement',
                body: "Le document \"{$document->title}\" a été classifié comme {$classification['category']} "
                    . "(confiance : {$classification['confidence']} %). Veuillez vérifier et accepter les suggestions.",
                data: [
                    'document_id'    => $document->id,
                    'category'       => $classification['category'],
                    'confidence'     => $classification['confidence'],
                    'has_duplicates' => ! empty($duplicates['exact']) || ! empty($duplicates['similar']),
                    'action_url'     => "/ged/documents/{$document->id}?tab=classification",
                ],
            );

            Log::info('ClassifyDocumentJob: classification terminée', [
                'document_id' => $document->id,
                'category'    => $classification['category'],
                'confidence'  => $classification['confidence'],
                'method'      => $classification['method'],
            ]);

        } catch (\Throwable $e) {
            Log::error('ClassifyDocumentJob: erreur de classification', [
                'document_id' => $this->documentId,
                'error'       => $e->getMessage(),
                'trace'       => $e->getTraceAsString(),
            ]);

            // Marquer le document comme échoué en classification
            Document::where('id', $this->documentId)->update([
                'category' => DocumentClassifierService::CATEGORY_AUTRE,
                'classification_confidence' => 0,
                'classification_method'     => 'failed',
            ]);

            throw $e; // Relance pour retry
        }
    }

    // Dossiers suggérés (dupliqué ici pour accès statique dans le job)
    private const SUGGESTED_FOLDERS = [
        'CONTRAT'      => 'GED/Contrats',
        'FACTURE'      => 'GED/Comptabilité/Factures',
        'COURRIER'     => 'GED/Courriers',
        'RAPPORT'      => 'GED/Rapports',
        'PV_REUNION'   => 'GED/Réunions/PV',
        'FICHE_RH'     => 'GED/RH/Fiches',
        'BON_COMMANDE' => 'GED/Achats/Bons de commande',
        'DEVIS'        => 'GED/Commercial/Devis',
        'DECISION'     => 'GED/Décisions',
        'AUTRE'        => 'GED/Divers',
    ];
}
