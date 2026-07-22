<?php

namespace App\Jobs;

use App\Models\Document;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\OcrService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * OcrProcessDocument — Job asynchrone de traitement OCR
 *
 * Déclenché automatiquement après l'upload d'un document PDF ou image.
 * File d'attente recommandée : 'ocr' (séparée pour éviter de saturer la file principale).
 */
class OcrProcessDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Nombre maximum de tentatives en cas d'échec.
     */
    public int $tries = 3;

    /**
     * Timeout du job en secondes (5 minutes pour les gros PDFs).
     */
    public int $timeout = 300;

    /**
     * Délai entre les tentatives en secondes.
     */
    public int $backoff = 60;

    public function __construct(
        private Document $document
    ) {
        $this->onQueue('ocr');
    }

    public function handle(OcrService $ocrService, NotificationService $notificationService): void
    {
        Log::info("OCR démarré", ['document_id' => $this->document->id]);

        // Marquer comme en cours
        $this->document->update(['ocr_status' => 'processing']);

        try {
            // Extraire le texte
            $ocrResult = $ocrService->extractText($this->document->file_path);

            // Sauvegarder le texte extrait
            $this->document->update([
                'text_content' => $ocrResult['text'],
                'ocr_status'   => 'done',
                'ocr_data'     => [
                    'confidence' => $ocrResult['confidence'],
                    'language'   => $ocrResult['language'],
                    'pages'      => count($ocrResult['pages']),
                    'processed_at' => now()->toIso8601String(),
                ],
            ]);

            // Mettre à jour l'index full-text PostgreSQL GIN
            \DB::statement(
                "UPDATE documents SET tsv_content = to_tsvector('french', COALESCE(text_content, '')) WHERE id = ?",
                [$this->document->id]
            );

            Log::info("OCR terminé avec succès", [
                'document_id' => $this->document->id,
                'confidence'  => $ocrResult['confidence'],
                'language'    => $ocrResult['language'],
                'chars'       => strlen($ocrResult['text']),
            ]);

            // Notifier le propriétaire du document
            $creator = User::find($this->document->created_by);
            if ($creator) {
                $notificationService->send(
                    $creator,
                    'ocr_completed',
                    'OCR terminé',
                    "Le texte de « {$this->document->title} » a été extrait et est maintenant recherchable.",
                    [
                        'document_id' => $this->document->id,
                        'url'         => "/ged?document={$this->document->id}",
                    ]
                );
            }
        } catch (\Throwable $e) {
            Log::error("OCR échoué", [
                'document_id' => $this->document->id,
                'error'       => $e->getMessage(),
                'trace'       => $e->getTraceAsString(),
            ]);

            $this->document->update([
                'ocr_status' => 'failed',
                'ocr_data'   => [
                    'error'      => $e->getMessage(),
                    'failed_at'  => now()->toIso8601String(),
                    'attempt'    => $this->attempts(),
                ],
            ]);

            // Relancer si pas encore au maximum de tentatives
            if ($this->attempts() < $this->tries) {
                $this->release($this->backoff);
                return;
            }

            // Notifier l'erreur au créateur
            $creator = User::find($this->document->created_by);
            if ($creator) {
                $notificationService->send(
                    $creator,
                    'ocr_failed',
                    'Échec de l\'OCR',
                    "L'extraction du texte de « {$this->document->title} » a échoué. Veuillez réessayer manuellement.",
                    ['document_id' => $this->document->id]
                );
            }
        }
    }

    /**
     * Gestion de l'échec définitif du job.
     */
    public function failed(\Throwable $exception): void
    {
        Log::critical("Job OCR définitivement échoué", [
            'document_id' => $this->document->id,
            'error'       => $exception->getMessage(),
        ]);

        $this->document->update(['ocr_status' => 'failed']);
    }
}
