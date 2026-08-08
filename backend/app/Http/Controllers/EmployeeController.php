<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class EmployeeController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    // -------------------------------------------------------------------------
    // index — Liste des employés
    // -------------------------------------------------------------------------

    /**
     * Retourne la liste paginée des employés avec filtres.
     *
     * Filtres :
     *   - department : UUID département
     *   - contract   : cdi|cdd|internship|freelance|other
     *   - status     : active|inactive|on_leave
     *   - search     : nom, prénom, matricule, poste
     *   - view       : cards|list
     */
    public function index(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $query = Employee::forOrganization($orgId)
            ->with(['department:id,name', 'manager:id,first_name,last_name'])
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($dept = $request->input('department')) {
            $query->byDepartment($dept);
        }

        if ($contract = $request->input('contract')) {
            $query->where('contract_type', $contract);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('last_name', 'ilike', "%{$search}%")
                  ->orWhere('employee_number', 'ilike', "%{$search}%")
                  ->orWhere('job_title', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $employees = $query->paginate(24)->withQueryString();

        $departments = Department::where('organization_id', $orgId)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('RH/Employes/Index', [
            'employees'   => $employees,
            'departments' => $departments,
            'filters'     => $request->only(['department', 'contract', 'status', 'search', 'view']),
        ]);
    }

    // -------------------------------------------------------------------------
    // store — Créer un employé
    // -------------------------------------------------------------------------

    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $validated = $request->validate([
            'first_name'              => 'required|string|max:100',
            'last_name'               => 'required|string|max:100',
            'email'                   => [
                'required', 'email',
                Rule::unique('employees', 'email')->where('organization_id', $orgId),
            ],
            'employee_number'         => [
                'required', 'string', 'max:50',
                Rule::unique('employees', 'employee_number')->where('organization_id', $orgId),
            ],
            'phone'                   => 'nullable|string|max:30',
            'department_id'           => 'nullable|integer|exists:departments,id',
            'manager_id'              => 'nullable|integer|exists:employees,id',
            'user_id'                 => 'nullable|integer|exists:users,id',
            'contract_type'           => 'required|in:cdi,cdd,internship,freelance,other',
            'job_title'               => 'required|string|max:150',
            'hire_date'               => 'required|date',
            'termination_date'        => 'nullable|date|after:hire_date',
            'leave_balance'           => 'nullable|array',
            'leave_balance.annual'   => 'nullable|integer|min:0',
            'leave_balance.sick'     => 'nullable|integer|min:0',
            'leave_balance.maternity'=> 'nullable|integer|min:0',
            'leave_balance.unpaid'   => 'nullable|integer|min:0',
            'leave_balance.recovery' => 'nullable|integer|min:0',
            'emergency_contact'       => 'nullable|array',
            'notes'                   => 'nullable|string',
        ]);

        $employee = Employee::create([
            ...$validated,
            'organization_id' => $orgId,
            'status'          => 'active',
            'leave_balance'   => $validated['leave_balance'] ?? [
                'annual'    => 30,
                'sick'      => 15,
                'maternity' => 0,
                'unpaid'    => 0,
                'recovery'  => 0,
            ],
        ]);

        return redirect()->route('rh.employes.show', $employee->id)
            ->with('success', "Fiche de {$employee->full_name} créée avec succès.");
    }

    // -------------------------------------------------------------------------
    // show — Fiche employé complète
    // -------------------------------------------------------------------------

    public function show(Employee $employee): InertiaResponse
    {
        $this->authorizeEmployee($employee);

        // Données sensibles (salaire, RIB, n° CNPS) : réservées à la RH et à l'intéressé.
        $viewer = Auth::user();
        $canSeeSensitive = $viewer->hasPermissionForModule('rh', 'manage')
            || $employee->user_id === $viewer->id;

        if ($canSeeSensitive) {
            $employee->makeVisible(['base_salary', 'bank_account', 'social_security_number', 'tax_id', 'birth_date']);
        }

        $employee->load([
            'department:id,name',
            'manager:id,first_name,last_name,job_title',
            'user:id,email,status,last_login_at',
        ]);

        // Solde de congés
        $leaveBalance = $employee->getLeaveBalance();
        $availableDays = collect(['annual', 'sick', 'maternity', 'unpaid', 'recovery'])
            ->mapWithKeys(fn($type) => [$type => $employee->getAvailableLeaveDays($type)]);

        // Absences récentes (3 derniers mois)
        $recentLeaves = $employee->leaveRequests()
            ->with(['approverN1:id,name', 'approverHR:id,name'])
            ->where('start_date', '>=', now()->subMonths(3))
            ->orderByDesc('start_date')
            ->get();

        // Notes de frais
        $expenseReports = $employee->expenseReports()
            ->withCount('items')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return Inertia::render('RH/Employes/Fiche', [
            'employee'       => $employee,
            'leaveBalance'   => $leaveBalance,
            'availableDays'  => $availableDays,
            'recentLeaves'   => $recentLeaves,
            'expenseReports' => $expenseReports,
        ]);
    }

    // -------------------------------------------------------------------------
    // update — Mettre à jour la fiche
    // -------------------------------------------------------------------------

    public function update(Request $request, Employee $employee): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeEmployee($employee);
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'first_name'              => 'required|string|max:100',
            'last_name'               => 'required|string|max:100',
            'email'                   => [
                'required', 'email',
                Rule::unique('employees', 'email')
                    ->where('organization_id', $orgId)
                    ->ignore($employee->id),
            ],
            'phone'                   => 'nullable|string|max:30',
            'department_id'           => 'nullable|integer|exists:departments,id',
            'manager_id'              => 'nullable|integer|exists:employees,id',
            'contract_type'           => 'required|in:cdi,cdd,internship,freelance,other',
            'job_title'               => 'required|string|max:150',
            'hire_date'               => 'required|date',
            'termination_date'        => 'nullable|date|after:hire_date',
            'leave_balance'           => 'nullable|array',
            'emergency_contact'       => 'nullable|array',
            'notes'                   => 'nullable|string',
            'status'                  => 'required|in:active,on_leave,terminated,suspended',
        ]);

        $employee->update($validated);

        return back()->with('success', 'Fiche employé mise à jour.');
    }

    // -------------------------------------------------------------------------
    // destroy — Désactivation (soft delete)
    // -------------------------------------------------------------------------

    public function destroy(Employee $employee): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeEmployee($employee);

        // On désactive, on ne supprime pas physiquement
        $employee->update(['status' => 'terminated']);
        $employee->delete(); // soft delete

        return redirect()->route('rh.employes.index')
            ->with('success', 'Employé désactivé avec succès.');
    }

    // -------------------------------------------------------------------------
    // orgChart — Organigramme JSON
    // -------------------------------------------------------------------------

    /**
     * Retourne l'arborescence des employés pour l'organigramme.
     * Chaque nœud : { id, name, position, department, avatar, children[] }
     */
    public function orgChart(): JsonResponse
    {
        $orgId = Auth::user()->organization_id;

        $employees = Employee::forOrganization($orgId)
            ->active()
            ->with('department:id,name')
            // Colonnes réelles de `employees` : job_title (pas position), pas d'avatar.
            ->get(['id', 'first_name', 'last_name', 'job_title', 'manager_id', 'department_id']);

        // Construire l'arbre depuis les employés sans manager (racines)
        $tree = $this->buildTree($employees, null);

        return response()->json(['tree' => $tree]);
    }

    private function buildTree($employees, ?string $parentId): array
    {
        return $employees
            ->where('manager_id', $parentId)
            ->values()
            ->map(function ($emp) use ($employees) {
                return [
                    'id'         => $emp->id,
                    'name'       => $emp->full_name,
                    'position'   => $emp->job_title,
                    'department' => $emp->department?->name,
                    'avatar'     => $emp->user?->avatar, // la colonne vit sur users, pas employees
                    'children'   => $this->buildTree($employees, $emp->id),
                ];
            })
            ->all();
    }

    // -------------------------------------------------------------------------
    // importCsv — Import en masse depuis CSV/Excel
    // -------------------------------------------------------------------------

    public function importCsv(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,xls|max:5120',
        ]);

        $orgId = Auth::user()->organization_id;
        $file  = $request->file('file');
        $path  = $file->store('rh/imports', 'local');

        // Lire le CSV
        $rows    = [];
        $errors  = [];
        $handle  = fopen(Storage::disk('local')->path($path), 'r');
        $headers = null;
        $line    = 0;

        while (($data = fgetcsv($handle, 0, ';')) !== false) {
            $line++;
            if ($line === 1) {
                $headers = array_map('trim', $data);
                continue;
            }
            if (empty(array_filter($data))) continue;

            $row = array_combine($headers, $data);
            $rows[] = [
                'first_name'     => trim($row['Prénom'] ?? ''),
                'last_name'      => trim($row['Nom'] ?? ''),
                'email'          => strtolower(trim($row['Email'] ?? '')),
                'employee_number'=> trim($row['Matricule'] ?? ''),
                'job_title'      => trim($row['Poste'] ?? ''),
                'contract_type'  => strtolower(trim($row['Contrat'] ?? 'cdi')),
                'hire_date'      => trim($row['Date embauche'] ?? ''),
                'department'     => trim($row['Département'] ?? ''),
                'phone'          => trim($row['Téléphone'] ?? ''),
            ];
        }

        fclose($handle);
        Storage::disk('local')->delete($path);

        // Si preview uniquement
        if ($request->boolean('preview')) {
            return response()->json(['rows' => $rows, 'count' => count($rows)]);
        }

        // Import effectif
        $imported = 0;
        DB::beginTransaction();

        try {
            foreach ($rows as $index => $row) {
                if (empty($row['email']) || empty($row['first_name'])) {
                    $errors[] = "Ligne " . ($index + 2) . " : email ou prénom manquant.";
                    continue;
                }

                $dept = null;
                if ($row['department']) {
                    $dept = Department::where('organization_id', $orgId)
                        ->where('name', 'ilike', $row['department'])
                        ->first();
                }

                Employee::updateOrCreate(
                    ['organization_id' => $orgId, 'email' => $row['email']],
                    [
                        'organization_id' => $orgId,
                        'first_name'      => $row['first_name'],
                        'last_name'       => $row['last_name'],
                        'employee_number' => $row['employee_number'] ?: 'EMP-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT),
                        'job_title'       => $row['job_title'] ?? $row['position'] ?? '',
                        'contract_type'   => in_array($row['contract_type'], ['cdi','cdd','internship','freelance','other']) ? $row['contract_type'] : 'other',
                        'hire_date'       => $row['hire_date'] ?: now()->toDateString(),
                        'department_id'   => $dept?->id,
                        'phone'           => $row['phone'],
                        'status'          => 'active',
                        'leave_balance'   => ['annual'=>30,'sick'=>15,'maternity'=>0,'unpaid'=>0,'recovery'=>0],
                    ]
                );
                $imported++;
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }

        return response()->json([
            'imported' => $imported,
            'errors'   => $errors,
            'message'  => "{$imported} employé(s) importé(s) avec succès.",
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function authorizeEmployee(Employee $employee): void
    {
        $orgId = Auth::user()->organization_id;
        abort_if($employee->organization_id !== $orgId, 403);
    }

    /** GET /rh/personnel/creer — formulaire de création d'un employé */
    public function create(): InertiaResponse
    {
        $orgId = Auth::user()->organization_id;

        return Inertia::render('RH/Employes/Form', [
            'employee'    => null,
            'departments' => \App\Models\Department::where('organization_id', $orgId)->orderBy('name')->get(['id', 'name']),
            'managers'    => Employee::where('organization_id', $orgId)->where('status', 'active')
                                ->orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'users'       => \App\Models\User::where('organization_id', $orgId)->orderBy('name')->get(['id', 'name', 'email']),
        ]);
    }

    /** GET /rh/personnel/{employee}/modifier — formulaire d'édition */
    public function edit(Employee $employee): InertiaResponse
    {
        $orgId = Auth::user()->organization_id;
        abort_unless($employee->organization_id === $orgId, 403);

        return Inertia::render('RH/Employes/Form', [
            'employee'    => $employee,
            'departments' => \App\Models\Department::where('organization_id', $orgId)->orderBy('name')->get(['id', 'name']),
            'managers'    => Employee::where('organization_id', $orgId)->where('status', 'active')
                                ->where('id', '!=', $employee->id)
                                ->orderBy('last_name')->get(['id', 'first_name', 'last_name']),
            'users'       => \App\Models\User::where('organization_id', $orgId)->orderBy('name')->get(['id', 'name', 'email']),
        ]);
    }
}
