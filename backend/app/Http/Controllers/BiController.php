<?php

namespace App\Http\Controllers;

use App\Models\SavedReport;
use App\Services\BiService;
use App\Services\ReportExportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class BiController extends Controller
{
    // -------------------------------------------------------------------------
    // Page Inertia — Dashboard BI
    // -------------------------------------------------------------------------

    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('BI/Dashboard', [
            'preset' => $request->input('preset', 'month'),
        ]);
    }

    public function kpis(Request $request): JsonResponse
    {
        [$start, $end] = $this->parsePeriod($request);
        $orgId = $this->orgId();

        try {
            return response()->json([
                'correspondence' => $this->bi->getCorrespondenceAnalytics($orgId, $start, $end),
                'tasks'          => $this->bi->getTaskAnalytics($orgId, $start, $end),
                'meetings'       => $this->bi->getMeetingAnalytics($orgId, $start, $end),
                'hr'             => $this->bi->getHrAnalytics($orgId, $start, $end),
            ]);
        } catch (\Throwable) {
            return response()->json(['data' => [], 'error' => 'Analytics indisponibles.']);
        }
    }


    public function __construct(
        private readonly BiService           $bi,
        private readonly ReportExportService $exporter
    ) {}

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function orgId(): int
    {
        return Auth::user()->organization_id;
    }

    private function parsePeriod(Request $request): array
    {
        $preset = $request->input('preset', 'month');
        $now    = now();

        return match ($preset) {
            'today'   => [$now->copy()->startOfDay(),     $now->copy()->endOfDay()],
            'week'    => [$now->copy()->startOfWeek(),    $now->copy()->endOfWeek()],
            'month'   => [$now->copy()->startOfMonth(),   $now->copy()->endOfMonth()],
            'quarter' => [$now->copy()->firstOfQuarter(), $now->copy()->lastOfQuarter()],
            'year'    => [$now->copy()->startOfYear(),    $now->copy()->endOfYear()],
            'custom'  => [
                Carbon::parse($request->input('start', $now->copy()->subMonth())),
                Carbon::parse($request->input('end',   $now)),
            ],
            default   => [$now->copy()->startOfMonth(),   $now->copy()->endOfMonth()],
        };
    }

    // -------------------------------------------------------------------------
    // Analytics par module
    // -------------------------------------------------------------------------

    public function correspondence(Request $request): JsonResponse
    {
        [$start, $end] = $this->parsePeriod($request);
        return response()->json($this->bi->getCorrespondenceAnalytics($this->orgId(), $start, $end));
    }

    public function tasks(Request $request): JsonResponse
    {
        [$start, $end] = $this->parsePeriod($request);
        return response()->json($this->bi->getTaskAnalytics($this->orgId(), $start, $end));
    }

    public function meetings(Request $request): JsonResponse
    {
        [$start, $end] = $this->parsePeriod($request);
        return response()->json($this->bi->getMeetingAnalytics($this->orgId(), $start, $end));
    }

    public function hr(Request $request): JsonResponse
    {
        [$start, $end] = $this->parsePeriod($request);
        return response()->json($this->bi->getHrAnalytics($this->orgId(), $start, $end));
    }

    public function visitors(Request $request): JsonResponse
    {
        [$start, $end] = $this->parsePeriod($request);
        return response()->json($this->bi->getVisitorAnalytics($this->orgId(), $start, $end));
    }

    public function accounting(Request $request): JsonResponse
    {
        [$start, $end] = $this->parsePeriod($request);
        return response()->json($this->bi->getAccountingAnalytics($this->orgId(), $start, $end));
    }

    // -------------------------------------------------------------------------
    // Rapport personnalisé
    // -------------------------------------------------------------------------

    public function custom(Request $request): JsonResponse
    {
        $request->validate([
            'module'      => 'required|string|in:correspondence,tasks,meetings,hr,visitors,accounting',
            'metrics'     => 'nullable|array',
            'dimensions'  => 'nullable|array',
            'filters'     => 'nullable|array',
            'period'      => 'nullable|array',
            'granularity' => 'nullable|string|in:hour,day,week,month',
            'save'        => 'nullable|boolean',
            'name'        => 'nullable|string|max:255',
        ]);

        $config = $request->only(['module', 'metrics', 'dimensions', 'filters', 'period', 'granularity']);
        $data   = $this->bi->buildCustomReport($this->orgId(), $config);

        // Sauvegarder à la volée si demandé
        if ($request->boolean('save')) {
            SavedReport::create([
                'organization_id' => $this->orgId(),
                'name'            => $request->input('name', 'Rapport ' . now()->format('d/m/Y H:i')),
                'config'          => $config,
                'is_public'       => false,
                'created_by'      => Auth::id(),
            ]);
        }

        return response()->json($data);
    }

    // -------------------------------------------------------------------------
    // Rapports sauvegardés
    // -------------------------------------------------------------------------

    public function listReports(Request $request): JsonResponse
    {
        $reports = SavedReport::forOrganization($this->orgId())
            ->with('creator:id,first_name,last_name')
            ->orderByDesc('updated_at')
            ->paginate($request->input('per_page', 20));

        return response()->json($reports);
    }

    public function storeReport(Request $request): JsonResponse
    {
        $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'config'      => 'required|array',
            'is_public'   => 'nullable|boolean',
            'schedule'    => 'nullable|string|max:100',
        ]);

        $report = SavedReport::create([
            'organization_id' => $this->orgId(),
            'name'            => $request->name,
            'description'     => $request->description,
            'config'          => $request->config,
            'is_public'       => $request->boolean('is_public'),
            'schedule'        => $request->schedule,
            'created_by'      => Auth::id(),
        ]);

        return response()->json($report, 201);
    }

    public function updateReport(Request $request, int $id): JsonResponse
    {
        $report = SavedReport::forOrganization($this->orgId())->findOrFail($id);

        $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'config'      => 'sometimes|array',
            'is_public'   => 'nullable|boolean',
            'schedule'    => 'nullable|string|max:100',
        ]);

        $report->update($request->only(['name', 'description', 'config', 'is_public', 'schedule']));

        return response()->json($report);
    }

    public function destroyReport(int $id): JsonResponse
    {
        $report = SavedReport::forOrganization($this->orgId())->findOrFail($id);
        $report->delete();

        return response()->json(['message' => 'Rapport supprimé.']);
    }

    public function runReport(int $id): JsonResponse
    {
        $report = SavedReport::forOrganization($this->orgId())->findOrFail($id);
        $data   = $report->run();

        return response()->json([
            'report' => $report,
            'data'   => $data,
        ]);
    }

    // -------------------------------------------------------------------------
    // Export
    // -------------------------------------------------------------------------

    public function export(Request $request): Response
    {
        $request->validate([
            'format'    => 'required|string|in:pdf,excel,csv',
            'report_id' => 'nullable|integer|exists:saved_reports,id',
            'module'    => 'nullable|string',
            'config'    => 'nullable|array',
        ]);

        // Charger ou générer les données
        if ($request->filled('report_id')) {
            $report = SavedReport::forOrganization($this->orgId())->findOrFail($request->report_id);
            $data   = $report->run();
        } else {
            $config = $request->input('config', []);
            $data   = $this->bi->buildCustomReport($this->orgId(), $config);
            $report = new SavedReport([
                'name'   => 'Export ' . now()->format('d/m/Y H:i'),
                'config' => $config,
            ]);
        }

        return match ($request->format) {
            'pdf'   => $this->exporter->downloadPdf($data, $report),
            'excel' => $this->exporter->downloadExcel($data, $report),
            'csv'   => $this->exporter->downloadCsv($data),
            default => abort(400, 'Format non supporté.'),
        };
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
