<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TaskApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = Auth::user();
        $query = Task::forOrganization($user->organization_id)
            ->rootTasks()
            ->with(['assignees:id,name,avatar', 'project:id,name,color', 'subtasks:id,parent_id,status'])
            ->orderBy('position');

        if ($status = $request->query('status')) {
            $query->byStatus($status);
        }
        if ($priority = $request->query('priority')) {
            $query->byPriority($priority);
        }
        if ($assignee = $request->query('assignee')) {
            $query->assignedTo($assignee);
        }
        if ($project = $request->query('project_id')) {
            $query->byProject($project);
        }
        if ($search = $request->query('search')) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        $tasks = $query->paginate($request->query('per_page', 20));

        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'priority'       => ['required', 'in:low,normal,high,urgent'],
            'status'         => ['nullable', 'in:todo,in_progress,review,done,cancelled'],
            'project_id'     => ['nullable', 'uuid', 'exists:projects,id'],
            'due_date'       => ['nullable', 'date'],
            'assignee_ids'   => ['nullable', 'array'],
            'assignee_ids.*' => ['uuid', 'exists:users,id'],
            'parent_id'      => ['nullable', 'uuid', 'exists:tasks,id'],
        ]);

        $user = Auth::user();

        $task = Task::create([
            'organization_id' => $user->organization_id,
            'title'           => $data['title'],
            'description'     => $data['description'] ?? null,
            'priority'        => $data['priority'],
            'status'          => $data['status'] ?? 'todo',
            'project_id'      => $data['project_id'] ?? null,
            'due_date'        => $data['due_date'] ?? null,
            'created_by'      => $user->id,
            'parent_id'       => $data['parent_id'] ?? null,
            'position'        => Task::forOrganization($user->organization_id)
                ->where('status', $data['status'] ?? 'todo')
                ->max('position') + 1,
        ]);

        if (! empty($data['assignee_ids'])) {
            $task->assignees()->attach(
                collect($data['assignee_ids'])->mapWithKeys(fn ($id) => [
                    $id => ['assigned_at' => now(), 'assigned_by' => $user->id],
                ])->all()
            );
        }

        $task->load(['assignees:id,name,avatar', 'project:id,name,color']);

        return response()->json([
            'message' => 'Tâche créée.',
            'task'    => $task,
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)
            ->with(['assignees:id,name,avatar', 'project:id,name,color', 'subtasks', 'creator:id,name'])
            ->findOrFail($id);

        return response()->json(['data' => $task]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)->findOrFail($id);

        $data = $request->validate([
            'title'          => ['sometimes', 'required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'priority'       => ['sometimes', 'in:low,normal,high,urgent'],
            'status'         => ['sometimes', 'in:todo,in_progress,review,done,cancelled'],
            'due_date'       => ['nullable', 'date'],
            'assignee_ids'   => ['nullable', 'array'],
            'assignee_ids.*' => ['uuid', 'exists:users,id'],
        ]);

        $task->update(array_intersect_key($data, array_flip([
            'title', 'description', 'priority', 'status', 'due_date',
        ])));

        if (array_key_exists('assignee_ids', $data)) {
            $pivot = collect($data['assignee_ids'])->mapWithKeys(fn ($uid) => [
                $uid => ['assigned_at' => now(), 'assigned_by' => $user->id],
            ])->all();
            $task->assignees()->sync($pivot);
        }

        return response()->json([
            'message' => 'Tâche mise à jour.',
            'task'    => $task->fresh(['assignees:id,name,avatar', 'project:id,name,color']),
        ]);
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)->findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:todo,in_progress,review,done,cancelled'],
        ]);

        if (! $task->canTransitionTo($data['status'])) {
            return response()->json([
                'message' => "Transition vers '{$data['status']}' non autorisée depuis '{$task->status}'.",
            ], 422);
        }

        $task->update(['status' => $data['status']]);

        return response()->json([
            'message' => 'Statut mis à jour.',
            'task'    => $task->fresh(),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)->findOrFail($id);
        $task->delete();

        return response()->json(['message' => 'Tâche supprimée.']);
    }

    public function complete(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)->findOrFail($id);
        $task->update(['status' => 'done', 'completed_at' => now()]);

        return response()->json(['message' => 'Tâche marquée comme terminée.', 'task' => $task->fresh()]);
    }

    public function kanban(Request $request): JsonResponse
    {
        $user  = Auth::user();
        $query = Task::forOrganization($user->organization_id)
            ->rootTasks()
            ->with(['assignees:id,name,avatar', 'project:id,name,color', 'subtasks:id,parent_id,status'])
            ->orderBy('position');

        if ($priority = $request->query('priority')) {
            $query->byPriority($priority);
        }
        if ($assignee = $request->query('assignee')) {
            $query->assignedTo($assignee);
        }
        if ($project = $request->query('project_id')) {
            $query->byProject($project);
        }
        if ($search = $request->query('search')) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        $byStatus = $query->get()->groupBy('status');

        $statuses = ['todo', 'in_progress', 'review', 'done', 'cancelled'];
        $result   = [];
        foreach ($statuses as $s) {
            $result[$s] = $byStatus->get($s, collect())->values();
        }

        return response()->json(['data' => $result]);
    }

    public function myTasks(Request $request): JsonResponse
    {
        $user = Auth::user();

        $tasks = Task::forOrganization($user->organization_id)
            ->assignedTo($user->id)
            ->rootTasks()
            ->with(['assignees:id,name,avatar', 'project:id,name,color'])
            ->orderBy('position')
            ->get();

        return response()->json(['data' => $tasks]);
    }
}
