<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Jobs\RecalculateProjectHealth;
use App\Models\Project;
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
            ->with(['manager:id,name,avatar_url', 'client:id,name', 'milestones'])
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
            'project'   => $project->load(['manager:id,name', 'client:id,name']),
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
            'date'        => 'required|date',
            'hours'       => 'required|numeric|min:0.25|max:24',
            'description' => 'nullable|string|max:500',
            'is_billable' => 'boolean',
            'hourly_rate' => 'nullable|numeric|min:0',
        ]);

        $timesheet = ProjectTimesheet::create(array_merge($data, [
            'project_id'      => $project->id,
            'user_id'         => Auth::id(),
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

        $query = $project->timesheets()->with(['user:id,name,avatar_url', 'task:id,title']);

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
}
