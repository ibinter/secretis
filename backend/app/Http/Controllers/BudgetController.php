<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\BudgetAlert;
use App\Models\BudgetLine;
use App\Models\Organization;
use App\Services\BudgetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * BudgetController — Gestion budgétaire SECRETIS ERP
 *
 * Routes Inertia (GET → pages React) + JSON (POST/GET actions métier).
 */
class BudgetController extends Controller
{
    public function __construct(private BudgetService $budgetService)
    {
        $this->middleware('auth');
    }

    // =========================================================================
    // PAGES INERTIA
    // =========================================================================

    /**
     * GET /budget — Liste des budgets
     */
    public function index(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $query = Budget::where('organization_id', $orgId)
            ->with(['approver:id,name', 'creator:id,name'])
            ->latest();

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }
        if ($fy = $request->input('fiscal_year_id')) {
            $query->where('fiscal_year_id', $fy);
        }

        $budgets = $query->paginate(20)->withQueryString();

        // Enrichir chaque budget avec le % d'exécution
        $budgets->getCollection()->transform(function ($b) {
            $actuals = $this->budgetService->getActuals($b);
            $consumed = collect($b->lines ?? [])->sum(fn($l) => $actuals[$l->account_number]['ytd'] ?? 0);
            $b->execution_pct = $b->total_amount > 0
                ? round(($consumed / $b->total_amount) * 100, 1)
                : 0;
            return $b;
        });

        $fiscalYears = \DB::table('fiscal_years')
            ->where('organization_id', $orgId)
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'start_date', 'end_date']);

        return Inertia::render('Budget/BudgetList', [
            'budgets'     => $budgets,
            'fiscalYears' => $fiscalYears,
            'filters'     => $request->only(['status', 'type', 'fiscal_year_id']),
        ]);
    }

    /**
     * GET /budget/create — Formulaire de création
     */
    public function create(Request $request): InertiaResponse
    {
        $orgId = Auth::user()->organization_id;

        $departments = \App\Models\Department::where('organization_id', $orgId)
            ->orderBy('name')->get(['id', 'name']);

        $fiscalYears = \DB::table('fiscal_years')
            ->where('organization_id', $orgId)
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'start_date', 'end_date']);

        // Budget précédent (pour import)
        $previousBudgets = Budget::where('organization_id', $orgId)
            ->whereIn('status', ['active', 'closed'])
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'type', 'fiscal_year_id']);

        return Inertia::render('Budget/BudgetForm', [
            'departments'     => $departments,
            'fiscalYears'     => $fiscalYears,
            'previousBudgets' => $previousBudgets,
        ]);
    }

    /**
     * POST /budget — Créer un budget
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                          => 'required|string|max:255',
            'fiscal_year_id'                => 'nullable|integer',
            'type'                          => 'required|in:operationnel,investissement,projet,departement',
            'notes'                         => 'nullable|string',
            'lines'                         => 'required|array|min:1',
            'lines.*.account_number'        => 'required|string|max:20',
            'lines.*.account_name'          => 'required|string|max:255',
            'lines.*.department_id'         => 'nullable|integer',
            'lines.*.project_id'            => 'nullable|integer',
            'lines.*.description'           => 'nullable|string',
            'lines.*.q1_amount'             => 'required|numeric|min:0',
            'lines.*.q2_amount'             => 'required|numeric|min:0',
            'lines.*.q3_amount'             => 'required|numeric|min:0',
            'lines.*.q4_amount'             => 'required|numeric|min:0',
            'lines.*.is_income'             => 'boolean',
            'lines.*.category'              => 'required|in:personnel,fonctionnement,investissement,impots,autres',
        ]);

        $data['organization_id'] = Auth::user()->organization_id;
        $data['created_by']      = Auth::id();

        $budget = $this->budgetService->createBudget($data);

        return response()->json([
            'message' => 'Budget créé avec succès.',
            'budget'  => $budget->load('lines'),
        ], 201);
    }

    /**
     * GET /budget/{id} — Détail du budget
     */
    public function show(Budget $budget): InertiaResponse
    {
        $this->authorizeOrg($budget);

        return Inertia::render('Budget/BudgetDetail', [
            'budget' => $budget->load(['lines', 'approver:id,name', 'creator:id,name', 'revisions']),
        ]);
    }

    /**
     * GET /budget/{id}/edit — Formulaire d'édition
     */
    public function edit(Budget $budget): InertiaResponse
    {
        $this->authorizeOrg($budget);

        if ($budget->status === 'active') {
            abort(403, 'Un budget actif ne peut pas être modifié directement. Utilisez la révision.');
        }

        $orgId = Auth::user()->organization_id;
        $departments = \App\Models\Department::where('organization_id', $orgId)->orderBy('name')->get(['id', 'name']);
        $fiscalYears = \DB::table('fiscal_years')->where('organization_id', $orgId)->get(['id', 'name']);

        return Inertia::render('Budget/BudgetForm', [
            'budget'      => $budget->load('lines'),
            'departments' => $departments,
            'fiscalYears' => $fiscalYears,
            'editMode'    => true,
        ]);
    }

    /**
     * PUT /budget/{id} — Mise à jour
     */
    public function update(Request $request, Budget $budget): JsonResponse
    {
        $this->authorizeOrg($budget);

        if ($budget->status === 'active') {
            return response()->json(['message' => 'Utilisez la révision pour modifier un budget actif.'], 422);
        }

        $data = $request->validate([
            'name'    => 'sometimes|string|max:255',
            'notes'   => 'nullable|string',
            'type'    => 'sometimes|in:operationnel,investissement,projet,departement',
            'lines'   => 'sometimes|array',
        ]);

        $budget->update($data);

        return response()->json(['message' => 'Budget mis à jour.', 'budget' => $budget->fresh()]);
    }

    /**
     * DELETE /budget/{id}
     */
    public function destroy(Budget $budget): JsonResponse
    {
        $this->authorizeOrg($budget);

        if (in_array($budget->status, ['active', 'approved'])) {
            return response()->json(['message' => 'Impossible de supprimer un budget approuvé ou actif.'], 422);
        }

        $budget->delete();

        return response()->json(['message' => 'Budget supprimé.']);
    }

    // =========================================================================
    // ACTIONS MÉTIER
    // =========================================================================

    /**
     * POST /budget/{id}/approve — Approbation
     */
    public function approve(Budget $budget): JsonResponse
    {
        $this->authorizeOrg($budget);

        $this->budgetService->approveBudget($budget, Auth::user());

        return response()->json(['message' => 'Budget approuvé et activé.', 'budget' => $budget->fresh()]);
    }

    /**
     * POST /budget/{id}/revise — Révision
     */
    public function revise(Request $request, Budget $budget): JsonResponse
    {
        $this->authorizeOrg($budget);

        $data = $request->validate([
            'reason'          => 'required|string|min:10',
            'changes'         => 'required|array|min:1',
            'changes.*.line_id'    => 'required|integer',
            'changes.*.q1_amount'  => 'sometimes|numeric|min:0',
            'changes.*.q2_amount'  => 'sometimes|numeric|min:0',
            'changes.*.q3_amount'  => 'sometimes|numeric|min:0',
            'changes.*.q4_amount'  => 'sometimes|numeric|min:0',
        ]);

        $revision = $this->budgetService->reviseBudget($budget, $data['changes'], $data['reason']);

        return response()->json([
            'message'  => 'Révision enregistrée.',
            'revision' => $revision,
            'budget'   => $budget->fresh()->load('lines'),
        ]);
    }

    /**
     * GET /budget/{id}/variance — Analyse des écarts
     */
    public function variance(Budget $budget): JsonResponse
    {
        $this->authorizeOrg($budget);

        $analysis = $this->budgetService->getVarianceAnalysis($budget);

        return response()->json($analysis);
    }

    /**
     * GET /budget/{id}/forecast — Prévisions
     */
    public function forecast(Budget $budget): JsonResponse
    {
        $this->authorizeOrg($budget);

        $forecast = $this->budgetService->getForecast($budget);

        return response()->json($forecast);
    }

    /**
     * GET /budget/{id}/actuals — Réels comptables
     */
    public function actuals(Budget $budget): JsonResponse
    {
        $this->authorizeOrg($budget);

        $actuals = $this->budgetService->getActuals($budget);

        return response()->json(['actuals' => $actuals]);
    }

    /**
     * POST /budget/{id}/export — Export CSV
     */
    public function export(Budget $budget): mixed
    {
        $this->authorizeOrg($budget);

        $path = $this->budgetService->exportBudgetExcel($budget);

        return Storage::download($path, "budget_{$budget->id}.csv");
    }

    /**
     * POST /budget/import — Import CSV
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
        ]);

        $file = $request->file('file');
        $path = $file->store('budgets/imports');

        $org    = Organization::findOrFail(Auth::user()->organization_id);
        $budget = $this->budgetService->importBudgetFromCsv(Storage::path($path), $org);

        return response()->json([
            'message' => 'Import réussi. ' . $budget->lines->count() . ' lignes importées.',
            'budget'  => $budget->load('lines'),
        ], 201);
    }

    /**
     * GET /budget/dashboard — KPIs globaux
     */
    public function dashboard(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $org   = Organization::findOrFail($user->organization_id);
        $fyId  = $request->input('fiscal_year_id');
        $fyId  = $fyId ? (int) $fyId : null;

        $kpis = $this->budgetService->getBudgetDashboard($org, $fyId);

        $fiscalYears = \DB::table('fiscal_years')
            ->where('organization_id', $org->id)
            ->orderByDesc('start_date')
            ->get(['id', 'name']);

        $activeBudgets = Budget::where('organization_id', $org->id)
            ->whereIn('status', ['active', 'approved'])
            ->when($fyId, fn($q) => $q->where('fiscal_year_id', $fyId))
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'status', 'total_amount']);

        return Inertia::render('Budget/Dashboard', [
            'kpis'         => $kpis,
            'fiscalYears'  => $fiscalYears,
            'activeBudgets'=> $activeBudgets,
            'filters'      => ['fiscal_year_id' => $fyId],
        ]);
    }

    /**
     * GET /budget/{id}/variance-page — Page analyse écarts (Inertia)
     */
    public function variancePage(Budget $budget): InertiaResponse
    {
        $this->authorizeOrg($budget);

        $departments = \App\Models\Department::where('organization_id', Auth::user()->organization_id)
            ->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Budget/VarianceAnalysis', [
            'budget'      => $budget->load(['lines.department']),
            'departments' => $departments,
        ]);
    }

    /**
     * GET /budget/{id}/forecast-page — Page prévisions (Inertia)
     */
    public function forecastPage(Budget $budget): InertiaResponse
    {
        $this->authorizeOrg($budget);

        return Inertia::render('Budget/Forecast', [
            'budget' => $budget->load('lines'),
        ]);
    }

    /**
     * GET /budget/{id}/revise-page — Page révision (Inertia)
     */
    public function revisePage(Budget $budget): InertiaResponse
    {
        $this->authorizeOrg($budget);

        return Inertia::render('Budget/BudgetRevision', [
            'budget'    => $budget->load(['lines.department', 'revisions.revisor']),
        ]);
    }

    /**
     * GET /budget/alerts — Page configuration alertes (Inertia)
     */
    public function alertsConfig(Request $request): InertiaResponse
    {
        $orgId = Auth::user()->organization_id;

        $budgets = Budget::where('organization_id', $orgId)
            ->whereIn('status', ['active', 'approved'])
            ->with(['lines.alerts'])
            ->get();

        $users = \App\Models\User::where('organization_id', $orgId)
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('Budget/AlertsConfig', [
            'budgets' => $budgets,
            'users'   => $users,
        ]);
    }

    /**
     * POST /budget/alerts — Sauvegarder config alertes
     */
    public function saveAlerts(Request $request): JsonResponse
    {
        $data = $request->validate([
            'alerts'                              => 'required|array',
            'alerts.*.budget_line_id'             => 'required|integer|exists:budget_lines,id',
            'alerts.*.alert_type'                 => 'required|in:threshold_50,threshold_80,threshold_100,exceeded',
            'alerts.*.threshold_percent'          => 'required|integer|min:1|max:100',
            'alerts.*.notification_user_ids'      => 'required|array',
            'alerts.*.is_active'                  => 'boolean',
        ]);

        $orgId = Auth::user()->organization_id;

        foreach ($data['alerts'] as $alertData) {
            $line = BudgetLine::find($alertData['budget_line_id']);
            if (! $line) continue;

            $budget = Budget::find($line->budget_id);
            if (! $budget || $budget->organization_id !== $orgId) continue;

            BudgetAlert::updateOrCreate(
                [
                    'budget_line_id' => $alertData['budget_line_id'],
                    'alert_type'     => $alertData['alert_type'],
                ],
                [
                    'organization_id'       => $orgId,
                    'threshold_percent'     => $alertData['threshold_percent'],
                    'notification_user_ids' => $alertData['notification_user_ids'],
                    'is_active'             => $alertData['is_active'] ?? true,
                ]
            );
        }

        return response()->json(['message' => 'Alertes configurées.']);
    }

    /**
     * GET /budget/{id}/variance-pdf — Rapport PDF
     */
    public function variancePdf(Budget $budget): mixed
    {
        $this->authorizeOrg($budget);

        $analysis = $this->budgetService->getVarianceAnalysis($budget);
        $org      = Organization::find($budget->organization_id);

        $pdf = app('dompdf.wrapper');
        $pdf->loadView('budget.variance-report-pdf', [
            'budget'   => $budget,
            'analysis' => $analysis,
            'org'      => $org,
            'date'     => now()->format('d/m/Y'),
        ]);

        return $pdf->download("rapport-ecarts-budget-{$budget->id}.pdf");
    }

    /**
     * POST /budget/{id}/duplicate — Dupliquer un budget
     */
    public function duplicate(Budget $budget): JsonResponse
    {
        $this->authorizeOrg($budget);

        $newBudget = $this->budgetService->createBudget([
            'organization_id' => $budget->organization_id,
            'name'            => $budget->name . ' (copie)',
            'fiscal_year_id'  => $budget->fiscal_year_id,
            'type'            => $budget->type,
            'notes'           => $budget->notes,
            'created_by'      => Auth::id(),
            'lines'           => $budget->lines->map(fn($l) => [
                'account_number' => $l->account_number,
                'account_name'   => $l->account_name,
                'department_id'  => $l->department_id,
                'project_id'     => $l->project_id,
                'description'    => $l->description,
                'q1_amount'      => $l->q1_amount,
                'q2_amount'      => $l->q2_amount,
                'q3_amount'      => $l->q3_amount,
                'q4_amount'      => $l->q4_amount,
                'is_income'      => $l->is_income,
                'category'       => $l->category,
            ])->toArray(),
        ]);

        return response()->json([
            'message' => 'Budget dupliqué.',
            'budget'  => $newBudget,
        ], 201);
    }

    // =========================================================================
    // SÉCURITÉ
    // =========================================================================

    private function authorizeOrg(Budget $budget): void
    {
        if ($budget->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }
    }
}
