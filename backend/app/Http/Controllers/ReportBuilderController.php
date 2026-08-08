<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\CustomReport;
use App\Models\CustomReportRun;
use App\Services\ReportBuilderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * ReportBuilderController — CRUD du Report Builder drag-and-drop.
 *
 * Routes web  : index, builder (create/edit), destroy
 * Routes API  : modules, columns, preview, save, run, download, runs
 */
class ReportBuilderController extends Controller
{
    public function __construct(private readonly ReportBuilderService $service) {}

    // =========================================================================
    // Pages Inertia
    // =========================================================================

    public function index(): InertiaResponse
    {
        $org = auth()->user()->organization_id;

        $reports = CustomReport::query()
            ->where(function ($q) use ($org) {
                $q->where('organization_id', $org)
                  ->where(function ($q2) {
                      $q2->where('created_by', auth()->id())
                         ->orWhere('is_shared', true);
                  });
            })
            ->with(['creator:id,name', 'runs' => fn($q) => $q->latest()->limit(1)])
            ->latest()
            ->get()
            ->map(fn($r) => [
                'id'          => $r->id,
                'name'        => $r->name,
                'description' => $r->description,
                'module'      => $r->module,
                'is_shared'   => $r->is_shared,
                'is_template' => $r->is_template,
                'run_count'   => $r->run_count,
                'last_run_at' => $r->last_run_at?->diffForHumans(),
                'created_by'  => $r->creator?->name,
                'is_owner'    => $r->created_by === auth()->id(),
                'is_scheduled'=> ! empty($r->schedule),
            ]);

        // Exécutions récentes (toutes l'organisation)
        $recentRuns = CustomReportRun::query()
            ->whereHas('report', fn($q) => $q->where('organization_id', $org))
            ->with(['report:id,name,module', 'runner:id,name'])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn($run) => [
                'id'          => $run->id,
                'report_name' => $run->report->name,
                'module'      => $run->report->module,
                'format'      => $run->format,
                'status'      => $run->status,
                'row_count'   => $run->row_count,
                'duration_ms' => $run->duration_ms,
                'run_by'      => $run->runner?->name,
                'created_at'  => $run->created_at->format('d/m/Y H:i'),
                'can_download'=> $run->hasFile(),
            ]);

        return Inertia::render('Reports/Index', [
            'reports'    => $reports,
            'recentRuns' => $recentRuns,
            'modules'    => array_map(fn($m) => ['label' => $m['label'], 'icon' => $m['icon']],
                                      $this->service->getAvailableModules()),
        ]);
    }

    public function builder(?int $id = null): InertiaResponse
    {
        $report = null;

        if ($id) {
            $report = CustomReport::findOrFail($id);
            Gate::authorize('update', $report);
        }

        return Inertia::render('Reports/Builder', [
            'report'  => $report,
            'modules' => $this->service->getAvailableModules(),
        ]);
    }

    // =========================================================================
    // API — Configuration
    // =========================================================================

    /**
     * GET /api/v1/report-builder/modules
     */
    public function modules(): JsonResponse
    {
        return response()->json($this->service->getAvailableModules());
    }

    // =========================================================================
    // API — CRUD rapports
    // =========================================================================

    /**
     * POST /api/v1/report-builder/reports
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => 'required|string|max:255',
            'description'  => 'nullable|string|max:1000',
            'module'       => ['required', Rule::in(array_keys($this->service->getAvailableModules()))],
            'columns'      => 'required|array|min:1',
            'columns.*.field'   => 'required|string',
            'columns.*.label'   => 'required|string',
            'columns.*.visible' => 'boolean',
            'columns.*.width'   => 'nullable|integer',
            'filters'      => 'array',
            'sort'         => 'array',
            'group_by'     => 'nullable|array',
            'schedule'     => 'nullable|array',
            'is_shared'    => 'boolean',
            'is_template'  => 'boolean',
        ]);

        $report = CustomReport::create([
            ...$data,
            'organization_id' => auth()->user()->organization_id,
            'created_by'      => auth()->id(),
            'filters'         => $data['filters'] ?? [],
            'sort'            => $data['sort'] ?? [],
        ]);

        return response()->json([
            'message' => 'Rapport enregistré.',
            'report'  => $report,
        ], 201);
    }

    /**
     * PUT /api/v1/report-builder/reports/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $report = CustomReport::findOrFail($id);
        Gate::authorize('update', $report);

        $data = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'columns'     => 'sometimes|array',
            'filters'     => 'array',
            'sort'        => 'array',
            'group_by'    => 'nullable|array',
            'schedule'    => 'nullable|array',
            'is_shared'   => 'boolean',
            'is_template' => 'boolean',
        ]);

        $report->update($data);

        return response()->json(['message' => 'Rapport mis à jour.', 'report' => $report]);
    }

    /**
     * DELETE /api/v1/report-builder/reports/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $report = CustomReport::findOrFail($id);
        Gate::authorize('delete', $report);
        $report->delete();

        return response()->json(['message' => 'Rapport supprimé.']);
    }

    /**
     * POST /api/v1/report-builder/reports/{id}/duplicate
     */
    public function duplicate(int $id): JsonResponse
    {
        // Isolation multi-tenant : on ne duplique qu'un rapport de sa propre organisation.
        $source = CustomReport::where('organization_id', auth()->user()->organization_id)->findOrFail($id);

        $copy = $source->replicate(['run_count', 'last_run_at']);
        $copy->name       = $source->name . ' (copie)';
        $copy->created_by = auth()->id();
        $copy->is_shared  = false;
        $copy->save();

        return response()->json(['message' => 'Rapport dupliqué.', 'report' => $copy], 201);
    }

    // =========================================================================
    // API — Prévisualisation
    // =========================================================================

    /**
     * POST /api/v1/report-builder/preview
     *
     * Body : { module, columns, filters, sort, group_by }
     * Retourne les 10 premières lignes.
     */
    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'module'  => ['required', Rule::in(array_keys($this->service->getAvailableModules()))],
            'columns' => 'required|array',
            'filters' => 'array',
            'sort'    => 'array',
        ]);

        // Créer un rapport temporaire (non persisté)
        $report = new CustomReport($data + [
            'organization_id' => auth()->user()->organization_id,
            'created_by'      => auth()->id(),
            'filters'         => $data['filters'] ?? [],
            'sort'            => $data['sort']    ?? [],
            'name'            => 'preview',
        ]);

        $result = $this->service->preview($report, limit: 10);

        return response()->json($result);
    }

    // =========================================================================
    // API — Exécution & téléchargement
    // =========================================================================

    /**
     * POST /api/v1/report-builder/reports/{id}/run
     *
     * Body : { format: pdf|excel|csv|json }
     */
    public function run(Request $request, int $id): JsonResponse
    {
        $report = CustomReport::findOrFail($id);

        $data = $request->validate([
            'format' => ['required', Rule::in(['pdf', 'excel', 'csv', 'json'])],
        ]);

        $run = $this->service->run($report, $data['format']);

        return response()->json([
            'message' => 'Génération en cours...',
            'run_id'  => $run->id,
            'status'  => $run->status,
        ], 202);
    }

    /**
     * GET /api/v1/report-builder/runs/{runId}/status
     *
     * Polling du statut depuis le front.
     */
    public function runStatus(int $runId): JsonResponse
    {
        // Isolation multi-tenant : le run doit appartenir à un rapport de l'org courante.
        $run = CustomReportRun::whereHas('report', fn ($q) => $q->where('organization_id', auth()->user()->organization_id))
            ->findOrFail($runId);

        return response()->json([
            'id'          => $run->id,
            'status'      => $run->status,
            'row_count'   => $run->row_count,
            'duration_ms' => $run->duration_ms,
            'error'       => $run->error_message,
            'can_download'=> $run->hasFile(),
            'format'      => $run->format,
        ]);
    }

    /**
     * GET /api/v1/report-builder/runs/{runId}/download
     */
    public function download(int $runId): StreamedResponse|\Illuminate\Http\Response
    {
        // Isolation multi-tenant : interdit de télécharger l'export d'une autre organisation.
        $run = CustomReportRun::whereHas('report', fn ($q) => $q->where('organization_id', auth()->user()->organization_id))
            ->findOrFail($runId);

        if (! $run->isCompleted() || ! $run->hasFile()) {
            abort(404, 'Fichier non disponible.');
        }

        $mimeTypes = [
            'excel' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv'   => 'text/csv; charset=UTF-8',
            'pdf'   => 'application/pdf',
            'json'  => 'application/json',
        ];

        $extensions = ['excel' => 'xlsx', 'csv' => 'csv', 'pdf' => 'pdf', 'json' => 'json'];
        $reportName = str_replace(' ', '_', $run->report->name);
        $filename   = "{$reportName}_{$run->created_at->format('Ymd_His')}.{$extensions[$run->format]}";

        return Storage::disk('private')->download(
            $run->file_path,
            $filename,
            ['Content-Type' => $mimeTypes[$run->format] ?? 'application/octet-stream']
        );
    }
}
