<?php

namespace App\Services;

use App\Models\SavedReport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Chart\Chart;
use PhpOffice\PhpSpreadsheet\Chart\DataSeries;
use PhpOffice\PhpSpreadsheet\Chart\DataSeriesValues;
use PhpOffice\PhpSpreadsheet\Chart\Legend;
use PhpOffice\PhpSpreadsheet\Chart\PlotArea;
use PhpOffice\PhpSpreadsheet\Chart\Title;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Service d'export des rapports BI en PDF, Excel et CSV.
 */
class ReportExportService
{
    // -------------------------------------------------------------------------
    // PDF — DomPDF avec graphiques SVG inline
    // -------------------------------------------------------------------------

    /**
     * Génère le contenu PDF et retourne un chemin de fichier temporaire.
     */
    public function exportToPdf(array $data, SavedReport $report): string
    {
        $html = $this->buildPdfHtml($data, $report);

        $pdf = Pdf::pourOrganisation($report->organization_id)
            ->loadHTML($html)
            ->setPaper('A4', 'landscape')
            ->setOption('defaultFont', 'DejaVu Sans')
            ->setOption('isHtml5ParserEnabled', true);

        $path = storage_path('app/tmp/report_' . time() . '.pdf');
        $pdf->save($path);

        return $path;
    }

    /**
     * Retourne une réponse HTTP de téléchargement PDF.
     */
    public function downloadPdf(array $data, SavedReport $report): Response
    {
        $html = $this->buildPdfHtml($data, $report);

        $pdf = Pdf::pourOrganisation($report->organization_id)
            ->loadHTML($html)
            ->setPaper('A4', 'landscape')
            ->setOption('defaultFont', 'DejaVu Sans');

        $filename = $this->slugify($report->name) . '_' . now()->format('Ymd') . '.pdf';

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function buildPdfHtml(array $data, SavedReport $report): string
    {
        $title     = e($report->name ?? 'Rapport BI');
        $generated = now()->format('d/m/Y à H:i');
        $summary   = $data['data']['summary'] ?? $data['summary'] ?? [];

        // Construire des graphiques SVG inline pour les séries temporelles
        $charts = '';
        $rawData = $data['data'] ?? $data;

        foreach ($rawData as $key => $value) {
            if (is_array($value) && !empty($value) && isset($value[0]['period'])) {
                $charts .= $this->buildSvgLineChart($value, ucfirst(str_replace('_', ' ', $key)));
            }
        }

        // Tableau récapitulatif
        $summaryRows = '';
        foreach ($summary as $k => $v) {
            $label = ucfirst(str_replace('_', ' ', $k));
            $summaryRows .= "<tr><td>{$label}</td><td><strong>{$v}</strong></td></tr>";
        }

        return <<<HTML
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>{$title}</title>
            <style>
                body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1e293b; margin: 20px; }
                h1 { color: #1d4ed8; font-size: 18px; border-bottom: 2px solid #1d4ed8; padding-bottom: 6px; }
                h2 { color: #334155; font-size: 13px; margin-top: 20px; }
                .meta { color: #64748b; font-size: 9px; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                th { background: #1d4ed8; color: white; padding: 6px 8px; text-align: left; }
                td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
                tr:nth-child(even) td { background: #f8fafc; }
                .kpi-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
                .kpi { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; min-width: 120px; }
                .kpi-label { font-size: 9px; color: #64748b; }
                .kpi-value { font-size: 16px; font-weight: bold; color: #1d4ed8; }
                .chart { margin-bottom: 24px; }
                svg { max-width: 100%; height: auto; }
            </style>
        </head>
        <body>
            <h1>{$title}</h1>
            <p class="meta">Généré le {$generated} | IBIG SECRETIS ERP</p>

            <h2>Indicateurs clés</h2>
            <table>
                <thead><tr><th>Indicateur</th><th>Valeur</th></tr></thead>
                <tbody>{$summaryRows}</tbody>
            </table>

            {$charts}
        </body>
        </html>
        HTML;
    }

    /**
     * Génère un graphique SVG en courbe simple pour une série temporelle.
     */
    private function buildSvgLineChart(array $series, string $label): string
    {
        if (empty($series)) return '';

        $values = array_column($series, 'total');
        if (empty(array_filter($values, fn($v) => $v !== null))) return '';

        $w      = 700;
        $h      = 160;
        $padL   = 40;
        $padR   = 20;
        $padT   = 20;
        $padB   = 30;
        $maxVal = max($values) ?: 1;
        $n      = count($values);
        $stepX  = ($w - $padL - $padR) / max($n - 1, 1);

        $points = '';
        foreach ($values as $i => $v) {
            $x = $padL + $i * $stepX;
            $y = $padT + ($h - $padT - $padB) * (1 - ($v / $maxVal));
            $points .= "{$x},{$y} ";
        }

        return <<<SVG
        <div class="chart">
            <h2>{$label}</h2>
            <svg viewBox="0 0 {$w} {$h}" xmlns="http://www.w3.org/2000/svg">
                <polyline fill="none" stroke="#1d4ed8" stroke-width="2" points="{$points}"/>
                <text x="{$padL}" y="{$padT}" font-size="9" fill="#94a3b8">{$maxVal}</text>
                <text x="{$padL}" y="{$h}" font-size="9" fill="#94a3b8">0</text>
            </svg>
        </div>
        SVG;
    }

    // -------------------------------------------------------------------------
    // Excel — PhpSpreadsheet, feuilles multiples + graphiques natifs
    // -------------------------------------------------------------------------

    public function exportToExcel(array $data, SavedReport $report): string
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getProperties()
            ->setTitle($report->name ?? 'Rapport BI')
            ->setCreator('IBIG SECRETIS ERP')
            ->setDescription('Rapport Business Intelligence');

        $rawData = $data['data'] ?? $data;
        $first   = true;

        foreach ($rawData as $sheetName => $sheetData) {
            if (!is_array($sheetData)) continue;

            if ($first) {
                $sheet = $spreadsheet->getActiveSheet();
                $first = false;
            } else {
                $sheet = $spreadsheet->createSheet();
            }

            $title = substr(ucfirst(str_replace('_', ' ', $sheetName)), 0, 31);
            $sheet->setTitle($title);

            if (empty($sheetData)) continue;

            // En-tête
            if (isset($sheetData[0]) && is_array($sheetData[0])) {
                $headers = array_keys($sheetData[0]);
                $col     = 'A';
                foreach ($headers as $h) {
                    $sheet->setCellValue($col . '1', ucfirst(str_replace('_', ' ', $h)));
                    $sheet->getStyle($col . '1')->getFont()->setBold(true);
                    $sheet->getStyle($col . '1')->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('1D4ED8');
                    $sheet->getStyle($col . '1')->getFont()->getColor()->setRGB('FFFFFF');
                    $col++;
                }

                // Données
                foreach ($sheetData as $ri => $row) {
                    $col = 'A';
                    foreach ($row as $val) {
                        $sheet->setCellValue($col . ($ri + 2), $val);
                        $col++;
                    }
                }

                // Auto-width
                foreach (range('A', $col) as $c) {
                    $sheet->getColumnDimension($c)->setAutoSize(true);
                }

                // Graphique en courbe si série temporelle
                if (isset($sheetData[0]['period']) && isset($sheetData[0]['total'])) {
                    $this->addLineChartToSheet($sheet, count($sheetData), $title);
                }
            } elseif (is_array($sheetData) && !isset($sheetData[0])) {
                // Dictionnaire clé → valeur
                $row = 1;
                foreach ($sheetData as $k => $v) {
                    $sheet->setCellValue('A' . $row, ucfirst(str_replace('_', ' ', $k)));
                    $sheet->setCellValue('B' . $row, is_numeric($v) ? $v : (string) $v);
                    $row++;
                }
                $sheet->getColumnDimension('A')->setAutoSize(true);
                $sheet->getColumnDimension('B')->setAutoSize(true);
            }
        }

        $path = storage_path('app/tmp/report_' . time() . '.xlsx');
        @mkdir(dirname($path), 0777, true);

        $writer = new Xlsx($spreadsheet);
        $writer->setIncludeCharts(true);
        $writer->save($path);

        return $path;
    }

    public function downloadExcel(array $data, SavedReport $report): Response
    {
        $path     = $this->exportToExcel($data, $report);
        $filename = $this->slugify($report->name) . '_' . now()->format('Ymd') . '.xlsx';

        return response()->download($path, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    private function addLineChartToSheet($sheet, int $dataRows, string $label): void
    {
        $xLabels  = [new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_STRING, "'" . $sheet->getTitle() . "'" . '!$A$2:$A$' . ($dataRows + 1), null, $dataRows)];
        $yValues  = [new DataSeriesValues(DataSeriesValues::DATASERIES_TYPE_NUMBER, "'" . $sheet->getTitle() . "'" . '!$B$2:$B$' . ($dataRows + 1), null, $dataRows)];

        $series = new DataSeries(DataSeries::TYPE_LINECHART, null, range(0, 0), [], $xLabels, $yValues);
        $plot   = new PlotArea(null, [$series]);
        $legend = new Legend();
        $chart  = new Chart('chart_' . uniqid(), new Title($label), $legend, $plot);

        $chart->setTopLeftPosition('D2');
        $chart->setBottomRightPosition('L20');

        $sheet->addChart($chart);
    }

    // -------------------------------------------------------------------------
    // CSV — UTF-8 BOM
    // -------------------------------------------------------------------------

    public function exportToCsv(array $data): string
    {
        $rawData = $data['data'] ?? $data;

        // Aplatir la première série trouvée
        $rows = [];
        foreach ($rawData as $sheetName => $sheetData) {
            if (is_array($sheetData) && isset($sheetData[0]) && is_array($sheetData[0])) {
                if (empty($rows)) {
                    $rows[] = array_keys($sheetData[0]);
                    foreach ($sheetData as $row) {
                        $rows[] = array_values($row);
                    }
                }
            }
        }

        $output = "\xEF\xBB\xBF"; // BOM UTF-8
        foreach ($rows as $row) {
            $output .= implode(';', array_map(fn($v) => '"' . str_replace('"', '""', $v) . '"', $row)) . "\r\n";
        }

        $path = storage_path('app/tmp/report_' . time() . '.csv');
        @mkdir(dirname($path), 0777, true);
        file_put_contents($path, $output);

        return $path;
    }

    public function downloadCsv(array $data): Response
    {
        $path     = $this->exportToCsv($data);
        $filename = 'rapport_bi_' . now()->format('Ymd') . '.csv';

        return response()->download($path, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ])->deleteFileAfterSend(true);
    }

    // -------------------------------------------------------------------------
    // Utilitaires
    // -------------------------------------------------------------------------

    private function slugify(string $str): string
    {
        return preg_replace('/[^a-z0-9]+/', '_', strtolower($str));
    }
}
