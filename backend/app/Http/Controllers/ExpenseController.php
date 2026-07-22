<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\ExpenseItem;
use App\Models\ExpenseReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ExpenseController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    // -------------------------------------------------------------------------
    // index
    // -------------------------------------------------------------------------

    public function index(Request $request): InertiaResponse
    {
        $user     = Auth::user();
        $orgId    = $user->organization_id;
        $employee = Employee::where('user_id', $user->id)->first();

        $query = ExpenseReport::forOrganization($orgId)
            ->with(['employee:id,first_name,last_name,avatar'])
            ->withSum('items', 'amount');

        // Filtres
        if ($status = $request->input('status')) {
            $query->byStatus($status);
        }

        if ($period = $request->input('period')) {
            $query->byPeriod($period);
        }

        // Si pas admin/comptable, filtrer sur l'employé connecté
        if (! $user->hasAnyRole(['admin_org', 'rh_manager', 'accountant']) && $employee) {
            $query->where('employee_id', $employee->id);
        }

        $reports = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return Inertia::render('RH/NoteFrais/Index', [
            'reports'  => $reports,
            'employee' => $employee,
            'filters'  => $request->only(['status', 'period']),
        ]);
    }

    // -------------------------------------------------------------------------
    // store — Créer une note de frais (brouillon)
    // -------------------------------------------------------------------------

    public function store(Request $request): \Illuminate\Http\RedirectResponse
    {
        $user     = Auth::user();
        $employee = Employee::where('user_id', $user->id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        $validated = $request->validate([
            'title'        => 'required|string|max:200',
            'period_month' => 'required|date_format:Y-m',
            'notes'        => 'nullable|string',
            'items'        => 'required|array|min:1',
            'items.*.category'    => 'required|in:transport,accommodation,meals,other',
            'items.*.description' => 'required|string|max:255',
            'items.*.amount'      => 'required|numeric|min:0.01',
            'items.*.expense_date'=> 'required|date',
            'items.*.receipt'     => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        DB::transaction(function () use ($validated, $employee, $user, $request) {
            $report = ExpenseReport::create([
                'organization_id' => $user->organization_id,
                'employee_id'     => $employee->id,
                'title'           => $validated['title'],
                'period_month'    => $validated['period_month'],
                'notes'           => $validated['notes'] ?? null,
                'status'          => 'draft',
            ]);

            foreach ($validated['items'] as $index => $itemData) {
                $receiptPath = null;
                if ($request->hasFile("items.{$index}.receipt")) {
                    $receiptPath = $request->file("items.{$index}.receipt")
                        ->store("rh/justificatifs/{$employee->id}", 'public');
                }

                ExpenseItem::create([
                    'expense_report_id' => $report->id,
                    'category'          => $itemData['category'],
                    'description'       => $itemData['description'],
                    'amount'            => $itemData['amount'],
                    'expense_date'      => $itemData['expense_date'],
                    'receipt_path'      => $receiptPath,
                ]);
            }
        });

        return redirect()->route('rh.frais.index')
            ->with('success', 'Note de frais créée en brouillon.');
    }

    // -------------------------------------------------------------------------
    // show
    // -------------------------------------------------------------------------

    public function show(ExpenseReport $expense): InertiaResponse
    {
        $this->authorizeExpense($expense);

        $expense->load(['employee:id,first_name,last_name,avatar,position', 'items', 'approver:id,name']);

        return Inertia::render('RH/NoteFrais/Show', [
            'report'      => $expense,
            'totalAmount' => $expense->getTotalAmount(),
        ]);
    }

    // -------------------------------------------------------------------------
    // update — Modifier (si brouillon)
    // -------------------------------------------------------------------------

    public function update(Request $request, ExpenseReport $expense): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeExpense($expense);

        if ($expense->status !== 'draft') {
            return back()->withErrors(['expense' => "Seuls les brouillons peuvent être modifiés."]);
        }

        $validated = $request->validate([
            'title'        => 'required|string|max:200',
            'period_month' => 'required|date_format:Y-m',
            'notes'        => 'nullable|string',
        ]);

        $expense->update($validated);

        return back()->with('success', 'Note de frais mise à jour.');
    }

    // -------------------------------------------------------------------------
    // destroy — Supprimer (si brouillon)
    // -------------------------------------------------------------------------

    public function destroy(ExpenseReport $expense): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeExpense($expense);

        if ($expense->status !== 'draft') {
            return back()->withErrors(['expense' => "Seuls les brouillons peuvent être supprimés."]);
        }

        // Supprimer les justificatifs
        $expense->items->each(function (ExpenseItem $item) {
            if ($item->receipt_path) {
                Storage::disk('public')->delete($item->receipt_path);
            }
        });

        $expense->delete();

        return redirect()->route('rh.frais.index')->with('success', 'Note de frais supprimée.');
    }

    // -------------------------------------------------------------------------
    // submit — Soumettre pour validation (draft → submitted)
    // -------------------------------------------------------------------------

    public function submit(ExpenseReport $expense): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeExpense($expense);

        if ($expense->status !== 'draft') {
            return back()->withErrors(['expense' => "Cette note n'est pas un brouillon."]);
        }

        if ($expense->items()->count() === 0) {
            return back()->withErrors(['expense' => "La note de frais doit contenir au moins une ligne."]);
        }

        $expense->update(['status' => 'submitted']);

        return back()->with('success', 'Note de frais soumise pour validation.');
    }

    // -------------------------------------------------------------------------
    // approve — Approbation manager
    // -------------------------------------------------------------------------

    public function approve(ExpenseReport $expense): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeExpense($expense);

        if ($expense->status !== 'submitted') {
            return back()->withErrors(['expense' => "La note doit être soumise pour être approuvée."]);
        }

        $expense->update([
            'status'      => 'approved',
            'approver_id' => Auth::id(),
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Note de frais approuvée par le manager.');
    }

    // -------------------------------------------------------------------------
    // approveAccounting — Validation comptabilité + marquage payé
    // -------------------------------------------------------------------------

    public function approveAccounting(ExpenseReport $expense): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeExpense($expense);

        if (! Auth::user()->hasAnyRole(['admin_org', 'accountant'])) {
            abort(403, "Seule la comptabilité peut effectuer ce traitement.");
        }

        if ($expense->status !== 'approved') {
            return back()->withErrors(['expense' => "La note doit être approuvée par le manager d'abord."]);
        }

        $expense->update([
            'status'             => 'paid',
            'accounting_user_id' => Auth::id(),
            'paid_at'            => now(),
        ]);

        return back()->with('success', 'Note de frais validée et marquée comme payée.');
    }

    // -------------------------------------------------------------------------
    // reject — Refus avec motif
    // -------------------------------------------------------------------------

    public function reject(Request $request, ExpenseReport $expense): \Illuminate\Http\RedirectResponse
    {
        $this->authorizeExpense($expense);

        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:10|max:500',
        ]);

        if (! in_array($expense->status, ['submitted', 'approved'])) {
            return back()->withErrors(['expense' => "Cette note ne peut pas être refusée dans son état actuel."]);
        }

        $expense->update([
            'status'           => 'rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        return back()->with('success', 'Note de frais refusée. L\'employé a été notifié.');
    }

    // -------------------------------------------------------------------------
    // exportForAccounting — Export Excel pour comptabilité
    // -------------------------------------------------------------------------

    public function exportForAccounting(Request $request): JsonResponse
    {
        if (! Auth::user()->hasAnyRole(['admin_org', 'accountant'])) {
            abort(403);
        }

        $validated = $request->validate([
            'period' => 'required|date_format:Y-m',
        ]);

        $reports = ExpenseReport::forOrganization(Auth::user()->organization_id)
            ->byPeriod($validated['period'])
            ->whereIn('status', ['approved', 'paid'])
            ->with(['employee:id,first_name,last_name,employee_number', 'items'])
            ->get();

        $rows = [];
        foreach ($reports as $report) {
            foreach ($report->items as $item) {
                $rows[] = [
                    'matricule'   => $report->employee->employee_number,
                    'employe'     => $report->employee->full_name,
                    'note'        => $report->title,
                    'periode'     => $report->period_month,
                    'categorie'   => $item->category_label,
                    'description' => $item->description,
                    'date'        => $item->expense_date->format('d/m/Y'),
                    'montant'     => $item->amount,
                    'statut'      => $report->status_label,
                ];
            }
        }

        // En production : return Excel::download(new ExpensesExport($rows), "frais-{$validated['period']}.xlsx");
        return response()->json([
            'period' => $validated['period'],
            'rows'   => $rows,
            'total'  => array_sum(array_column($rows, 'montant')),
        ]);
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private function authorizeExpense(ExpenseReport $expense): void
    {
        abort_if($expense->organization_id !== Auth::user()->organization_id, 403);
    }
}
