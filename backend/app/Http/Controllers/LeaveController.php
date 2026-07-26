<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Services\LeaveService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class LeaveController extends Controller
{
    public function __construct(private readonly LeaveService $leaveService)
    {
        $this->middleware('auth');
    }

    // -------------------------------------------------------------------------
    // index — Liste des demandes de congé
    // -------------------------------------------------------------------------

    /**
     * Retourne la page avec :
     *   - "Mes demandes"  : congés de l'employé connecté
     *   - "À approuver"   : congés en attente selon le rôle (manager/RH)
     *   - Absences équipe : calendrier du mois courant
     */
    public function index(Request $request): InertiaResponse
    {
        $user    = Auth::user();
        $orgId   = $user->organization_id;
        $employee = Employee::where('user_id', $user->id)->first();

        // Mes demandes
        $myLeaves = $employee
            ? LeaveRequest::where('employee_id', $employee->id)
                ->with(['approverN1:id,name', 'approverHR:id,name'])
                ->orderByDesc('created_at')
                ->paginate(10, ['*'], 'my_page')
                ->withQueryString()
            : null;

        // À approuver (manager N+1)
        $toApproveN1 = null;
        if ($user->hasAnyRole(['admin_org', 'rh_manager']) || $employee?->subordinates()->exists()) {
            $subordinateIds = $employee
                ? Employee::where('manager_id', $employee->id)->pluck('id')
                : collect();

            $toApproveN1 = LeaveRequest::where('organization_id', $orgId)
                ->where('status', 'pending')
                ->when($subordinateIds->isNotEmpty(), fn($q) => $q->whereIn('employee_id', $subordinateIds))
                ->with(['employee:id,first_name,last_name,avatar,position'])
                ->orderBy('start_date')
                ->get();
        }

        // À approuver (RH)
        $toApproveHR = null;
        if ($user->hasAnyRole(['admin_org', 'rh_manager'])) {
            $toApproveHR = LeaveRequest::where('organization_id', $orgId)
                ->where('status', 'approved_n1')
                ->with(['employee:id,first_name,last_name,avatar,department_id', 'employee.department:id,name'])
                ->orderBy('start_date')
                ->get();
        }

        // Absences de l'équipe pour le mois courant
        $month        = Carbon::parse($request->input('month', now()->format('Y-m')));
        $organization = $user->organization;
        $teamAbsences = $this->leaveService->getTeamAbsences($organization, $month);

        return Inertia::render('RH/Conges/Index', [
            'myLeaves'     => $myLeaves,
            'toApproveN1'  => $toApproveN1,
            'toApproveHR'  => $toApproveHR,
            'teamAbsences' => $teamAbsences,
            'currentMonth' => $month->format('Y-m'),
            'employee'     => $employee ? [
                'id'            => $employee->id,
                'leave_balance' => $employee->getLeaveBalance(),
                'available'     => collect(['annual','sick','maternity','unpaid','recovery'])
                    ->mapWithKeys(fn($t) => [$t => $employee->getAvailableLeaveDays($t)]),
            ] : null,
            'filters' => $request->only(['month', 'status', 'type']),
        ]);
    }

    // -------------------------------------------------------------------------
    // store — Créer une demande
    // -------------------------------------------------------------------------

    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        $user     = Auth::user();
        $employee = Employee::where('user_id', $user->id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        $validated = $request->validate([
            'leave_type' => 'required|in:annual,sick,maternity,unpaid,recovery',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'reason'     => 'nullable|string|max:1000',
        ]);

        try {
            $leave = $this->leaveService->createRequest($validated, $employee);

            return back()->with('success', "Demande de congé créée ({$leave->days_count} jours). Votre manager a été notifié.");
        } catch (\Exception $e) {
            return back()->withErrors(['leave' => $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // show
    // -------------------------------------------------------------------------

    public function show(LeaveRequest $leave): JsonResponse
    {
        $this->authorizeLeave($leave);

        $leave->load(['employee:id,first_name,last_name,avatar,position', 'approverN1:id,name', 'approverHR:id,name']);

        return response()->json(['leave' => $leave]);
    }

    // -------------------------------------------------------------------------
    // update — Modifier une demande (si encore en attente)
    // -------------------------------------------------------------------------

    public function update(Request $request, LeaveRequest $leave): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeLeave($leave);

        if ($leave->status !== 'pending') {
            return back()->withErrors(['leave' => "Seules les demandes en attente peuvent être modifiées."]);
        }

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after_or_equal:start_date',
            'reason'     => 'nullable|string|max:1000',
        ]);

        $leave->update($validated);

        return back()->with('success', 'Demande de congé mise à jour.');
    }

    // -------------------------------------------------------------------------
    // approveN1 — Approbation niveau 1 (manager)
    // -------------------------------------------------------------------------

    public function approveN1(LeaveRequest $leave): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeLeave($leave);

        try {
            $this->leaveService->approve($leave, Auth::user(), 'n1');

            return back()->with('success', 'Demande approuvée au niveau N+1. Le service RH a été notifié.');
        } catch (\Exception $e) {
            return back()->withErrors(['leave' => $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // approveHR — Approbation finale RH
    // -------------------------------------------------------------------------

    public function approveHR(LeaveRequest $leave): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeLeave($leave);

        if (! Auth::user()->hasAnyRole(['admin_org', 'rh_manager'])) {
            abort(403, "Seul le service RH peut effectuer cette validation.");
        }

        try {
            $this->leaveService->approve($leave, Auth::user(), 'hr');

            return back()->with('success', 'Congé validé définitivement. L\'employé a été notifié et le solde mis à jour.');
        } catch (\Exception $e) {
            return back()->withErrors(['leave' => $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // reject — Refus avec motif
    // -------------------------------------------------------------------------

    public function reject(Request $request, LeaveRequest $leave): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeLeave($leave);

        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:10|max:500',
        ]);

        try {
            $this->leaveService->reject($leave, Auth::user(), $validated['rejection_reason']);

            return back()->with('success', 'Demande refusée. L\'employé a été notifié.');
        } catch (\Exception $e) {
            return back()->withErrors(['leave' => $e->getMessage()]);
        }
    }

    // -------------------------------------------------------------------------
    // calendar — Absences pour une période (format calendrier)
    // -------------------------------------------------------------------------

    public function calendar(Request $request): JsonResponse
    {
        $user  = Auth::user();
        $month = Carbon::parse($request->input('month', now()->format('Y-m')));
        $org   = $user->organization;

        $absences = $this->leaveService->getTeamAbsences($org, $month);

        return response()->json(['absences' => $absences, 'month' => $month->format('Y-m')]);
    }

    // -------------------------------------------------------------------------
    // monthlyReport — Rapport mensuel
    // -------------------------------------------------------------------------

    public function monthlyReport(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        if (! Auth::user()->hasAnyRole(['admin_org', 'rh_manager'])) {
            abort(403);
        }

        $validated = $request->validate([
            'month'  => 'required|date_format:Y-m',
            'format' => 'nullable|in:json,excel',
        ]);

        $month        = Carbon::parse($validated['month']);
        $organization = Auth::user()->organization;
        $absences     = $this->leaveService->getTeamAbsences($organization, $month);

        if ($request->input('format') === 'excel') {
            // Génération Excel (nécessite maatwebsite/excel)
            // return Excel::download(new LeavesExport($absences), "conges-{$month->format('Y-m')}.xlsx");
            return response()->json(['message' => 'Export Excel non encore implémenté'], 501);
        }

        return response()->json([
            'month'    => $month->format('Y-m'),
            'org'      => $organization->name,
            'absences' => $absences,
            'stats'    => [
                'total_requests' => $absences->count(),
                'total_days'     => $absences->sum('days'),
                'by_type'        => $absences->groupBy('type')->map->count(),
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private function authorizeLeave(LeaveRequest $leave): void
    {
        $user = Auth::user();
        abort_if($leave->organization_id !== $user->organization_id, 403);
    }
}
