<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\Task;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * TaskApiController — API Tâches v1
 *
 * Endpoints :
 *  GET    /api/v1/tasks              → Liste paginée
 *  POST   /api/v1/tasks              → Créer
 *  PUT    /api/v1/tasks/{id}         → Modifier
 *  PUT    /api/v1/tasks/{id}/status  → Changer statut
 *  DELETE /api/v1/tasks/{id}         → Supprimer
 *
 * Middlewares (routes/api.php) : auth:sanctum, tenant, ensureLicenseValid
 */
class TaskApiController extends ApiController
{
    public function __construct(private readonly TaskService $taskService) {}

    // -------------------------------------------------------------------------
    // GET /tasks
    // -------------------------------------------------------------------------

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'project_id'  => ['nullable', 'uuid'],
            'status'      => ['nullable', 'in:todo,in_progress,review,done,cancelled'],
            'assignee_id' => ['nullable', 'integer'],
            'priority'    => ['nullable', 'in:low,normal,high,urgent'],
            'per_page'    => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $org = $request->user()->organization_id;

        $query = Task::forOrganization($org)
                     ->rootTasks()
                     ->with(['assignees', 'creator', 'project'])
                     ->withCount('subtasks');

        if ($request->filled('project_id')) {
            $query->byProject($request->input('project_id'));
        }
        if ($request->filled('status')) {
            $query->byStatus($request->input('status'));
        }
        if ($request->filled('priority')) {
            $query->byPriority($request->input('priority'));
        }
        if ($request->filled('assignee_id')) {
            $query->assignedTo($request->input('assignee_id'));
        }

        $paginator = $query->orderBy('position')->orderByDesc('created_at')
                           ->paginate($request->integer('per_page', 25));

        return $this->paginated($paginator, 'Tâches récupérées.', [
            'overdue_count' => Task::forOrganization($org)->overdue()->count(),
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /tasks
    // -------------------------------------------------------------------------

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'        => ['required', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'project_id'   => ['nullable', 'uuid', 'exists:projects,id'],
            'parent_id'    => ['nullable', 'uuid', 'exists:tasks,id'],
            'priority'     => ['nullable', 'in:low,normal,high,urgent'],
            'due_date'     => ['nullable', 'date', 'after_or_equal:today'],
            'assignee_ids' => ['nullable', 'array'],
            'assignee_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $data['organization_id'] = $request->user()->organization_id;
        $data['created_by']      = $request->user()->id;

        $task = $this->taskService->createTask($data, $data['assignee_ids'] ?? []);

        return $this->created(
            $task->load(['assignees', 'creator', 'project']),
            'Tâche créée avec succès.',
        );
    }

    // -------------------------------------------------------------------------
    // PUT /tasks/{id}
    // -------------------------------------------------------------------------

    public function update(Request $request, string $id): JsonResponse
    {
        $task = $this->findForOrg($id, $request->user()->organization_id);
        if (! $task) {
            return $this->notFound('Tâche');
        }

        $data = $request->validate([
            'title'        => ['sometimes', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'priority'     => ['nullable', 'in:low,normal,high,urgent'],
            'due_date'     => ['nullable', 'date'],
            'assignee_ids' => ['nullable', 'array'],
            'assignee_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $task = $this->taskService->updateTask($task, $data, $data['assignee_ids'] ?? null);

        return $this->success($task->load(['assignees', 'creator']), 'Tâche mise à jour.');
    }

    // -------------------------------------------------------------------------
    // PUT /tasks/{id}/status
    // -------------------------------------------------------------------------

    /**
     * Applique la machine à états :
     * todo → in_progress | cancelled
     * in_progress → review | todo | cancelled
     * review → done | in_progress | cancelled
     * done → in_progress
     * cancelled → todo
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $task = $this->findForOrg($id, $request->user()->organization_id);
        if (! $task) {
            return $this->notFound('Tâche');
        }

        $data = $request->validate([
            'status' => ['required', 'in:todo,in_progress,review,done,cancelled'],
        ]);

        if (! $task->canTransitionTo($data['status'])) {
            return $this->error(
                "Transition de statut non autorisée : {$task->status} → {$data['status']}",
                422,
                'SEC-050',
            );
        }

        $task = $this->taskService->changeStatus($task, $data['status'], $request->user()->id);

        return $this->success($task->fresh(['assignees']), 'Statut mis à jour.');
    }

    // -------------------------------------------------------------------------
    // DELETE /tasks/{id}
    // -------------------------------------------------------------------------

    public function destroy(Request $request, string $id): JsonResponse
    {
        $task = $this->findForOrg($id, $request->user()->organization_id);
        if (! $task) {
            return $this->notFound('Tâche');
        }

        $task->delete();

        return $this->noContent('Tâche supprimée.');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function findForOrg(string $id, string $organizationId): ?Task
    {
        return Task::forOrganization($organizationId)
                   ->with(['assignees', 'creator', 'project', 'subtasks'])
                   ->find($id);
    }
}
