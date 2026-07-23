<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\CustomReportRun;
use App\Services\ReportBuilderService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * GenerateReportJob — Génère le fichier exporté d'un rapport personnalisé.
 *
 * Formats : excel (xlsx) | csv | pdf | json
 * Timeout : 5 min | Tentatives : 2
 * Queue : reports
 */
class GenerateReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;
    public int $tries   = 2;

    public function __construct(private readonly CustomReportRun $run)
    {
        $this->onQueue('reports');
    }

    // =========================================================================
    // handle()
    // =========================================================================

    public function handle(ReportBuilderService $service): void
    {
        $start  = now();
        $run    = $this->run->fresh();
        $report = $run->report;

        $run->update(['status' => 'processing']);

        try {
            $data = $service->buildQuery($report)->get();

            $filePath = match ($run->format) {
                'excel' => $this->generateExcel($report->name, $report->columns, $data),
                'csv'   => $this->generateCsv($report->name, $report->columns, $data),
                'pdf'   => $this->generatePdf($report->name, $report->columns, $data),
                'json'  => $this->generateJson($report->name, $data),
                default => throw new \InvalidArgumentException("Format inconnu : {$run->format}"),
            };

            $run->update([
                'status'      => 'completed',
                'file_path'   => $filePath,
                'row_count'   => $data->count(),
                'duration_ms' => now()->diffInMilliseconds($start),
                'expires_at'  => now()->addHours(24),
            ]);

            $report->increment('run_count');
            $report->update(['last_run_at' => now()]);

            Log::info("GenerateReportJob completed", [
                'run_id'  => $run->id,
                'rows'    => $data->count(),
                'format'  => $run->format,
                'ms'      => now()->diffInMilliseconds($start),
            ]);

        } catch (\Throwable $e) {
            $run->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            Log::error("GenerateReportJob failed", [
                'run_id' => $run->id,
                'error'  => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    // =========================================================================
    // Générateurs
    // =========================================================================

    /**
     * Excel (XLSX) — PhpSpreadsheet avec styles.
     */
    private function generateExcel(string $reportName, array $columns, Collection $data): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle(mb_substr($reportName, 0, 31));

        // En-têtes
        $visibleColumns = array_values(array_filter($columns, fn($c) => $c['visible'] ?? true));
        $colIdx = 1;

        foreach ($visibleColumns as $col) {
            $cell = $sheet->getCellByColumnAndRow($colIdx, 1);
            $cell->setValue($col['label']);
            $sheet->getColumnDimensionByColumn($colIdx)->setWidth($col['width'] ?? 20);
            $colIdx++;
        }

        // Style en-têtes
        $lastColLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($visibleColumns));
        $headerRange   = "A1:{$lastColLetter}1";

        $sheet->getStyle($headerRange)->applyFromArray([
            'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF2E86C1']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        // Données
        $row = 2;
        foreach ($data as $item) {
            $record = is_object($item) ? (array) $item->getAttributes() : (array) $item;
            $colIdx = 1;
            foreach ($visibleColumns as $col) {
                $value = $record[$col['field']] ?? null;

                // Formatage selon le type
                $formatted = match ($col['type'] ?? 'string') {
                    'datetime' => $value ? Carbon::parse($value)->format('d/m/Y H:i') : '',
                    'date'     => $value ? Carbon::parse($value)->format('d/m/Y') : '',
                    'boolean'  => $value ? 'Oui' : 'Non',
                    default    => $value ?? '',
                };

                $sheet->getCellByColumnAndRow($colIdx, $row)->setValue($formatted);
                $colIdx++;
            }

            // Alternance de couleurs
            if ($row % 2 === 0) {
                $rowRange = "A{$row}:{$lastColLetter}{$row}";
                $sheet->getStyle($rowRange)->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFF0F7FF');
            }

            $row++;
        }

        // Freeze la première ligne
        $sheet->freezePane('A2');

        // Auto-filtre
        $sheet->setAutoFilter("A1:{$lastColLetter}1");

        $filename = 'reports/' . $this->sanitizeFilename($reportName) . '_' . now()->format('Ymd_His') . '.xlsx';
        $writer   = new Xlsx($spreadsheet);

        $tmpPath = tempnam(sys_get_temp_dir(), 'secretis_report_');
        $writer->save($tmpPath);

        Storage::disk('private')->put($filename, file_get_contents($tmpPath));
        @unlink($tmpPath);

        return $filename;
    }

    /**
     * CSV — BOM UTF-8, séparateur point-virgule.
     */
    private function generateCsv(string $reportName, array $columns, Collection $data): string
    {
        $visibleColumns = array_values(array_filter($columns, fn($c) => $c['visible'] ?? true));
        $filename       = 'reports/' . $this->sanitizeFilename($reportName) . '_' . now()->format('Ymd_His') . '.csv';

        $lines = [];
        // BOM UTF-8 pour Excel
        $bom = "\xEF\xBB\xBF";

        // En-têtes
        $lines[] = implode(';', array_map(fn($c) => '"' . str_replace('"', '""', $c['label']) . '"', $visibleColumns));

        // Données
        foreach ($data as $item) {
            $record = is_object($item) ? (array) $item->getAttributes() : (array) $item;
            $cells  = [];

            foreach ($visibleColumns as $col) {
                $value = $record[$col['field']] ?? '';

                $formatted = match ($col['type'] ?? 'string') {
                    'datetime' => $value ? Carbon::parse($value)->format('d/m/Y H:i') : '',
                    'date'     => $value ? Carbon::parse($value)->format('d/m/Y') : '',
                    'boolean'  => $value ? 'Oui' : 'Non',
                    default    => $value ?? '',
                };

                $cells[] = '"' . str_replace('"', '""', (string) $formatted) . '"';
            }

            $lines[] = implode(';', $cells);
        }

        $content = $bom . implode("\r\n", $lines);
        Storage::disk('private')->put($filename, $content);

        return $filename;
    }

    /**
     * PDF — DomPDF avec tableau et pied de page SECRETIS.
     */
    private function generatePdf(string $reportName, array $columns, Collection $data): string
    {
        $visibleColumns = array_values(array_filter($columns, fn($c) => $c['visible'] ?? true));

        $html = view('reports.custom-report-pdf', [
            'reportName' => $reportName,
            'columns'    => $visibleColumns,
            'rows'       => $data,
            'generatedAt'=> now()->format('d/m/Y H:i'),
            'rowCount'   => $data->count(),
        ])->render();

        $filename = 'reports/' . $this->sanitizeFilename($reportName) . '_' . now()->format('Ymd_His') . '.pdf';

        $pdf = Pdf::loadHTML($html)
            ->setPaper('A4', 'landscape')
            ->setOption('defaultFont', 'DejaVu Sans')
            ->setOption('isHtml5ParserEnabled', true);

        $tmpPath = tempnam(sys_get_temp_dir(), 'secretis_pdf_');
        $pdf->save($tmpPath);

        Storage::disk('private')->put($filename, file_get_contents($tmpPath));
        @unlink($tmpPath);

        return $filename;
    }

    /**
     * JSON — Données brutes structurées.
     */
    private function generateJson(string $reportName, Collection $data): string
    {
        $filename = 'reports/' . $this->sanitizeFilename($reportName) . '_' . now()->format('Ymd_His') . '.json';

        $payload = [
            'report'       => $reportName,
            'generated_at' => now()->toIso8601String(),
            'row_count'    => $data->count(),
            'data'         => $data->map(fn($item) => is_object($item) ? $item->getAttributes() : $item)->all(),
        ];

        Storage::disk('private')->put($filename, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return $filename;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function sanitizeFilename(string $name): string
    {
        return preg_replace('/[^a-z0-9_\-]/i', '_', mb_strtolower($name));
    }
}
