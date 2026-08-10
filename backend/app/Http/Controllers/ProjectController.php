<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Jobs\RecalculateProjectHealth;
use App\Models\Project;
use App\Models\User;
use App\Models\ProjectMilestone;
use App\Models\ProjectRisk;
use App\Models\ProjectTimesheet;
use App\Models\Task;
use App\Models\TaskDependency;
use App\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function __construct(private readonly ProjectService $projectService) {}

    // ────────────────────────────────────────────────────────────────────────
    //  PAGES INERTIA
    // ────────────────────────────────────────────────────────────────────────

    public function index(): Response
    {
        $org = Auth::user()->organization_id;

        $projects = Project::where('organization_id', $org)
            ->with(['manager:id,name,avatar'])
            ->withCount(['tasks', 'tasks as completed_tasks_count' => fn($q) => $q->where('status', 'completed')])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn($p) => array_merge($p->toArray(), [
                'completion_percent' => $p->completion_percent,
                'health'             => $p->health,
            ]));

        return Inertia::render('Projets/ProjectList', [
            'projects' => $projects,
        ]);
    }

    public function show(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Projets/ProjectDashboard', [
            'project'   => $project->load(['manager:id,name']),
            'dashboard' => $this->projectService->getProjectDashboard($project),
        ]);
    }

    public function gantt(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Projets/GanttView', [
            'project'   => $project->only(['id', 'name', 'start_date', 'end_date', 'color']),
            'ganttData' => $this->projectService->getGanttData($project),
        ]);
    }

    public function timesheetsPage(Project $project): Response
    {
        $this->authorize('view', $project);

        return Inertia::render('Projets/TimesheetView', [
            'project' => $project->only(['id', 'name']),
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  CRUD PROJET (web /projets + API /api/v1/projects)
    // ────────────────────────────────────────────────────────────────────────

    /**
     * POST /projets  |  POST /api/v1/projects
     * Crée un projet dans l'organisation de l'utilisateur courant.
     */
    public function store(Request $request)
    {
        $org  = Auth::user()->organization_id;
        $data = $this->validateProject($request, false);

        $project = Project::create(array_merge($data, [
            'organization_id' => $org,
            'created_by'      => Auth::id(),
        ]));

        if ($this->expectsJson($request)) {
            return response()->json($project, 201);
        }

        return redirect()->route('projets.show', $project->id)
            ->with('success', 'Projet créé avec succès.');
    }

    /**
     * PUT/PATCH /projets/{id}  |  PUT /api/v1/projects/{id}
     */
    public function update(Request $request, $id)
    {
        $project = $this->findOrgProject($id);
        $data    = $this->validateProject($request, true);

        $project->update($data);

        if ($this->expectsJson($request)) {
            return response()->json($project->fresh());
        }

        return redirect()->back()->with('success', 'Projet mis à jour.');
    }

    /**
     * DELETE /projets/{id}  |  DELETE /api/v1/projects/{id}
     */
    public function destroy(Request $request, $id)
    {
        $project = $this->findOrgProject($id);
        $project->delete();

        if ($this->expectsJson($request)) {
            return response()->json(['message' => 'Projet supprimé.']);
        }

        return redirect()->route('projets.index')->with('success', 'Projet supprimé.');
    }

    /** Récupère un projet borné à l'organisation courante (404 sinon). */
    private function findOrgProject($id): Project
    {
        return Project::where('organization_id', Auth::user()->organization_id)
            ->findOrFail($id);
    }

    /** Vrai appel API JSON (et non requête Inertia, qui attend une redirection). */
    private function expectsJson(Request $request): bool
    {
        return $request->wantsJson() && ! $request->header('X-Inertia');
    }

    /**
     * Règles de validation alignées sur les colonnes réelles de la table projects.
     * $partial = true → règles "sometimes" pour update.
     */
    private function validateProject(Request $request, bool $partial): array
    {
        $req = $partial ? 'sometimes|required' : 'required';
        $opt = $partial ? 'sometimes|nullable' : 'nullable';

        return $request->validate([
            'name'            => "$req|string|max:255",
            'code'            => "$opt|string|max:50",
            'description'     => "$opt|string",
            'status'          => "$opt|in:planning,active,on_hold,completed,cancelled",
            'priority'        => "$opt|in:low,medium,high,critical",
            'visibility'      => "$opt|in:private,team,public",
            'start_date'      => "$opt|date",
            'end_date'        => "$opt|date|after_or_equal:start_date",
            'budget'          => "$opt|numeric|min:0",
            'budget_currency' => "$opt|string|size:3",
            'color'           => "$opt|string|max:7",
            'manager_id'      => "$opt|exists:users,id",
            'client_id'       => "$opt|exists:accounting_clients,id",
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  API JSON
    // ────────────────────────────────────────────────────────────────────────

    /** GET /projects/{id}/gantt */
    public function ganttData(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        return response()->json($this->projectService->getGanttData($project));
    }

    /** GET /projects/{id}/dashboard */
    public function dashboard(Project $project): JsonResponse
    {
        $this->authorize('view', $project);
        return response()->json($this->projectService->getProjectDashboard($project));
    }

    // ── Milestones ───────────────────────────────────────────────────────────

    /** POST /projects/{id}/milestones */
    public function storeMilestone(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string',
            'due_date'           => 'required|date',
            'color'              => 'nullable|string|max:7',
            'completion_percent' => 'nullable|integer|min:0|max:100',
        ]);

        $milestone = ProjectMilestone::create(array_merge($data, [
            'project_id'      => $project->id,
            'organization_id' => $project->organization_id,
            'status'          => 'pending',
        ]));

        return response()->json($milestone, 201);
    }

    /** PUT /projects/{id}/milestones/{milestoneId} */
    public function updateMilestone(Request $request, Project $project, ProjectMilestone $milestone): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'name'               => 'sometimes|string|max:255',
            'description'        => 'nullable|string',
            'due_date'           => 'sometimes|date',
            'status'             => 'sometimes|in:pending,in_progress,completed,missed',
            'color'              => 'nullable|string|max:7',
            'completion_percent' => 'nullable|integer|min:0|max:100',
        ]);

        $milestone->update($data);
        RecalculateProjectHealth::dispatch($project)->afterCommit();

        return response()->json($milestone);
    }

    /** DELETE /projects/{id}/milestones/{milestoneId} */
    public function destroyMilestone(Project $project, ProjectMilestone $milestone): JsonResponse
    {
        $this->authorize('update', $project);
        $milestone->delete();
        return response()->json(['message' => 'Milestone supprimé.']);
    }

    // ── Dépendances de tâches ────────────────────────────────────────────────

    /** POST /tasks/{id}/dependencies */
    public function storeDependency(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task->project);

        $data = $request->validate([
            'depends_on_task_id' => 'required|exists:tasks,id',
            'dependency_type'    => 'in:finish_to_start,start_to_start,finish_to_finish',
            'lag_days'           => 'nullable|integer',
        ]);

        if ($this->wouldCreateCycle($task->id, $data['depends_on_task_id'])) {
            return response()->json(['error' => 'Cette dépendance créerait un cycle.'], 422);
        }

        $dep = TaskDependency::firstOrCreate(
            ['task_id' => $task->id, 'depends_on_task_id' => $data['depends_on_task_id']],
            [
                'dependency_type' => $data['dependency_type'] ?? 'finish_to_start',
                'lag_days'        => $data['lag_days'] ?? 0,
            ]
        );

        RecalculateProjectHealth::dispatch($task->project)->afterCommit();

        return response()->json($dep, 201);
    }

    /** DELETE /tasks/{id}/dependencies/{dependencyId} */
    public function destroyDependency(Task $task, TaskDependency $dependency): JsonResponse
    {
        $this->authorize('update', $task->project);
        $dependency->delete();
        RecalculateProjectHealth::dispatch($task->project)->afterCommit();
        return response()->json(['message' => 'Dépendance supprimée.']);
    }

    private function wouldCreateCycle(int $taskId, int $dependsOnId): bool
    {
        $visited = [];
        $queue   = [$dependsOnId];

        while (!empty($queue)) {
            $current = array_shift($queue);
            if ($current === $taskId) return true;
            if (isset($visited[$current])) continue;
            $visited[$current] = true;

            $predecessors = TaskDependency::where('task_id', $current)
                ->pluck('depends_on_task_id')
                ->toArray();
            $queue = array_merge($queue, $predecessors);
        }

        return false;
    }

    // ── Timesheets ───────────────────────────────────────────────────────────

    /** POST /projects/{id}/timesheets */
    public function storeTimesheet(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $data = $request->validate([
            'task_id'     => 'nullable|exists:tasks,id',
            'user_id'     => 'nullable|integer|exists:users,id',
            'date'        => 'required|date',
            'hours'       => 'required|numeric|min:0.25|max:24',
            'description' => 'nullable|string|max:500',
            'is_billable' => 'boolean',
            'hourly_rate' => 'nullable|numeric|min:0',
        ]);

        // Saisir le temps d'un collaborateur n'est permis qu'au chef de projet
        // (ou à un gestionnaire) : sinon la saisie est TOUJOURS imputée à soi-même.
        $targetUserId = Auth::id();

        if (! empty($data['user_id']) && (int) $data['user_id'] !== Auth::id()) {
            $canLogForOthers = $project->manager_id === Auth::id()
                || Auth::user()->hasPermissionForModule('projets', 'manage');

            abort_unless($canLogForOthers, 403, 'Vous ne pouvez saisir du temps que sur votre propre ligne.');

            $sameOrg = User::where('id', $data['user_id'])
                ->where('organization_id', $project->organization_id)
                ->exists();
            abort_unless($sameOrg, 403, 'Collaborateur invalide.');

            $targetUserId = (int) $data['user_id'];
        }

        unset($data['user_id']);

        $timesheet = ProjectTimesheet::create(array_merge($data, [
            'project_id'      => $project->id,
            'user_id'         => $targetUserId,
            'organization_id' => $project->organization_id,
            'is_billable'     => $data['is_billable'] ?? true,
            'hourly_rate'     => $data['hourly_rate'] ?? 0,
        ]));

        $this->projectService->updateBudgetSpent($project);

        return response()->json($timesheet, 201);
    }

    /** GET /projects/{id}/timesheets */
    public function indexTimesheets(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $query = $project->timesheets()->with(['user:id,name,avatar', 'task:id,title']);

        if ($request->filled('start_date')) $query->where('date', '>=', $request->start_date);
        if ($request->filled('end_date'))   $query->where('date', '<=', $request->end_date);
        if ($request->filled('user_id'))    $query->where('user_id', $request->user_id);

        $timesheets = $query->orderByDesc('date')->get();

        $grouped = $timesheets->groupBy(fn($t) => $t->user->name ?? 'Inconnu')
            ->map(fn($entries, $userName) => [
                'user_name'   => $userName,
                'total_hours' => round($entries->sum('hours'), 2),
                'entries'     => $entries->values(),
            ])->values();

        return response()->json([
            'timesheets'      => $grouped,
            'total_hours'     => round($timesheets->sum('hours'), 2),
            'billable_amount' => round($timesheets->where('is_billable', true)
                ->sum(fn($t) => $t->hours * $t->hourly_rate), 2),
        ]);
    }

    // ── Risks ────────────────────────────────────────────────────────────────

    /** GET /projects/{id}/risks */
    public function indexRisks(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $risks = $project->risks()->with('owner:id,name')->orderByRaw("
            CASE probability WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
            CASE impact WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
        ")->get();

        return response()->json($risks);
    }

    /** POST /projects/{id}/risks */
    public function storeRisk(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'probability' => 'required|in:low,medium,high',
            'impact'      => 'required|in:low,medium,high',
            'mitigation'  => 'nullable|string',
            'owner_id'    => 'nullable|exists:users,id',
        ]);

        $risk = ProjectRisk::create(array_merge($data, [
            'project_id' => $project->id,
            'status'     => 'open',
        ]));

        return response()->json($risk->load('owner:id,name'), 201);
    }

    /** PUT /projects/{id}/risks/{riskId} */
    public function updateRisk(Request $request, Project $project, ProjectRisk $risk): JsonResponse
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'probability' => 'sometimes|in:low,medium,high',
            'impact'      => 'sometimes|in:low,medium,high',
            'mitigation'  => 'nullable|string',
            'status'      => 'sometimes|in:open,mitigated,closed',
            'owner_id'    => 'nullable|exists:users,id',
        ]);

        $risk->update($data);

        return response()->json($risk->fresh()->load('owner:id,name'));
    }

    // ── PATCH task dates (drag Gantt) ────────────────────────────────────────

    /** PATCH /tasks/{id}/dates */
    public function updateTaskDates(Request $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task->project);

        $data = $request->validate([
            'start_date' => 'nullable|date',
            'due_date'   => 'nullable|date|after_or_equal:start_date',
            'progress'   => 'nullable|integer|min:0|max:100',
        ]);

        $task->update(array_filter($data, fn($v) => $v !== null));

        RecalculateProjectHealth::dispatch($task->project)->afterCommit();

        return response()->json($task->only(['id', 'start_date', 'due_date', 'progress']));
    }

    // ────────────────────────────────────────────────────────────────────────
    //  ALIAS API (routes api.php → méthodes réelles)
    // ────────────────────────────────────────────────────────────────────────

    /** GET /projects/{id}/risk-matrix → indexRisks */
    public function riskMatrix(Project $project): JsonResponse
    {
        return $this->indexRisks($project);
    }

    /** GET /projects/{id}/timesheets → indexTimesheets */
    public function timesheets(Request $request, Project $project): JsonResponse
    {
        return $this->indexTimesheets($request, $project);
    }
}
