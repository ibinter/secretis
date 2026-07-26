<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\Organization;
use App\Models\TaxDeclaration;
use App\Services\AuditService;
use App\Services\SyscohadaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * SyscohadaController — Module Comptabilité Générale SYSCOHADA
 *
 * Routes (préfixe /comptabilite/generale) :
 *
 *   GET    /journal                  — Liste des journaux
 *   POST   /journal                  — Créer une écriture
 *   GET    /journal/{id}             — Détail écriture
 *   POST   /journal/{id}/validate    — Valider une écriture
 *   DELETE /journal/{id}             — Supprimer (si non verrouillée)
 *
 *   GET    /balance                  — Balance générale
 *   GET    /income-statement         — Compte de résultat
 *   GET    /balance-sheet            — Bilan
 *   GET    /ledger/{account}         — Grand livre d'un compte
 *   GET    /trial-balance            — Balance de vérification
 *
 *   GET    /chart-of-accounts        — Plan comptable
 *   POST   /chart-of-accounts        — Ajouter un compte
 *   PUT    /chart-of-accounts/{id}   — Modifier un compte (non-système uniquement)
 *   DELETE /chart-of-accounts/{id}   — Supprimer un compte personnalisé
 *
 *   GET    /fiscal-years             — Liste exercices
 *   POST   /fiscal-years             — Créer exercice
 *   POST   /fiscal-years/{id}/close  — Clôturer exercice
 *
 *   GET    /tax/{type}               — Déclaration fiscale
 *   POST   /tax                      — Créer déclaration
 *   PUT    /tax/{id}/submit          — Soumettre déclaration
 *
 *   GET    /balance-sheet/pdf        — Export PDF bilan
 *   GET    /income-statement/pdf     — Export PDF CR
 *
 *   POST   /reconcile/{account}      — Lettrage automatique
 */
class SyscohadaController extends Controller
{
    public function __construct(
        private readonly SyscohadaService $syscohada,
        private readonly AuditService     $audit,
    ) {
        $this->middleware('auth');
    }

    // =========================================================================
    // JOURNAL COMPTABLE
    // =========================================================================

    public function journalIndex(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $query = JournalEntry::where('organization_id', $orgId)
            ->with(['creator:id,name', 'validator:id,name'])
            ->orderByDesc('entry_date');

        if ($type = $request->input('journal_type')) {
            $query->where('journal_type', $type);
        }

        if ($from = $request->input('date_from')) {
            $query->where('entry_date', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->where('entry_date', '<=', $to);
        }

        if ($request->input('locked') !== null) {
            $query->where('is_locked', (bool) $request->input('locked'));
        }

        if ($fyId = $request->input('fiscal_year_id')) {
            $query->where('fiscal_year_id', $fyId);
        }

        if ($search = $request->input('search')) {
            $query->where(fn($q) =>
                $q->where('entry_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%")
            );
        }

        $entries      = $query->withCount('lines')->paginate(25)->withQueryString();
        $fiscalYears  = FiscalYear::where('organization_id', $orgId)->orderByDesc('start_date')->get(['id', 'name', 'status']);
        $chartAccounts= ChartOfAccount::where('organization_id', $orgId)
            ->where('is_leaf', true)
            ->orderBy('account_number')
            ->get(['account_number', 'account_name', 'account_type']);

        return Inertia::render('Comptabilite/JournalEntries', [
            'entries'      => $entries,
            'fiscalYears'  => $fiscalYears,
            'chartAccounts'=> $chartAccounts,
            'filters'      => $request->only(['journal_type', 'date_from', 'date_to', 'locked', 'fiscal_year_id', 'search']),
        ]);
    }

    public function journalStore(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'entry_date'      => 'required|date',
            'description'     => 'required|string|max:500',
            'reference'       => 'nullable|string|max:100',
            'journal_type'    => 'required|in:AN,OD,VE,AC,BQ,SA,CA',
            'fiscal_year_id'  => 'nullable|exists:fiscal_years,id',
            'lines'           => 'required|array|min:2',
            'lines.*.account_number' => 'required|string|max:10',
            'lines.*.debit_amount'   => 'required|numeric|min:0',
            'lines.*.credit_amount'  => 'required|numeric|min:0',
            'lines.*.description'    => 'nullable|string|max:500',
            'lines.*.analytic_code'  => 'nullable|string|max:30',
            'lines.*.project_id'     => 'nullable|exists:projects,id',
            'lines.*.currency_code'  => 'nullable|string|size:3',
            'lines.*.exchange_rate'  => 'nullable|numeric|min:0',
        ]);

        try {
            $entry = $this->syscohada->createJournalEntry([
                ...$data,
                'organization_id' => $user->organization_id,
                'created_by'      => $user->id,
            ]);

            $this->audit->logCreated('syscohada', 'journal_entry', $entry->id, [
                'entry_number' => $entry->entry_number,
            ]);

            return response()->json([
                'message' => "Écriture {$entry->entry_number} créée.",
                'entry'   => $entry->load('lines'),
            ], 201);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function journalShow(int $id): JsonResponse
    {
        $user  = Auth::user();
        $entry = JournalEntry::where('organization_id', $user->organization_id)
            ->with(['lines', 'creator:id,name', 'validator:id,name', 'fiscalYear:id,name'])
            ->findOrFail($id);

        return response()->json(['entry' => $entry]);
    }

    public function journalValidate(int $id): JsonResponse
    {
        $user  = Auth::user();
        $entry = JournalEntry::where('organization_id', $user->organization_id)->findOrFail($id);

        try {
            $this->syscohada->validateEntry($entry, $user);

            $this->audit->log('validated', 'syscohada', 'journal_entry', $entry->id, [], [
                'entry_number' => $entry->entry_number,
            ]);

            return response()->json([
                'message' => "Écriture {$entry->entry_number} validée et verrouillée.",
                'entry'   => $entry->fresh(),
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function journalDestroy(int $id): JsonResponse
    {
        $user  = Auth::user();
        $entry = JournalEntry::where('organization_id', $user->organization_id)->findOrFail($id);

        if ($entry->is_locked) {
            return response()->json(['message' => 'Impossible de supprimer une écriture validée.'], 422);
        }

        $this->audit->logDeleted('syscohada', 'journal_entry', $entry->id, [
            'entry_number' => $entry->entry_number,
        ]);

        $entry->lines()->delete();
        $entry->delete();

        return response()->json(['message' => 'Écriture supprimée.']);
    }

    // =========================================================================
    // BALANCE GÉNÉRALE
    // =========================================================================

    public function balance(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $org   = Organization::findOrFail($user->organization_id);
        $start = Carbon::parse($request->input('start', now()->startOfYear()));
        $end   = Carbon::parse($request->input('end',   now()->endOfYear()));

        $balance      = $this->syscohada->generateBalance($org, $start, $end);
        $fiscalYears  = FiscalYear::where('organization_id', $org->id)->orderByDesc('start_date')->get(['id', 'name', 'status', 'start_date', 'end_date']);

        return Inertia::render('Comptabilite/Balance', [
            'balance'     => $balance,
            'fiscalYears' => $fiscalYears,
            'dateRange'   => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
        ]);
    }

    public function balanceJson(Request $request): JsonResponse
    {
        $user  = Auth::user();
        $org   = Organization::findOrFail($user->organization_id);
        $start = Carbon::parse($request->input('start', now()->startOfYear()));
        $end   = Carbon::parse($request->input('end',   now()->endOfYear()));

        return response()->json($this->syscohada->generateBalance($org, $start, $end));
    }

    // =========================================================================
    // COMPTE DE RÉSULTAT
    // =========================================================================

    public function incomeStatement(Request $request): InertiaResponse
    {
        $user = Auth::user();
        $orgId= $user->organization_id;

        $fyId = $request->input('fiscal_year_id');
        $fy   = $fyId
            ? FiscalYear::where('organization_id', $orgId)->findOrFail($fyId)
            : FiscalYear::where('organization_id', $orgId)->where('status', 'open')->latest('start_date')->first();

        if (! $fy) {
            return Inertia::render('Comptabilite/IncomeStatement', [
                'data'        => null,
                'fiscalYears' => FiscalYear::where('organization_id', $orgId)->orderByDesc('start_date')->get(),
                'selectedFY'  => null,
            ]);
        }

        $data        = $this->syscohada->generateIncomeStatement($fy);
        $fiscalYears = FiscalYear::where('organization_id', $orgId)->orderByDesc('start_date')->get(['id', 'name', 'status']);

        return Inertia::render('Comptabilite/IncomeStatement', [
            'data'        => $data,
            'fiscalYears' => $fiscalYears,
            'selectedFY'  => $fy,
        ]);
    }

    public function incomeStatementJson(Request $request): JsonResponse
    {
        $user = Auth::user();
        $fyId = $request->input('fiscal_year_id');
        $fy   = FiscalYear::where('organization_id', $user->organization_id)->findOrFail($fyId);

        return response()->json($this->syscohada->generateIncomeStatement($fy));
    }

    // =========================================================================
    // BILAN
    // =========================================================================

    public function balanceSheet(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $fyId = $request->input('fiscal_year_id');
        $fy   = $fyId
            ? FiscalYear::where('organization_id', $orgId)->findOrFail($fyId)
            : FiscalYear::where('organization_id', $orgId)->where('status', 'open')->latest('start_date')->first();

        $data        = $fy ? $this->syscohada->generateBalanceSheet($fy) : null;
        $fiscalYears = FiscalYear::where('organization_id', $orgId)->orderByDesc('start_date')->get(['id', 'name', 'status']);

        return Inertia::render('Comptabilite/BalanceSheet', [
            'data'        => $data,
            'fiscalYears' => $fiscalYears,
            'selectedFY'  => $fy,
        ]);
    }

    /** PDF Bilan SYSCOHADA (DomPDF) */
    public function balanceSheetPdf(Request $request): Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;
        $fyId  = $request->input('fiscal_year_id');
        $fy    = FiscalYear::where('organization_id', $orgId)->findOrFail($fyId);

        $data = $this->syscohada->generateBalanceSheet($fy);
        $org  = Organization::findOrFail($orgId);

        $pdf = app('dompdf.wrapper')->loadView('accounting.balance-sheet-pdf', compact('data', 'org', 'fy'));
        $pdf->setPaper('A4', 'landscape');

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"bilan-{$fy->name}.pdf\"",
        ]);
    }

    /** PDF Compte de résultat */
    public function incomeStatementPdf(Request $request): Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;
        $fyId  = $request->input('fiscal_year_id');
        $fy    = FiscalYear::where('organization_id', $orgId)->findOrFail($fyId);

        $data = $this->syscohada->generateIncomeStatement($fy);
        $org  = Organization::findOrFail($orgId);

        $pdf = app('dompdf.wrapper')->loadView('accounting.income-statement-pdf', compact('data', 'org', 'fy'));
        $pdf->setPaper('A4', 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"cr-{$fy->name}.pdf\"",
        ]);
    }

    // =========================================================================
    // GRAND LIVRE
    // =========================================================================

    public function generalLedger(Request $request): InertiaResponse
    {
        $user    = Auth::user();
        $org     = Organization::findOrFail($user->organization_id);
        $account = $request->input('account');
        $start   = Carbon::parse($request->input('start', now()->startOfYear()));
        $end     = Carbon::parse($request->input('end',   now()->endOfYear()));

        $ledger       = $account ? $this->syscohada->generateGeneralLedger($org, $account, $start, $end) : null;
        $chartAccounts= ChartOfAccount::where('organization_id', $org->id)
            ->where('is_leaf', true)
            ->orderBy('account_number')
            ->get(['account_number', 'account_name', 'account_type']);

        return Inertia::render('Comptabilite/GeneralLedger', [
            'ledger'       => $ledger,
            'chartAccounts'=> $chartAccounts,
            'filters'      => $request->only(['account', 'start', 'end']),
            'dateRange'    => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
        ]);
    }

    // =========================================================================
    // PLAN COMPTABLE
    // =========================================================================

    public function chartOfAccounts(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $query = ChartOfAccount::where('organization_id', $orgId)->orderBy('account_number');

        if ($class = $request->input('class')) {
            $query->where('ohada_class', $class);
        }

        if ($type = $request->input('type')) {
            $query->where('account_type', $type);
        }

        if ($search = $request->input('search')) {
            $query->where(fn($q) =>
                $q->where('account_number', 'like', "%{$search}%")
                  ->orWhere('account_name', 'like', "%{$search}%")
            );
        }

        $accounts = $query->paginate(50)->withQueryString();

        return Inertia::render('Comptabilite/ChartOfAccounts', [
            'accounts' => $accounts,
            'filters'  => $request->only(['class', 'type', 'search']),
        ]);
    }

    public function chartStore(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'account_number'        => 'required|string|max:10',
            'account_name'          => 'required|string|max:200',
            'account_type'          => 'required|in:actif,passif,charge,produit,capitaux',
            'parent_account_number' => 'nullable|string|max:10',
            'ohada_class'           => 'required|integer|min:1|max:9',
            'is_leaf'               => 'boolean',
            'currency_code'         => 'nullable|string|size:3',
        ]);

        // Vérifie unicité dans l'organisation
        $exists = ChartOfAccount::where('organization_id', $user->organization_id)
            ->where('account_number', $data['account_number'])
            ->exists();

        if ($exists) {
            return response()->json(['message' => "Le compte {$data['account_number']} existe déjà."], 422);
        }

        $account = ChartOfAccount::create([
            ...$data,
            'organization_id' => $user->organization_id,
            'is_system'       => false,
            'currency_code'   => $data['currency_code'] ?? 'XOF',
            'is_leaf'         => $data['is_leaf'] ?? true,
        ]);

        return response()->json(['message' => 'Compte créé.', 'account' => $account], 201);
    }

    public function chartUpdate(Request $request, int $id): JsonResponse
    {
        $user    = Auth::user();
        $account = ChartOfAccount::where('organization_id', $user->organization_id)->findOrFail($id);

        if ($account->is_system) {
            return response()->json(['message' => 'Les comptes système SYSCOHADA ne peuvent pas être modifiés.'], 403);
        }

        $data = $request->validate([
            'account_name' => 'sometimes|string|max:200',
            'is_leaf'      => 'sometimes|boolean',
        ]);

        $account->update($data);

        return response()->json(['message' => 'Compte mis à jour.', 'account' => $account]);
    }

    public function chartDestroy(int $id): JsonResponse
    {
        $user    = Auth::user();
        $account = ChartOfAccount::where('organization_id', $user->organization_id)->findOrFail($id);

        if ($account->is_system) {
            return response()->json(['message' => 'Impossible de supprimer un compte système SYSCOHADA.'], 403);
        }

        $hasLines = \DB::table('journal_lines')->where('account_number', $account->account_number)->exists();
        if ($hasLines) {
            return response()->json(['message' => 'Ce compte a des mouvements comptables.'], 422);
        }

        $account->delete();

        return response()->json(['message' => 'Compte supprimé.']);
    }

    // =========================================================================
    // EXERCICES FISCAUX
    // =========================================================================

    public function fiscalYearsIndex(): JsonResponse
    {
        $user   = Auth::user();
        $years  = FiscalYear::where('organization_id', $user->organization_id)
            ->orderByDesc('start_date')
            ->get();

        return response()->json(['fiscal_years' => $years]);
    }

    public function fiscalYearsStore(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'name'       => 'required|string|max:60',
            'start_date' => 'required|date',
            'end_date'   => 'required|date|after:start_date',
        ]);

        // Vérifie pas de chevauchement
        $overlap = FiscalYear::where('organization_id', $user->organization_id)
            ->where(fn($q) =>
                $q->whereBetween('start_date', [$data['start_date'], $data['end_date']])
                  ->orWhereBetween('end_date', [$data['start_date'], $data['end_date']])
            )
            ->exists();

        if ($overlap) {
            return response()->json(['message' => 'Chevauchement avec un exercice existant.'], 422);
        }

        $fy = FiscalYear::create([
            ...$data,
            'organization_id' => $user->organization_id,
            'status'          => 'open',
            'created_by'      => $user->id,
        ]);

        return response()->json(['message' => 'Exercice fiscal créé.', 'fiscal_year' => $fy], 201);
    }

    public function fiscalYearsClose(int $id): JsonResponse
    {
        $user = Auth::user();
        $fy   = FiscalYear::where('organization_id', $user->organization_id)->findOrFail($id);

        try {
            $this->syscohada->closeFiscalYear($fy, $user);

            $this->audit->log('closed', 'syscohada', 'fiscal_year', $fy->id, [], [
                'name' => $fy->name,
            ]);

            return response()->json(['message' => "Exercice {$fy->name} clôturé.", 'fiscal_year' => $fy->fresh()]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // =========================================================================
    // DÉCLARATIONS FISCALES
    // =========================================================================

    public function taxDeclarations(Request $request): InertiaResponse
    {
        $user    = Auth::user();
        $orgId   = $user->organization_id;
        $type    = $request->input('type', 'TVA');
        $start   = Carbon::parse($request->input('start', now()->startOfMonth()));
        $end     = Carbon::parse($request->input('end',   now()->endOfMonth()));

        $org         = Organization::findOrFail($orgId);
        $preview     = $this->syscohada->generateTaxDeclaration($org, $type, $start, $end);
        $history     = TaxDeclaration::where('organization_id', $orgId)
            ->orderByDesc('period_start')
            ->get();
        $fiscalYears = FiscalYear::where('organization_id', $orgId)->orderByDesc('start_date')->get(['id', 'name', 'status']);

        return Inertia::render('Comptabilite/TaxDeclarations', [
            'preview'     => $preview,
            'history'     => $history,
            'fiscalYears' => $fiscalYears,
            'filters'     => $request->only(['type', 'start', 'end']),
        ]);
    }

    public function taxStore(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'fiscal_year_id'   => 'nullable|exists:fiscal_years,id',
            'declaration_type' => 'required|in:TVA,IS,PATENTE,CNPS',
            'period_start'     => 'required|date',
            'period_end'       => 'required|date|after_or_equal:period_start',
            'base_amount'      => 'required|numeric|min:0',
            'tax_rate'         => 'required|numeric|min:0',
            'tax_amount'       => 'required|numeric|min:0',
            'tax_credit'       => 'nullable|numeric|min:0',
            'net_tax'          => 'required|numeric',
        ]);

        $decl = TaxDeclaration::create([
            ...$data,
            'organization_id' => $user->organization_id,
            'tax_credit'      => $data['tax_credit'] ?? 0,
            'status'          => 'draft',
            'created_by'      => $user->id,
        ]);

        return response()->json(['message' => 'Déclaration créée.', 'declaration' => $decl], 201);
    }

    public function taxSubmit(int $id): JsonResponse
    {
        $user = Auth::user();
        $decl = TaxDeclaration::where('organization_id', $user->organization_id)->findOrFail($id);

        if ($decl->status !== 'draft') {
            return response()->json(['message' => 'Seules les déclarations en brouillon peuvent être soumises.'], 422);
        }

        $decl->update([
            'status'       => 'submitted',
            'submitted_at' => now(),
        ]);

        return response()->json(['message' => 'Déclaration soumise.', 'declaration' => $decl->fresh()]);
    }

    // =========================================================================
    // LETTRAGE
    // =========================================================================

    public function reconcile(Request $request, string $accountNumber): JsonResponse
    {
        $user = Auth::user();
        $org  = Organization::findOrFail($user->organization_id);

        $result = $this->syscohada->reconcileAccount($org, $accountNumber);

        return response()->json([
            'message' => "{$result['pairs_found']} paires lettrées sur le compte {$accountNumber}.",
            'result'  => $result,
        ]);
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
