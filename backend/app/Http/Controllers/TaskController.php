<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TaskController extends Controller
{
    public function __construct(private readonly TaskService $taskService)
    {
        $this->middleware('auth');
    }

    // -------------------------------------------------------------------------
    // index — Liste des tâches avec filtres
    // -------------------------------------------------------------------------

    /**
     * Retourne la liste paginée des tâches.
     *
     * Filtres supportés :
     *   - status     : todo | in_progress | review | done | cancelled
     *   - priority   : low | normal | high | urgent
     *   - assignee   : UUID utilisateur
     *   - project_id : UUID projet
     *   - due_from   : YYYY-MM-DD
     *   - due_to     : YYYY-MM-DD
     *   - overdue    : boolean
     *   - search     : recherche dans le titre
     *   - view       : kanban | list (affecte la réponse côté Inertia)
     */
    public function index(Request $request): InertiaResponse
    {
        try {
        $user  = Auth::user();
        $query = Task::forOrganization($user->organization_id)
            ->rootTasks()  // Pas les sous-tâches dans la liste principale
            ->with([
                'assignees:id,name,avatar',
                'project:id,name,color',
                'subtasks:id,parent_id,status',
            ])
            ->orderBy('position');

        // Filtre statut
        if ($status = $request->input('status')) {
            $query->byStatus($status);
        }

        // Filtre priorité
        if ($priority = $request->input('priority')) {
            $query->byPriority($priority);
        }

        // Filtre assigné
        if ($assigneeId = $request->input('assignee')) {
            $query->assignedTo($assigneeId);
        }

        // Filtre projet
        if ($projectId = $request->input('project_id')) {
            $query->byProject($projectId);
        }

        // Filtre dates d'échéance
        if ($from = $request->input('due_from')) {
            $query->where('due_date', '>=', $from);
        }
        if ($to = $request->input('due_to')) {
            $query->where('due_date', '<=', $to);
        }

        // Filtre tâches en retard
        if ($request->boolean('overdue')) {
            $query->overdue();
        }

        // Recherche texte
        if ($search = $request->input('search')) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        // Vue Kanban : regrouper par statut sans pagination
        if ($request->input('view') === 'kanban') {
            $tasks = $query->get()->groupBy('status');
            return Inertia::render('Taches/Kanban', [
                'tasksByStatus' => $tasks,
                'filters'       => $request->only(['priority', 'assignee', 'project_id', 'due_from', 'due_to', 'search']),
            ]);
        }

        // Vue liste : paginée
        $tasks = $query->paginate($request->input('per_page', 20))
            ->withQueryString()
            ->through(fn($task) => $this->formatTask($task));

        return Inertia::render('Taches/Liste', [
            'tasks'   => $tasks,
            'filters' => $request->only(['status', 'priority', 'assignee', 'project_id', 'due_from', 'due_to', 'search', 'overdue']),
        ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('TaskController::index: ' . $e->getMessage());
            $emptyPage = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 20);
            return Inertia::render('Taches/Liste', [
                'tasks'   => $emptyPage,
                'filters' => [],
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // store — Créer une tâche
    // -------------------------------------------------------------------------

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string',
            'priority'        => 'required|in:low,normal,high,urgent',
            'status'          => 'nullable|in:todo,in_progress,review,done,cancelled',
            'project_id'      => 'nullable|uuid|exists:projects,id',
            'due_date'        => 'nullable|date',
            'assignee_ids'    => 'nullable|array',
            'assignee_ids.*'  => 'uuid|exists:users,id',
            'observer_ids'    => 'nullable|array',
            'observer_ids.*'  => 'uuid|exists:users,id',
            'parent_id'       => 'nullable|uuid|exists:tasks,id',
            'subtasks'        => 'nullable|array',
            'subtasks.*.title'=> 'required|string|max:255',
        ]);

        $task = $this->taskService->createTask($data, Auth::user());

        return response()->json([
            'message' => 'Tâche créée avec succès.',
            'task'    => $this->formatTask($task),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // show — Détail d'une tâche
    // -------------------------------------------------------------------------

    public function show(string $id): InertiaResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)
            ->with([
                'assignees:id,name,avatar,email',
                'observers:id,name,avatar',
                'project:id,name,color',
                'creator:id,name,avatar',
                'parent:id,title',
                'subtasks.assignees:id,name,avatar',
                'comments.user:id,name,avatar',
                'history.user:id,name,avatar',
                'meeting:id,title',
            ])
            ->findOrFail($id);

        return Inertia::render('Taches/Detail', [
            'task'    => $task,
            'canEdit' => $user->id === $task->created_by || $task->assignees->contains($user->id),
        ]);
    }

    // -------------------------------------------------------------------------
    // update — Modifier une tâche
    // -------------------------------------------------------------------------

    public function update(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)->findOrFail($id);

        $data = $request->validate([
            'title'          => 'sometimes|string|max:255',
            'description'    => 'nullable|string',
            'priority'       => 'sometimes|in:low,normal,high,urgent',
            'due_date'       => 'nullable|date',
            'project_id'     => 'nullable|uuid|exists:projects,id',
            'assignee_ids'   => 'nullable|array',
            'assignee_ids.*' => 'uuid|exists:users,id',
            'observer_ids'   => 'nullable|array',
            'observer_ids.*' => 'uuid|exists:users,id',
        ]);

        // Sync assignés si fournis
        if (isset($data['assignee_ids'])) {
            $task->assignees()->sync(
                collect($data['assignee_ids'])->mapWithKeys(fn($uid) => [
                    $uid => ['assigned_at' => now(), 'assigned_by' => $user->id],
                ])->all()
            );
            unset($data['assignee_ids']);
        }

        // Sync observateurs si fournis
        if (isset($data['observer_ids'])) {
            $task->observers()->sync($data['observer_ids']);
            unset($data['observer_ids']);
        }

        $task->update($data);

        return response()->json(['message' => 'Tâche mise à jour.', 'task' => $this->formatTask($task->fresh())]);
    }

    // -------------------------------------------------------------------------
    // destroy — Supprimer une tâche
    // -------------------------------------------------------------------------

    public function destroy(string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)->findOrFail($id);

        $this->authorize('delete', $task);
        $task->delete();

        return response()->json(['message' => 'Tâche supprimée.']);
    }

    // -------------------------------------------------------------------------
    // changeStatus — Workflow de statut
    // -------------------------------------------------------------------------

    public function changeStatus(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)->findOrFail($id);

        $data = $request->validate([
            'status' => 'required|in:todo,in_progress,review,done,cancelled',
        ]);

        try {
            $this->taskService->changeStatus($task, $data['status'], $user);
            return response()->json(['message' => 'Statut mis à jour.', 'task' => $this->formatTask($task->fresh())]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // -------------------------------------------------------------------------
    // reorder — Réordonner les tâches Kanban (drag & drop)
    // -------------------------------------------------------------------------

    /**
     * Reçoit un tableau de positions après un drag & drop.
     *
     * Body attendu :
     * {
     *   "tasks": [
     *     { "id": "uuid", "status": "in_progress", "position": 0 },
     *     { "id": "uuid", "status": "in_progress", "position": 1 },
     *     ...
     *   ]
     * }
     */
    public function reorder(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'tasks'            => 'required|array|min:1',
            'tasks.*.id'       => 'required|uuid',
            'tasks.*.status'   => 'required|in:todo,in_progress,review,done,cancelled',
            'tasks.*.position' => 'required|integer|min:0',
        ]);

        // Vérifier l'ownership (toutes les tâches appartiennent à cette org)
        $ids = collect($data['tasks'])->pluck('id');
        $count = Task::forOrganization($user->organization_id)
            ->whereIn('id', $ids)
            ->count();

        if ($count !== $ids->count()) {
            return response()->json(['message' => 'Accès non autorisé à certaines tâches.'], 403);
        }

        // Mise à jour en batch
        foreach ($data['tasks'] as $item) {
            Task::where('id', $item['id'])->update([
                'status'   => $item['status'],
                'position' => $item['position'],
            ]);
        }

        return response()->json(['message' => 'Ordre mis à jour.']);
    }

    // -------------------------------------------------------------------------
    // addComment — Ajouter un commentaire
    // -------------------------------------------------------------------------

    public function addComment(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)->findOrFail($id);

        $data = $request->validate([
            'content'      => 'required|string|max:5000',
            'attachment'   => 'nullable|file|max:10240', // 10 MB max
        ]);

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $file           = $request->file('attachment');
            $attachmentPath = $file->store("tasks/{$task->id}/comments", 'local');
        }

        $comment = TaskComment::create([
            'task_id'         => $task->id,
            'user_id'         => $user->id,
            'content'         => $data['content'],
            'attachment_path' => $attachmentPath,
            'attachment_name' => $attachmentPath ? $request->file('attachment')->getClientOriginalName() : null,
        ]);

        return response()->json([
            'message' => 'Commentaire ajouté.',
            'comment' => $comment->load('user:id,name,avatar'),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // bulkAssign — Assigner plusieurs tâches à un utilisateur
    // -------------------------------------------------------------------------

    public function bulkAssign(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'task_ids'      => 'required|array|min:1',
            'task_ids.*'    => 'uuid',
            'assignee_id'   => 'required|uuid|exists:users,id',
        ]);

        // Vérifier que les tâches appartiennent à cette organisation
        $tasks = Task::forOrganization($user->organization_id)
            ->whereIn('id', $data['task_ids'])
            ->get();

        if ($tasks->count() !== count($data['task_ids'])) {
            return response()->json(['message' => 'Certaines tâches sont introuvables.'], 404);
        }

        $assignee = User::where('organization_id', $user->organization_id)
            ->findOrFail($data['assignee_id']);

        foreach ($tasks as $task) {
            $task->assignees()->syncWithoutDetaching([
                $assignee->id => ['assigned_at' => now(), 'assigned_by' => $user->id],
            ]);
        }

        return response()->json([
            'message' => "{$tasks->count()} tâche(s) assignée(s) à {$assignee->name}.",
        ]);
    }

    // -------------------------------------------------------------------------
    // uploadAttachment — Upload pièce jointe
    // -------------------------------------------------------------------------

    public function uploadAttachment(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        $task = Task::forOrganization($user->organization_id)->findOrFail($id);

        $request->validate([
            'file' => 'required|file|max:20480', // 20 MB max
        ]);

        $file     = $request->file('file');
        $path     = $file->store("tasks/{$task->id}/attachments", 'local');
        $fileName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $size     = $file->getSize();

        $attachments   = $task->attachments ?? [];
        $attachments[] = [
            'name'       => $fileName,
            'path'       => $path,
            'size'       => $size,
            'mime'       => $mimeType,
            'uploaded_by'=> $user->id,
            'uploaded_at'=> now()->toIso8601String(),
        ];

        $task->update(['attachments' => $attachments]);

        return response()->json([
            'message'     => 'Fichier joint avec succès.',
            'attachments' => $attachments,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helper — Format de sortie d'une tâche
    // -------------------------------------------------------------------------

    private function formatTask(Task $task): array
    {
        return [
            'id'                  => $task->id,
            'title'               => $task->title,
            'description'         => $task->description,
            'status'              => $task->status,
            'priority'            => $task->priority,
            'due_date'            => $task->due_date?->toDateString(),
            'is_overdue'          => $task->is_overdue,
            'days_overdue'        => $task->days_overdue,
            'position'            => $task->position,
            'assignees'           => $task->assignees ?? [],
            'project'             => $task->project,
            'subtasks_count'      => $task->subtasks?->count() ?? 0,
            'subtasks_progress'   => $task->subtasks_progress,
            'attachments_count'   => count($task->attachments ?? []),
            'allowed_transitions' => $task->allowedTransitions(),
            'created_at'          => $task->created_at,
        ];
    }

    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => []]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => 'Taches']);
    }
}
