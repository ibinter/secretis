<?php

namespace App\Http\Controllers;

use App\Jobs\OcrProcessDocument;
use App\Models\Document;
use App\Services\OcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * OcrController — API OCR et recherche full-text
 */
class OcrController extends Controller
{
    public function __construct(private OcrService $ocrService) {}

    /**
     * POST /documents/{id}/ocr
     * Déclenche l'OCR manuellement sur un document existant.
     */
    public function triggerOcr(Request $request, int $id): JsonResponse
    {
        $document = Document::where('organization_id', $request->user()->organization_id)
            ->findOrFail($id);

        if (!$document->file_path) {
            return response()->json(['message' => 'Ce document n\'a pas de fichier attaché.'], 422);
        }

        $document->update(['ocr_status' => 'pending']);

        OcrProcessDocument::dispatch($document);

        return response()->json([
            'message' => 'Traitement OCR lancé. Le texte sera disponible dans quelques instants.',
            'ocr_status' => 'pending',
        ]);
    }

    /**
     * GET /documents/{id}/ocr-text
     * Récupère le texte extrait par OCR pour un document.
     */
    public function getText(Request $request, int $id): JsonResponse
    {
        $document = Document::where('organization_id', $request->user()->organization_id)
            ->findOrFail($id);

        return response()->json([
            'document_id' => $document->id,
            'ocr_status'  => $document->ocr_status ?? 'none',
            'text_content' => $document->text_content,
            'ocr_data'    => $document->ocr_data,
        ]);
    }

    /**
     * POST /ocr/extract-invoice
     * Upload un PDF de facture et retourne les champs structurés extraits.
     * Utile pour saisie semi-automatique en comptabilité.
     */
    public function extractInvoice(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:20480',
            'type' => 'in:invoice,letter,contract',
        ]);

        $uploadedFile = $request->file('file');
        $type         = $request->input('type', 'invoice');

        // Stocker temporairement
        $tempPath = $uploadedFile->store('ocr_temp', 'local');

        try {
            $structuredData = $this->ocrService->extractStructuredData($tempPath, $type);

            return response()->json([
                'success' => true,
                'type'    => $type,
                'data'    => $structuredData,
            ]);
        } finally {
            // Supprimer le fichier temporaire
            \Illuminate\Support\Facades\Storage::disk('local')->delete($tempPath);
        }
    }

    /**
     * GET /documents/search?q={query}
     * Recherche full-text dans le contenu OCR des documents.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q'       => 'required|string|min:2|max:200',
            'page'    => 'integer|min:1',
            'per_page' => 'integer|min:5|max:50',
        ]);

        $query   = $request->query('q');
        $orgId   = $request->user()->organization_id;
        $perPage = (int) $request->query('per_page', 15);

        // Recherche PostgreSQL full-text avec ranking
        $results = Document::where('organization_id', $orgId)
            ->whereNotNull('text_content')
            ->where('ocr_status', 'done')
            ->whereRaw(
                "to_tsvector('french', COALESCE(text_content, '')) @@ plainto_tsquery('french', ?)",
                [$query]
            )
            ->select([
                'id', 'title', 'file_name', 'mime_type', 'file_size',
                'folder_id', 'created_by', 'created_at', 'ocr_status',
                \DB::raw(
                    "ts_rank(to_tsvector('french', COALESCE(text_content, '')), plainto_tsquery('french', " .
                    \DB::getPdo()->quote($query) .
                    ")) AS rank"
                ),
                \DB::raw(
                    "ts_headline('french', COALESCE(text_content, ''), plainto_tsquery('french', " .
                    \DB::getPdo()->quote($query) .
                    "), 'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=15') AS excerpt"
                ),
            ])
            ->orderByDesc('rank')
            ->paginate($perPage);

        return response()->json($results);
    }
}
