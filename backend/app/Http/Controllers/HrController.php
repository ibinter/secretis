<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Leave;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class HrController extends Controller
{
    // ── Web — Inertia pages ───────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $user    = Auth::user();
        $orgId   = $user->organization_id;

        $query = Employee::where('organization_id', $orgId)
            ->with(['department:id,name', 'manager:id,first_name,last_name'])
            ->orderBy('first_name');

        if ($dept = $request->input('department')) {
            $query->where('department_id', $dept);
        }
        if ($contract = $request->input('contract')) {
            $query->where('contract_type', $contract);
        }
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->input('search')) {
            $like = '%' . addcslashes($search, '%_') . '%';
            $query->where(fn ($q) =>
                $q->where('first_name', 'ilike', $like)
                  ->orWhere('last_name', 'ilike', $like)
                  ->orWhere('email', 'ilike', $like)
                  ->orWhere('position', 'ilike', $like)
            );
        }

        $employees = $query->paginate(24)->through(fn (Employee $e) => $this->formatEmployee($e));

        $departments = Department::where('organization_id', $orgId)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('RH/Employes/Index', [
            'employees'   => $employees,
            'departments' => $departments,
            'filters'     => $request->only(['department', 'contract', 'status', 'search', 'view']),
        ]);
    }

    public function orgChart(): Response
    {
        $user  = Auth::user();
        $tree  = $this->buildOrgTree($user->organization_id);

        return Inertia::render('RH/Organigramme', [
            'tree'        => $tree,
            'departments' => Department::where('organization_id', $user->organization_id)
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    // ── API — Orgchart ────────────────────────────────────────────────────────

    public function orgchart(): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $tree  = $this->buildOrgTree($orgId);

        return response()->json(['data' => $tree]);
    }

    // ── API — Planning ────────────────────────────────────────────────────────

    public function planning(Request $request): JsonResponse|Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $from = $request->query('from', now()->startOfMonth()->toDateString());
        $to   = $request->query('to', now()->endOfMonth()->toDateString());

        $leaves = [];

        if (class_exists(\App\Models\Leave::class)) {
            try {
                $leaves = \App\Models\Leave::whereHas('employee', fn ($q) => $q->where('organization_id', $orgId))
                    ->with(['employee:id,first_name,last_name,department_id', 'leaveType:id,name,color'])
                    ->where('status', 'approved')
                    ->where('start_date', '<=', $to)
                    ->where('end_date', '>=', $from)
                    ->get()
                    ->map(fn ($l) => [
                        'id'           => $l->id,
                        'employee'     => $l->employee ? "{$l->employee->first_name} {$l->employee->last_name}" : null,
                        'department_id'=> $l->employee?->department_id,
                        'type'         => $l->leaveType?->name ?? $l->type,
                        'color'        => $l->leaveType?->color ?? '#6366f1',
                        'start_date'   => $l->start_date,
                        'end_date'     => $l->end_date,
                    ]);
            } catch (\Throwable) {}
        }

        if (request()->expectsJson() && ! request()->hasHeader('X-Inertia')) {
            return response()->json(['data' => $leaves]);
        }

        return Inertia::render('RH/Planning', [
            'leaves' => $leaves,
            'from'   => $from,
            'to'     => $to,
        ]);
    }

    // ── API — Départements ────────────────────────────────────────────────────

    public function departments(): JsonResponse
    {
        $orgId = Auth::user()->organization_id;

        $departments = Department::where('organization_id', $orgId)
            ->withCount(['employees' => fn ($q) => $q->where('status', 'active')])
            ->withCount('users')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $departments]);
    }

    public function storeDepartment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'manager_id'  => ['nullable', 'exists:employees,id'],
        ]);

        $user = Auth::user();

        $department = Department::create([
            'organization_id' => $user->organization_id,
            'name'            => $validated['name'],
            'description'     => $validated['description'] ?? null,
            'manager_id'      => $validated['manager_id'] ?? null,
        ]);

        return response()->json([
            'message'    => 'Département créé.',
            'department' => $department,
        ], 201);
    }

    public function showDepartment(string $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;

        $dept = Department::where('organization_id', $orgId)
            ->withCount(['employees' => fn ($q) => $q->where('status', 'active')])
            ->findOrFail($id);

        return response()->json(['data' => $dept]);
    }

    public function updateDepartment(Request $request, string $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;

        $dept = Department::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'name'        => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'manager_id'  => ['nullable', 'exists:employees,id'],
        ]);

        $dept->update($validated);

        return response()->json([
            'message'    => 'Département mis à jour.',
            'department' => $dept->fresh(),
        ]);
    }

    public function destroyDepartment(string $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;

        $dept = Department::where('organization_id', $orgId)->findOrFail($id);

        if ($dept->employees()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer un département avec des employés actifs.',
            ], 422);
        }

        $dept->delete();

        return response()->json(['message' => 'Département supprimé.']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function buildOrgTree(string $orgId): array
    {
        $employees = Employee::where('organization_id', $orgId)
            ->where('status', 'active')
            ->with(['department:id,name'])
            ->orderBy('first_name')
            ->get();

        $nodes = $employees->mapWithKeys(fn (Employee $e) => [
            $e->id => [
                'id'          => $e->id,
                'name'        => "{$e->first_name} {$e->last_name}",
                'position'    => $e->position,
                'department'  => $e->department?->name,
                'avatar'      => $e->avatar,
                'manager_id'  => $e->manager_id,
                'children'    => [],
            ],
        ])->toArray();

        $roots = [];
        foreach ($nodes as $id => &$node) {
            $managerId = $node['manager_id'];
            if ($managerId && isset($nodes[$managerId])) {
                $nodes[$managerId]['children'][] = &$node;
            } else {
                $roots[] = &$node;
            }
        }
        unset($node);

        return $roots;
    }

    private function formatEmployee(Employee $e): array
    {
        return [
            'id'              => $e->id,
            'name'            => "{$e->first_name} {$e->last_name}",
            'first_name'      => $e->first_name,
            'last_name'       => $e->last_name,
            'email'           => $e->email,
            'phone'           => $e->phone,
            'position'        => $e->position,
            'contract_type'   => $e->contract_type,
            'status'          => $e->status,
            'avatar'          => $e->avatar,
            'employee_number' => $e->employee_number,
            'hire_date'       => $e->hire_date?->toDateString(),
            'department'      => $e->department?->only(['id', 'name']),
            'manager'         => $e->manager ? [
                'id'   => $e->manager->id,
                'name' => "{$e->manager->first_name} {$e->manager->last_name}",
            ] : null,
        ];
    }

    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
