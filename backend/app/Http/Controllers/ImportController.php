<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ImportJob;
use App\Services\ImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * ImportController — Wizard d'import universel CSV/XLSX.
 *
 * Pages Inertia : wizard, history
 * API           : upload, detect, map, validate, import, status, template
 */
class ImportController extends Controller
{
    public function __construct(private readonly ImportService $service) {}

    // =========================================================================
    // Pages Inertia
    // =========================================================================

    public function wizard(): InertiaResponse
    {
        return Inertia::render('Import/Wizard', [
            'modules' => $this->modulesConfig(),
        ]);
    }

    public function history(): InertiaResponse
    {
        $orgId = auth()->user()->organization_id;

        $jobs = ImportJob::query()
            ->where('organization_id', $orgId)
            ->with('user:id,name')
            ->latest()
            ->paginate(20)
            ->through(fn($j) => [
                'id'                => $j->id,
                'module'            => $j->module,
                'original_filename' => $j->original_filename,
                'status'            => $j->status,
                'total_rows'        => $j->total_rows,
                'imported_rows'     => $j->imported_rows,
                'error_rows'        => $j->error_rows,
                'skipped_rows'      => $j->skipped_rows,
                'user'              => $j->user->name,
                'created_at'        => $j->created_at->format('d/m/Y H:i'),
                'has_errors'        => $j->hasErrors(),
            ]);

        return Inertia::render('Import/History', [
            'jobs'    => $jobs,
            'modules' => $this->modulesConfig(),
        ]);
    }

    // =========================================================================
    // API — Upload
    // =========================================================================

    /**
     * POST /api/v1/import/upload
     *
     * Multipart : file, module
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file'   => 'required|file|mimes:csv,xlsx|max:10240', // 10 MB
            'module' => ['required', Rule::in(array_keys($this->modulesConfig()))],
        ]);

        $orgId = auth()->user()->organization_id;

        $job = $this->service->upload(
            $request->file('file'),
            $request->input('module'),
            $orgId,
        );

        // Détecter les colonnes du fichier
        $detectedColumns = $this->service->detectColumns($job);
        $autoMapping     = $this->service->autoDetectMapping($job);
        $availableFields = $this->service->getAvailableFields($job->module);

        // Aperçu des 3 premières lignes
        $preview = $this->getFilePreview($job, 3);

        return response()->json([
            'job_id'          => $job->id,
            'total_rows'      => $job->total_rows,
            'file_size'       => filesize(storage_path('app/private/' . $job->file_path)),
            'detected_columns'=> $detectedColumns,
            'auto_mapping'    => $autoMapping,
            'available_fields'=> $availableFields,
            'preview'         => $preview,
        ], 201);
    }

    // =========================================================================
    // API — Validation
    // =========================================================================

    /**
     * POST /api/v1/import/{jobId}/validate
     *
     * Body : { column_mapping: {...}, options: { skip_header, update_existing } }
     */
    public function validateImport(Request $request, int $jobId): JsonResponse
    {
        $job = ImportJob::findOrFail($jobId);

        $data = $request->validate([
            'column_mapping'           => 'required|array',
            'options'                  => 'array',
            'options.skip_header'      => 'boolean',
            'options.update_existing'  => 'boolean',
        ]);

        $result = $this->service->validate($job, $data['column_mapping'], $data['options'] ?? []);

        return response()->json([
            'valid_rows'  => $result['valid_rows'],
            'error_rows'  => $result['error_rows'],
            'total_rows'  => $job->total_rows,
            'errors'      => $result['errors'],
            'can_import'  => $result['valid_rows'] > 0,
        ]);
    }

    // =========================================================================
    // API — Lancement de l'import
    // =========================================================================

    /**
     * POST /api/v1/import/{jobId}/start
     *
     * Lance l'import asynchrone.
     */
    public function start(int $jobId): JsonResponse
    {
        $job = ImportJob::findOrFail($jobId);

        if ($job->status === 'completed') {
            return response()->json(['message' => 'Déjà importé.'], 409);
        }

        $this->service->import($job);

        return response()->json([
            'message' => 'Import démarré.',
            'job_id'  => $job->id,
            'status'  => 'importing',
        ], 202);
    }

    // =========================================================================
    // API — Statut (polling)
    // =========================================================================

    /**
     * GET /api/v1/import/{jobId}/status
     */
    public function status(int $jobId): JsonResponse
    {
        $job = ImportJob::findOrFail($jobId);

        return response()->json([
            'id'            => $job->id,
            'status'        => $job->status,
            'total_rows'    => $job->total_rows,
            'imported_rows' => $job->imported_rows,
            'skipped_rows'  => $job->skipped_rows,
            'error_rows'    => $job->error_rows,
            'progress'      => $job->progressPercent(),
            'summary'       => $job->import_summary,
            'errors'        => $job->validation_errors,
        ]);
    }

    // =========================================================================
    // API — Template
    // =========================================================================

    /**
     * GET /api/v1/import/template/{module}?format=xlsx|csv
     */
    public function template(Request $request, string $module): StreamedResponse
    {
        $format = $request->query('format', 'xlsx');

        if (! in_array($format, ['xlsx', 'csv'])) {
            abort(422, 'Format invalide. Acceptés : xlsx, csv.');
        }

        return $this->service->downloadTemplate($module, $format);
    }

    // =========================================================================
    // API — Rapport d'erreurs
    // =========================================================================

    /**
     * GET /api/v1/import/{jobId}/error-report
     *
     * Exporte un CSV des lignes en erreur.
     */
    public function errorReport(int $jobId): StreamedResponse
    {
        $job    = ImportJob::findOrFail($jobId);
        $errors = $job->validation_errors ?? [];

        $filename = "erreurs-import-{$job->module}-{$job->id}.csv";

        return response()->streamDownload(function () use ($errors) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, "\xEF\xBB\xBF"); // BOM UTF-8

            fputcsv($handle, ['Ligne', 'Champ', 'Valeur', 'Erreur'], ';');

            foreach ($errors as $error) {
                fputcsv($handle, [
                    $error['row']     ?? '',
                    $error['field']   ?? '',
                    $error['value']   ?? '',
                    $error['message'] ?? '',
                ], ';');
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * DELETE /api/v1/import/{jobId}
     */
    public function destroy(int $jobId): JsonResponse
    {
        $job = ImportJob::findOrFail($jobId);
        $job->delete();

        return response()->json(['message' => 'Import supprimé.']);
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    private function modulesConfig(): array
    {
        return [
            'events'     => ['label' => 'Agenda & Événements', 'icon' => 'calendar'],
            'tasks'      => ['label' => 'Tâches',               'icon' => 'clipboard'],
            'visitors'   => ['label' => 'Visiteurs',            'icon' => 'users'],
            'hr'         => ['label' => 'RH & Employés',        'icon' => 'identification'],
            'contacts'   => ['label' => 'Contacts',             'icon' => 'address-book'],
            'accounting' => ['label' => 'Comptabilité',         'icon' => 'banknotes'],
        ];
    }

    /**
     * Aperçu des premières lignes du fichier (sans mapper).
     */
    private function getFilePreview(ImportJob $job, int $limit): array
    {
        try {
            $fullPath    = storage_path('app/private/' . $job->file_path);
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($fullPath);
            $sheet       = $spreadsheet->getActiveSheet();
            $rows        = [];

            foreach ($sheet->getRowIterator(1, $limit) as $row) {
                $cells = [];
                foreach ($row->getCellIterator() as $cell) {
                    $cells[] = $cell->getFormattedValue();
                }
                $rows[] = $cells;
            }

            return $rows;
        } catch (\Throwable) {
            return [];
        }
    }
}
