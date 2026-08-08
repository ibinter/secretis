<?php

namespace App\Http\Controllers;

use App\Models\Deliberation;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DeliberationController extends Controller
{
    public function index(Request $request): Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $query = Deliberation::where('organization_id', $orgId)
            ->with(['responsible:id,name', 'creator:id,name', 'meeting:id,title'])
            ->orderByDesc('created_at');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->input('search')) {
            $like = '%' . addcslashes($search, '%_') . '%';
            $query->where(fn ($q) =>
                $q->where('title', 'ilike', $like)
                  ->orWhere('decision', 'ilike', $like)
                  ->orWhere('reference', 'ilike', $like)
            );
        }

        $deliberations = $query->paginate(20)->withQueryString();

        $stats = [
            'total'       => Deliberation::where('organization_id', $orgId)->count(),
            'pending'     => Deliberation::where('organization_id', $orgId)->where('status', 'pending')->count(),
            'in_progress' => Deliberation::where('organization_id', $orgId)->where('status', 'in_progress')->count(),
            'done'        => Deliberation::where('organization_id', $orgId)->where('status', 'done')->count(),
        ];

        return Inertia::render('Deliberations/Index', [
            'deliberations' => $deliberations,
            'stats'         => $stats,
            'filters'       => $request->only(['status', 'search']),
            'users'         => User::where('organization_id', $orgId)->select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function create(): Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        return Inertia::render('Deliberations/Create', [
            'users' => User::where('organization_id', $orgId)->select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'title'           => ['required', 'string', 'max:255'],
            'body'            => ['nullable', 'string'],
            'decision'        => ['nullable', 'string'],
            'action_required' => ['nullable', 'string'],
            'responsible_id'  => ['nullable', 'exists:users,id'],
            'deadline'        => ['nullable', 'date'],
            'category'        => ['nullable', 'string', 'max:100'],
            'meeting_id'      => ['nullable', 'exists:meetings,id'],
        ]);

        // Génère une référence automatique : DELIB-YYYY-XXXXX
        $year  = date('Y');
        $count = Deliberation::where('organization_id', $user->organization_id)->count() + 1;
        $ref   = sprintf('DELIB-%s-%05d', $year, $count);

        $deliberation = Deliberation::create(array_merge($validated, [
            'organization_id' => $user->organization_id,
            'created_by'      => $user->id,
            'status'          => 'pending',
            'reference'       => $ref,
        ]));

        return response()->json([
            'message'       => 'Délibération enregistrée.',
            'deliberation'  => $deliberation->load(['responsible:id,name', 'creator:id,name']),
        ], 201);
    }

    public function show(int $id): Response
    {
        $deliberation = Deliberation::where('organization_id', Auth::user()->organization_id)
            ->with(['responsible:id,name,email', 'creator:id,name', 'meeting:id,title,scheduled_at'])
            ->findOrFail($id);

        return Inertia::render('Deliberations/Show', [
            'deliberation' => $deliberation,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $deliberation = Deliberation::where('organization_id', Auth::user()->organization_id)->findOrFail($id);

        $validated = $request->validate([
            'title'           => ['sometimes', 'string', 'max:255'],
            'body'            => ['nullable', 'string'],
            'decision'        => ['nullable', 'string'],
            'action_required' => ['nullable', 'string'],
            'responsible_id'  => ['nullable', 'exists:users,id'],
            'deadline'        => ['nullable', 'date'],
            'category'        => ['nullable', 'string', 'max:100'],
            'status'          => ['sometimes', 'in:pending,in_progress,done,cancelled'],
        ]);

        $deliberation->update($validated);

        return response()->json(['message' => 'Délibération mise à jour.', 'deliberation' => $deliberation->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        $deliberation = Deliberation::where('organization_id', Auth::user()->organization_id)->findOrFail($id);
        $deliberation->delete();

        return response()->json(['message' => 'Délibération supprimée.']);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $deliberation = Deliberation::where('organization_id', Auth::user()->organization_id)->findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', 'in:pending,in_progress,done,cancelled'],
        ]);

        $deliberation->update(['status' => $validated['status']]);

        return response()->json(['message' => 'Statut mis à jour.', 'status' => $validated['status']]);
    }

    public function toTask(Request $request, int $id): JsonResponse
    {
        $user         = Auth::user();
        $deliberation = Deliberation::where('organization_id', $user->organization_id)->findOrFail($id);

        $validated = $request->validate([
            'title'       => ['nullable', 'string', 'max:255'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'due_date'    => ['nullable', 'date'],
        ]);

        $task = Task::create([
            'organization_id' => $user->organization_id,
            'title'           => $validated['title'] ?? ($deliberation->action_required ?? $deliberation->title),
            'description'     => "Délibération {$deliberation->reference} : {$deliberation->decision}",
            'status'          => 'todo',
            'priority'        => 'normal',
            'created_by'      => $user->id,
            'due_date'        => $validated['due_date'] ?? $deliberation->deadline,
        ]);

        $assigneeId = $validated['assignee_id'] ?? $deliberation->responsible_id;
        if ($assigneeId) {
            $task->assignees()->attach($assigneeId, [
                'assigned_at' => now(),
                'assigned_by' => $user->id,
            ]);
        }

        return response()->json([
            'message' => 'Tâche créée depuis la délibération.',
            'task'    => $task->load('assignees:id,name,avatar'),
        ], 201);
    }
}
