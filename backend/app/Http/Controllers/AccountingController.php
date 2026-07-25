<?php

namespace App\Http\Controllers;

use App\Models\AccountingClient;
use App\Models\AccountingExpense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\Quote;
use App\Services\AccountingService;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * AccountingController — Module Comptabilité légère SECRETIS ERP
 *
 * Routes :
 *   GET    /comptabilite/dashboard
 *   GET    /comptabilite/export
 *   CRUD   /clients, /quotes, /invoices, /expenses
 *   POST   /invoices/{id}/send
 *   POST   /invoices/{id}/pay
 *   GET    /invoices/{id}/pdf
 *   GET    /quotes/{id}/pdf
 *   GET    /quotes/{id}/convert
 */
class AccountingController extends Controller
{
    public function __construct(
        private readonly AccountingService $accounting,
        private readonly AuditService      $audit,
    ) {
        $this->middleware('auth');
    }

    // =========================================================================
    // DASHBOARD
    // =========================================================================

    public function dashboard(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $start = Carbon::parse($request->input('start', now()->startOfYear()->toDateString()));
        $end   = Carbon::parse($request->input('end', now()->endOfYear()->toDateString()));

        $kpis = $this->accounting->getAccountingDashboard($orgId, $start, $end);

        return Inertia::render('Comptabilite/Dashboard', [
            'kpis'      => $kpis,
            'dateRange' => [
                'start' => $start->toDateString(),
                'end'   => $end->toDateString(),
            ],
        ]);
    }

    // =========================================================================
    // CLIENTS
    // =========================================================================

    public function clientsIndex(Request $request): InertiaResponse
    {
        $user    = Auth::user();
        $query   = AccountingClient::forOrg($user->organization_id)
            ->withCount(['invoices'])
            ->orderBy('name');

        if ($search = $request->input('search')) {
            $query->where(fn($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('tax_number', 'like', "%{$search}%"));
        }

        $clients = $query->paginate(20)->withQueryString();

        return Inertia::render('Comptabilite/Clients', [
            'clients' => $clients,
            'filters' => $request->only(['search']),
        ]);
    }

    public function clientsStore(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'name'       => 'required|string|max:200',
            'email'      => 'nullable|email|max:200',
            'phone'      => 'nullable|string|max:30',
            'address'    => 'nullable|string',
            'tax_number' => 'nullable|string|max:60',
            'currency'   => 'nullable|string|size:3',
            'notes'      => 'nullable|string',
        ]);

        $client = AccountingClient::create([
            ...$data,
            'organization_id' => $user->organization_id,
            'currency'        => $data['currency'] ?? 'XOF',
            'is_active'       => true,
        ]);

        $this->audit->logCreated('accounting', 'client', $client->id, ['name' => $client->name]);

        return response()->json(['message' => 'Client créé.', 'client' => $client], 201);
    }

    public function clientsUpdate(Request $request, int $id): JsonResponse
    {
        $user   = Auth::user();
        $client = AccountingClient::forOrg($user->organization_id)->findOrFail($id);
        $old    = $client->toArray();

        $data = $request->validate([
            'name'       => 'sometimes|string|max:200',
            'email'      => 'nullable|email|max:200',
            'phone'      => 'nullable|string|max:30',
            'address'    => 'nullable|string',
            'tax_number' => 'nullable|string|max:60',
            'currency'   => 'nullable|string|size:3',
            'notes'      => 'nullable|string',
            'is_active'  => 'sometimes|boolean',
        ]);

        $client->update($data);
        $this->audit->logUpdated('accounting', 'client', $client->id, $old, $client->toArray());

        return response()->json(['message' => 'Client mis à jour.', 'client' => $client]);
    }

    public function clientsDestroy(int $id): JsonResponse
    {
        $user   = Auth::user();
        $client = AccountingClient::forOrg($user->organization_id)->findOrFail($id);

        if ($client->invoices()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer un client avec des factures.'], 422);
        }

        $this->audit->logDeleted('accounting', 'client', $client->id, ['name' => $client->name]);
        $client->delete();

        return response()->json(['message' => 'Client supprimé.']);
    }

    // =========================================================================
    // FACTURES
    // =========================================================================

    public function invoicesIndex(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $query = Invoice::forOrg($orgId)
            ->with('client:id,name,email')
            ->orderByDesc('issue_date');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($clientId = $request->input('client_id')) {
            $query->where('client_id', $clientId);
        }

        if ($from = $request->input('date_from')) {
            $query->where('issue_date', '>=', $from);
        }

        if ($to = $request->input('date_to')) {
            $query->where('issue_date', '<=', $to);
        }

        if ($search = $request->input('search')) {
            $query->where(fn($q) => $q
                ->where('invoice_number', 'like', "%{$search}%")
                ->orWhere('title', 'like', "%{$search}%")
            );
        }

        $invoices = $query->paginate(20)->withQueryString();
        $clients  = AccountingClient::forOrg($orgId)->active()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Comptabilite/Invoices', [
            'invoices' => $invoices,
            'clients'  => $clients,
            'filters'  => $request->only(['status', 'client_id', 'date_from', 'date_to', 'search']),
        ]);
    }

    public function invoicesCreate(): InertiaResponse
    {
        $user    = Auth::user();
        $clients = AccountingClient::forOrg($user->organization_id)->active()->orderBy('name')->get(['id', 'name', 'email', 'tax_number']);

        return Inertia::render('Comptabilite/InvoiceForm', [
            'clients'     => $clients,
            'invoice'     => null,
            'defaultTax'  => 18.0,
        ]);
    }

    public function invoicesEdit(int $id): InertiaResponse
    {
        $user    = Auth::user();
        $invoice = Invoice::forOrg($user->organization_id)
            ->with(['client', 'items'])
            ->findOrFail($id);
        $clients = AccountingClient::forOrg($user->organization_id)->active()->orderBy('name')->get(['id', 'name', 'email', 'tax_number']);

        return Inertia::render('Comptabilite/InvoiceForm', [
            'clients'    => $clients,
            'invoice'    => $invoice,
            'defaultTax' => 18.0,
        ]);
    }

    public function invoicesStore(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'client_id'       => 'required|exists:accounting_clients,id',
            'title'           => 'required|string|max:255',
            'issue_date'      => 'required|date',
            'due_date'        => 'nullable|date|after_or_equal:issue_date',
            'tax_rate'        => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string',
            'terms'           => 'nullable|string',
            'items'           => 'required|array|min:1',
            'items.*.description' => 'required|string|max:500',
            'items.*.quantity'    => 'required|numeric|min:0.001',
            'items.*.unit_price'  => 'required|numeric|min:0',
        ]);

        $invoice = $this->accounting->createInvoice($data, $user->organization_id);

        return response()->json([
            'message' => 'Facture créée.',
            'invoice' => $invoice,
        ], 201);
    }

    public function invoicesUpdate(Request $request, int $id): JsonResponse
    {
        $user    = Auth::user();
        $invoice = Invoice::forOrg($user->organization_id)->findOrFail($id);

        if (! in_array($invoice->status, ['draft'])) {
            return response()->json(['message' => 'Seules les factures en brouillon peuvent être modifiées.'], 422);
        }

        $data = $request->validate([
            'client_id'       => 'sometimes|exists:accounting_clients,id',
            'title'           => 'sometimes|string|max:255',
            'issue_date'      => 'sometimes|date',
            'due_date'        => 'nullable|date',
            'tax_rate'        => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'notes'           => 'nullable|string',
            'terms'           => 'nullable|string',
            'items'           => 'sometimes|array|min:1',
            'items.*.description' => 'required_with:items|string|max:500',
            'items.*.quantity'    => 'required_with:items|numeric|min:0.001',
            'items.*.unit_price'  => 'required_with:items|numeric|min:0',
        ]);

        $invoice = $this->accounting->updateInvoice($invoice, $data);

        return response()->json(['message' => 'Facture mise à jour.', 'invoice' => $invoice]);
    }

    public function invoicesDestroy(int $id): JsonResponse
    {
        $user    = Auth::user();
        $invoice = Invoice::forOrg($user->organization_id)->findOrFail($id);

        if ($invoice->status === 'paid') {
            return response()->json(['message' => 'Impossible de supprimer une facture payée.'], 422);
        }

        $this->audit->logDeleted('accounting', 'invoice', $invoice->id, [
            'invoice_number' => $invoice->invoice_number,
        ]);
        $invoice->delete();

        return response()->json(['message' => 'Facture supprimée.']);
    }

    /**
     * POST /invoices/{id}/send — Envoie la facture par email.
     */
    public function invoicesSend(int $id): JsonResponse
    {
        $user    = Auth::user();
        $invoice = Invoice::forOrg($user->organization_id)->findOrFail($id);

        $this->accounting->sendInvoiceByEmail($invoice);

        return response()->json(['message' => "Facture {$invoice->invoice_number} envoyée par email."]);
    }

    /**
     * POST /invoices/{id}/pay — Enregistre un paiement.
     */
    public function invoicesPay(Request $request, int $id): JsonResponse
    {
        $user    = Auth::user();
        $invoice = Invoice::forOrg($user->organization_id)->findOrFail($id);

        $data = $request->validate([
            'amount'         => 'required|numeric|min:0.01',
            'payment_date'   => 'required|date',
            'payment_method' => 'required|in:virement,mobile_money,especes,cheque,carte',
            'reference'      => 'nullable|string|max:100',
            'notes'          => 'nullable|string',
        ]);

        $receipt = $this->accounting->recordPayment($invoice, $data);

        return response()->json([
            'message' => 'Paiement enregistré.',
            'receipt' => $receipt,
            'invoice' => $invoice->fresh(),
        ]);
    }

    /**
     * GET /invoices/{id}/pdf — Télécharge le PDF de la facture.
     */
    public function invoicesPdf(int $id): Response
    {
        $user    = Auth::user();
        $invoice = Invoice::forOrg($user->organization_id)
            ->with(['client', 'items', 'organization'])
            ->findOrFail($id);

        $pdfPath = $this->accounting->generateInvoicePdf($invoice);

        return response()->download(
            $pdfPath,
            "facture-{$invoice->invoice_number}.pdf",
            ['Content-Type' => 'application/pdf']
        )->deleteFileAfterSend(true);
    }

    // =========================================================================
    // DEVIS
    // =========================================================================

    public function quotesIndex(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $query = Quote::forOrg($orgId)
            ->with('client:id,name')
            ->orderByDesc('issue_date');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $quotes  = $query->paginate(20)->withQueryString();
        $clients = AccountingClient::forOrg($orgId)->active()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Comptabilite/Quotes', [
            'quotes'  => $quotes,
            'clients' => $clients,
            'filters' => $request->only(['status', 'client_id']),
        ]);
    }

    public function quotesStore(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'client_id'   => 'required|exists:accounting_clients,id',
            'title'       => 'required|string|max:255',
            'issue_date'  => 'required|date',
            'valid_until' => 'nullable|date|after_or_equal:issue_date',
            'tax_rate'    => 'nullable|numeric|min:0|max:100',
            'notes'       => 'nullable|string',
            'terms'       => 'nullable|string',
            'items'       => 'required|array|min:1',
            'items.*.description' => 'required|string|max:500',
            'items.*.quantity'    => 'required|numeric|min:0.001',
            'items.*.unit_price'  => 'required|numeric|min:0',
        ]);

        $taxRate  = (float) ($data['tax_rate'] ?? 18.0);
        $items    = $data['items'];
        $subtotal = collect($items)->sum(fn($i) => (float) $i['quantity'] * (float) $i['unit_price']);
        $taxAmt   = round($subtotal * $taxRate / 100, 2);

        $quote = Quote::create([
            'organization_id' => $user->organization_id,
            'client_id'       => $data['client_id'],
            'quote_number'    => Quote::generateQuoteNumber($user->organization_id),
            'title'           => $data['title'],
            'issue_date'      => $data['issue_date'],
            'valid_until'     => $data['valid_until'] ?? null,
            'status'          => 'draft',
            'subtotal'        => $subtotal,
            'tax_rate'        => $taxRate,
            'tax_amount'      => $taxAmt,
            'total'           => round($subtotal + $taxAmt, 2),
            'notes'           => $data['notes'] ?? null,
            'terms'           => $data['terms'] ?? null,
            'created_by'      => $user->id,
        ]);

        foreach ($items as $i => $item) {
            $quote->items()->create([
                'description' => $item['description'],
                'quantity'    => $item['quantity'],
                'unit_price'  => $item['unit_price'],
                'total'       => round((float) $item['quantity'] * (float) $item['unit_price'], 2),
                'sort_order'  => $i,
            ]);
        }

        $this->audit->logCreated('accounting', 'quote', $quote->id, [
            'quote_number' => $quote->quote_number,
        ]);

        return response()->json([
            'message' => 'Devis créé.',
            'quote'   => $quote->load(['client', 'items']),
        ], 201);
    }

    /**
     * GET /quotes/{id}/pdf — Télécharge le PDF du devis.
     */
    public function quotesPdf(int $id): Response
    {
        $user  = Auth::user();
        $quote = Quote::forOrg($user->organization_id)
            ->with(['client', 'items', 'organization'])
            ->findOrFail($id);

        $pdfPath = $this->accounting->generateQuotePdf($quote);

        return response()->download(
            $pdfPath,
            "devis-{$quote->quote_number}.pdf",
            ['Content-Type' => 'application/pdf']
        )->deleteFileAfterSend(true);
    }

    /**
     * GET /quotes/{id}/convert — Convertit le devis en facture.
     */
    public function quotesConvert(int $id): JsonResponse
    {
        $user  = Auth::user();
        $quote = Quote::forOrg($user->organization_id)->findOrFail($id);

        $invoice = $quote->convertToInvoice();

        $this->audit->log('converted', 'accounting', 'quote', $quote->id, [], [
            'invoice_id'     => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
        ]);

        return response()->json([
            'message' => "Devis converti en facture {$invoice->invoice_number}.",
            'invoice' => $invoice,
        ]);
    }

    // =========================================================================
    // DÉPENSES
    // =========================================================================

    public function expensesIndex(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $query = AccountingExpense::forOrg($orgId)
            ->with(['category', 'creator:id,name'])
            ->orderByDesc('expense_date');

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($categoryId = $request->input('category_id')) {
            $query->where('category_id', $categoryId);
        }

        $expenses   = $query->paginate(20)->withQueryString();
        $categories = ExpenseCategory::forOrg($orgId)->orderBy('name')->get();

        // Budget vs réalisé par catégorie
        $budgetOverview = $categories->map(fn($cat) => [
            'id'             => $cat->id,
            'name'           => $cat->name,
            'color'          => $cat->color,
            'icon'           => $cat->icon,
            'budget_monthly' => $cat->budget_monthly,
            'current_spend'  => $cat->getCurrentMonthSpend(),
            'usage_percent'  => $cat->getBudgetUsagePercent(),
        ]);

        return Inertia::render('Comptabilite/Expenses', [
            'expenses'       => $expenses,
            'categories'     => $categories,
            'budgetOverview' => $budgetOverview,
            'filters'        => $request->only(['status', 'category_id']),
        ]);
    }

    public function expensesStore(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'category_id'  => 'required|exists:expense_categories,id',
            'title'        => 'required|string|max:255',
            'amount'       => 'required|numeric|min:0.01',
            'expense_date' => 'required|date',
            'vendor'       => 'nullable|string|max:150',
            'notes'        => 'nullable|string',
            'receipt'      => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $receiptPath = $request->file('receipt')->store(
                "orgs/{$user->organization_id}/expenses/" . now()->format('Y/m'),
                'private'
            );
        }

        $expense = AccountingExpense::create([
            'organization_id' => $user->organization_id,
            'category_id'     => $data['category_id'],
            'title'           => $data['title'],
            'amount'          => $data['amount'],
            'expense_date'    => $data['expense_date'],
            'vendor'          => $data['vendor'] ?? null,
            'receipt_path'    => $receiptPath,
            'status'          => 'pending',
            'notes'           => $data['notes'] ?? null,
            'created_by'      => $user->id,
        ]);

        $this->audit->logCreated('accounting', 'expense', $expense->id, [
            'title'  => $expense->title,
            'amount' => $expense->amount,
        ]);

        return response()->json(['message' => 'Dépense créée.', 'expense' => $expense->load('category')], 201);
    }

    public function expensesApprove(int $id): JsonResponse
    {
        $user    = Auth::user();
        $expense = AccountingExpense::forOrg($user->organization_id)->findOrFail($id);

        $expense->approve($user->id);
        $this->audit->log('approved', 'accounting', 'expense', $expense->id);

        return response()->json(['message' => 'Dépense approuvée.', 'expense' => $expense->fresh()]);
    }

    public function expensesReject(int $id): JsonResponse
    {
        $user    = Auth::user();
        $expense = AccountingExpense::forOrg($user->organization_id)->findOrFail($id);

        $expense->reject($user->id);
        $this->audit->log('rejected', 'accounting', 'expense', $expense->id);

        return response()->json(['message' => 'Dépense refusée.', 'expense' => $expense->fresh()]);
    }

    // =========================================================================
    // EXPORT
    // =========================================================================

    /**
     * GET /accounting/export — Export CSV comptable.
     */
    public function export(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $user  = Auth::user();
        $start = Carbon::parse($request->input('start', now()->startOfYear()));
        $end   = Carbon::parse($request->input('end', now()->endOfYear()));

        $csv      = $this->accounting->exportAccountingCsv($user->organization_id, $start, $end);
        $filename = "export-comptable-{$start->format('Y-m-d')}-{$end->format('Y-m-d')}.csv";

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
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
