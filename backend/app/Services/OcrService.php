<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * OcrService — Extraction de texte et données structurées depuis les documents
 *
 * Stratégie de détection :
 *  - PDF natif (texte embarqué) → smalot/pdfparser (rapide, haute fidélité)
 *  - PDF scanné / image          → Imagick → images → Tesseract OCR
 *
 * Dépendances composer :
 *  - smalot/pdfparser
 *  - thiagoalessio/tesseract_ocr (+ tesseract-ocr installé sur le serveur)
 */
class OcrService
{
    /**
     * Résultat OCR typé.
     */
    public function createResult(
        string $text,
        float $confidence,
        string $language,
        array $pages = []
    ): array {
        return [
            'text'       => $text,
            'confidence' => $confidence,
            'language'   => $language,
            'pages'      => $pages,
        ];
    }

    // =========================================================================
    // EXTRACTION DE TEXTE BRUT
    // =========================================================================

    /**
     * Extrait le texte d'un document (PDF, image).
     *
     * @param  string $filePath  Chemin relatif dans Storage::disk('local')
     * @return array  OcrResult {text, confidence, language, pages[]}
     */
    public function extractText(string $filePath): array
    {
        $absolutePath = Storage::disk('local')->path($filePath);

        if (!file_exists($absolutePath)) {
            throw new \RuntimeException("Fichier introuvable : {$filePath}");
        }

        $ext      = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION));
        $mimeType = mime_content_type($absolutePath) ?: '';

        // Image directe
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'tiff', 'bmp', 'webp'])) {
            return $this->extractFromImage($absolutePath);
        }

        // PDF
        if ($ext === 'pdf' || str_contains($mimeType, 'pdf')) {
            // Tenter extraction native d'abord
            $nativeResult = $this->extractNativePdfText($absolutePath);
            if ($nativeResult && strlen($nativeResult['text']) > 50) {
                return $nativeResult;
            }
            // PDF scanné → OCR
            return $this->extractFromScannedPdf($absolutePath);
        }

        // Texte brut
        if (in_array($ext, ['txt', 'csv'])) {
            $text = file_get_contents($absolutePath);
            return $this->createResult($text, 100.0, $this->detectLanguage($text), []);
        }

        throw new \RuntimeException("Type de fichier non supporté pour l'OCR : {$ext}");
    }

    // =========================================================================
    // EXTRACTION TEXTE NATIF PDF (smalot/pdfparser)
    // =========================================================================

    private function extractNativePdfText(string $absolutePath): ?array
    {
        try {
            if (!class_exists('\Smalot\PdfParser\Parser')) {
                return null;
            }

            $parser   = new \Smalot\PdfParser\Parser();
            $pdf      = $parser->parseFile($absolutePath);
            $pages    = $pdf->getPages();
            $allText  = '';
            $pageData = [];

            foreach ($pages as $i => $page) {
                $pageText    = $page->getText();
                $allText    .= $pageText . "\n\n";
                $pageData[]  = ['page' => $i + 1, 'text' => $pageText];
            }

            $text = trim($allText);
            if (!$text) {
                return null;
            }

            return $this->createResult(
                $text,
                99.0,
                $this->detectLanguage($text),
                $pageData
            );
        } catch (\Throwable $e) {
            Log::warning("PDF Parser natif a échoué", ['error' => $e->getMessage()]);
            return null;
        }
    }

    // =========================================================================
    // OCR VIA TESSERACT (PDF scanné ou image)
    // =========================================================================

    private function extractFromScannedPdf(string $absolutePath): array
    {
        $tempDir = sys_get_temp_dir() . '/secretis_ocr_' . uniqid();
        mkdir($tempDir, 0755, true);

        try {
            // Convertir PDF en images via Imagick
            if (!extension_loaded('imagick') && !class_exists('Imagick')) {
                throw new \RuntimeException("Imagick n'est pas installé.");
            }

            $imagick = new \Imagick();
            $imagick->setResolution(300, 300);
            $imagick->readImage($absolutePath);
            $imagick->setImageFormat('png');

            $pageTexts = [];
            $allText   = '';

            foreach ($imagick as $i => $page) {
                $imagePath = "{$tempDir}/page_{$i}.png";
                $page->writeImage($imagePath);

                $pageText    = $this->runTesseract($imagePath);
                $allText    .= $pageText . "\n\n";
                $pageTexts[] = ['page' => $i + 1, 'text' => $pageText];
            }

            $text = trim($allText);
            return $this->createResult(
                $text,
                85.0,
                $this->detectLanguage($text),
                $pageTexts
            );
        } finally {
            // Nettoyage des fichiers temporaires
            array_map('unlink', glob("{$tempDir}/*"));
            @rmdir($tempDir);
        }
    }

    private function extractFromImage(string $absolutePath): array
    {
        $text = $this->runTesseract($absolutePath);
        return $this->createResult(
            $text,
            80.0,
            $this->detectLanguage($text),
            [['page' => 1, 'text' => $text]]
        );
    }

    private function runTesseract(string $imagePath): string
    {
        try {
            if (class_exists('\thiagoalessio\TesseractOCR\TesseractOCR')) {
                $ocr = new \thiagoalessio\TesseractOCR\TesseractOCR($imagePath);
                $ocr->lang('fra', 'eng');
                return $ocr->run();
            }

            // Fallback : appel shell direct
            $output = shell_exec(
                "tesseract " . escapeshellarg($imagePath) . " stdout -l fra+eng 2>/dev/null"
            );
            return $output ?? '';
        } catch (\Throwable $e) {
            Log::error("Erreur Tesseract", ['error' => $e->getMessage()]);
            return '';
        }
    }

    // =========================================================================
    // EXTRACTION DE DONNÉES STRUCTURÉES
    // =========================================================================

    /**
     * Extrait des champs structurés selon le type de document.
     *
     * @param  string $filePath  Chemin relatif dans storage
     * @param  string $type      invoice | letter | contract
     * @return array
     */
    public function extractStructuredData(string $filePath, string $type): array
    {
        $ocrResult = $this->extractText($filePath);
        $text      = $ocrResult['text'];

        return match ($type) {
            'invoice'  => $this->extractInvoiceData($text),
            'letter'   => $this->extractLetterData($text),
            'contract' => $this->extractContractData($text),
            default    => ['raw_text' => $text],
        };
    }

    private function extractInvoiceData(string $text): array
    {
        $data = [
            'type'            => 'invoice',
            'invoice_number'  => null,
            'date'            => null,
            'due_date'        => null,
            'supplier'        => null,
            'client'          => null,
            'total_ht'        => null,
            'tax_rate'        => null,
            'tva_amount'      => null,
            'total_ttc'       => null,
            'currency'        => 'XOF',
        ];

        // Numéro de facture
        if (preg_match('/(?:facture|invoice|fact\.?)\s*(?:n[°o]?\.?\s*)([A-Z0-9\-\/]+)/i', $text, $m)) {
            $data['invoice_number'] = trim($m[1]);
        }

        // Date (formats : dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd)
        if (preg_match('/(?:date\s*[:]\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i', $text, $m)) {
            $data['date'] = $m[1];
        }

        // Montant total TTC
        if (preg_match('/(?:total\s*(?:ttc|toutes\s*taxes)|montant\s*total)[^\d]*(\d[\d\s\.,]+)/i', $text, $m)) {
            $data['total_ttc'] = $this->parseAmount($m[1]);
        }

        // Montant HT
        if (preg_match('/(?:total\s*ht|montant\s*ht|sous[\s-]total)[^\d]*(\d[\d\s\.,]+)/i', $text, $m)) {
            $data['total_ht'] = $this->parseAmount($m[1]);
        }

        // TVA
        if (preg_match('/(?:tva|taxe)[^\d]*(\d+(?:[.,]\d+)?)\s*%/i', $text, $m)) {
            $data['tax_rate'] = (float) str_replace(',', '.', $m[1]);
        }
        if (preg_match('/(?:montant\s*(?:de\s*la\s*)?tva|tva\s*\d+\s*%)[^\d]*(\d[\d\s\.,]+)/i', $text, $m)) {
            $data['tva_amount'] = $this->parseAmount($m[1]);
        }

        // Devise
        if (preg_match('/\b(XOF|FCFA|EUR|USD|GBP|MAD|XAF)\b/i', $text, $m)) {
            $data['currency'] = strtoupper($m[1]);
        }

        // Fournisseur (première ligne souvent)
        $lines = array_filter(explode("\n", $text), fn($l) => strlen(trim($l)) > 3);
        $data['supplier'] = trim(reset($lines) ?: '');

        return $data;
    }

    private function extractLetterData(string $text): array
    {
        $data = [
            'type'        => 'letter',
            'sender'      => null,
            'recipient'   => null,
            'subject'     => null,
            'date'        => null,
            'reference'   => null,
        ];

        // Objet
        if (preg_match('/(?:objet|object|re|réf)\s*[:]\s*(.+)/i', $text, $m)) {
            $data['subject'] = trim($m[1]);
        }

        // Date
        if (preg_match('/(?:le\s+|date\s*[:]\s*)?(\d{1,2}\s+\w+\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i', $text, $m)) {
            $data['date'] = trim($m[1]);
        }

        // Référence
        if (preg_match('/(?:réf(?:érence)?|ref\.?)\s*[:]\s*([A-Z0-9\-\/]+)/i', $text, $m)) {
            $data['reference'] = trim($m[1]);
        }

        return $data;
    }

    private function extractContractData(string $text): array
    {
        $data = [
            'type'         => 'contract',
            'parties'      => [],
            'start_date'   => null,
            'end_date'     => null,
            'amount'       => null,
            'currency'     => 'XOF',
            'reference'    => null,
        ];

        // Montant du contrat
        if (preg_match('/(?:montant|valeur|prix)\s*(?:du\s*contrat|total)?[^\d]*(\d[\d\s\.,]+)/i', $text, $m)) {
            $data['amount'] = $this->parseAmount($m[1]);
        }

        // Durée / dates
        if (preg_match('/(?:du|à partir du|date\s*de\s*début)\s*[:]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i', $text, $m)) {
            $data['start_date'] = $m[1];
        }
        if (preg_match('/(?:au|jusqu\'au|date\s*de\s*fin)\s*[:]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i', $text, $m)) {
            $data['end_date'] = $m[1];
        }

        return $data;
    }

    // =========================================================================
    // DÉTECTION DE LANGUE
    // =========================================================================

    public function detectLanguage(string $text): string
    {
        $text    = strtolower(substr($text, 0, 2000));
        $frWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'en', 'un', 'une', 'est', 'sont', 'dans', 'pour', 'par'];
        $enWords = ['the', 'and', 'is', 'are', 'in', 'of', 'to', 'a', 'that', 'this', 'was', 'for', 'on'];

        $frCount = 0;
        $enCount = 0;

        foreach ($frWords as $w) {
            $frCount += substr_count($text, " {$w} ");
        }
        foreach ($enWords as $w) {
            $enCount += substr_count($text, " {$w} ");
        }

        return $frCount >= $enCount ? 'fr' : 'en';
    }

    // =========================================================================
    // INDEXATION FULL-TEXT (PostgreSQL)
    // =========================================================================

    /**
     * Indexe un document pour la recherche full-text PostgreSQL (index GIN).
     */
    public function indexDocumentForSearch(Document $document): void
    {
        if (!$document->file_path) {
            return;
        }

        try {
            $ocrResult = $this->extractText($document->file_path);

            $document->update([
                'text_content' => $ocrResult['text'],
                'ocr_status'   => 'done',
                'ocr_data'     => [
                    'confidence' => $ocrResult['confidence'],
                    'language'   => $ocrResult['language'],
                    'pages'      => count($ocrResult['pages']),
                ],
            ]);

            // Mettre à jour le vecteur full-text PostgreSQL
            \DB::statement(
                "UPDATE documents SET tsv_content = to_tsvector('french', COALESCE(text_content, '')) WHERE id = ?",
                [$document->id]
            );
        } catch (\Throwable $e) {
            $document->update(['ocr_status' => 'failed']);
            Log::error("Erreur indexation full-text", [
                'document_id' => $document->id,
                'error'       => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    // =========================================================================
    // UTILITAIRES
    // =========================================================================

    private function parseAmount(string $raw): float
    {
        // Supprimer espaces, transformer virgule en point
        $clean = preg_replace('/\s/', '', $raw);
        $clean = str_replace(',', '.', $clean);
        // Supprimer les points séparateurs de milliers (ex: 1.000.000 → 1000000)
        $clean = preg_replace('/\.(?=\d{3})/', '', $clean);
        return (float) $clean;
    }
}
