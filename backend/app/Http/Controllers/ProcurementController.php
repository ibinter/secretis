<?php

namespace App\Http\Controllers;

use App\Models\GoodsReceipt;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Quotation;
use App\Models\Rfq;
use App\Models\Supplier;
use App\Models\SupplierEvaluation;
use App\Services\ProcurementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProcurementController extends Controller
{
    public function __construct(private readonly ProcurementService $service) {}

    // ═════════════════════════════════════════════════════════════════════════
    //  DASHBOARD
    // ═════════════════════════════════════════════════════════════════════════

    public function dashboard(): Response
    {
        $data = $this->service->getDashboardData(Auth::user()->organization_id);

        return Inertia::render('Achats/Dashboard', $data);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  FOURNISSEURS
    // ═════════════════════════════════════════════════════════════════════════

    public function suppliersIndex(Request $request): Response
    {
        $query = Supplier::where('organization_id', Auth::user()->organization_id)
            ->when($request->search, fn($q, $s) => $q->where('company_name', 'like', "%$s%")
                ->orWhere('supplier_number', 'like', "%$s%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->category, fn($q, $c) => $q->where('category', $c))
            ->orderBy('company_name');

        $suppliers = $query->paginate(20)->withQueryString();

        return Inertia::render('Achats/SupplierBase', [
            'suppliers' => $suppliers,
            'filters'   => $request->only(['search', 'status', 'category']),
        ]);
    }

    public function supplierStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'company_name'       => 'required|string|max:200',
            'legal_form'         => 'nullable|string|max:50',
            'country'            => 'nullable|string|max:100',
            'city'               => 'nullable|string|max:100',
            'address'            => 'nullable|string',
            'contact_name'       => 'nullable|string|max:150',
            'email'              => 'nullable|email',
            'phone'              => 'nullable|string|max:30',
            'website'            => 'nullable|url',
            'tax_number'         => 'nullable|string|max:50',
            'rccm'               => 'nullable|string|max:50',
            'bank_name'          => 'nullable|string|max:100',
            'bank_iban'          => 'nullable|string|max:50',
            'bank_swift'         => 'nullable|string|max:20',
            'category'           => 'required|in:materiel,services,consommables,travaux,it,autre',
            'payment_terms_days' => 'nullable|integer|in:30,45,60,90',
            'currency_code'      => 'nullable|string|size:3',
            'notes'              => 'nullable|string',
        ]);

        // Générer le numéro fournisseur
        $orgId = Auth::user()->organization_id;
        $last  = Supplier::where('organization_id', $orgId)->lockForUpdate()->count();
        $number = sprintf('FOURN-%04d', $last + 1);

        Supplier::create(array_merge($validated, [
            'organization_id' => $orgId,
            'supplier_number' => $number,
            'status'          => 'prospect',
        ]));

        return back()->with('success', 'Fournisseur créé avec succès.');
    }

    public function supplierUpdate(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorizeOrg($supplier);

        $validated = $request->validate([
            'company_name'       => 'sometimes|string|max:200',
            'legal_form'         => 'nullable|string|max:50',
            'country'            => 'nullable|string|max:100',
            'city'               => 'nullable|string|max:100',
            'address'            => 'nullable|string',
            'contact_name'       => 'nullable|string|max:150',
            'email'              => 'nullable|email',
            'phone'              => 'nullable|string|max:30',
            'website'            => 'nullable|url',
            'tax_number'         => 'nullable|string|max:50',
            'rccm'               => 'nullable|string|max:50',
            'bank_name'          => 'nullable|string|max:100',
            'bank_iban'          => 'nullable|string|max:50',
            'bank_swift'         => 'nullable|string|max:20',
            'category'           => 'sometimes|in:materiel,services,consommables,travaux,it,autre',
            'status'             => 'sometimes|in:prospect,actif,suspendu,blackliste',
            'payment_terms_days' => 'nullable|integer|in:30,45,60,90',
            'currency_code'      => 'nullable|string|size:3',
            'notes'              => 'nullable|string',
        ]);

        $supplier->update($validated);

        return back()->with('success', 'Fournisseur mis à jour.');
    }

    public function supplierDestroy(Supplier $supplier): RedirectResponse
    {
        $this->authorizeOrg($supplier);
        $supplier->delete();
        return back()->with('success', 'Fournisseur supprimé.');
    }

    public function supplierScorecard(Supplier $supplier): Response
    {
        $this->authorizeOrg($supplier);
        $scorecard = $this->service->getSupplierScorecard($supplier);

        return Inertia::render('Achats/SupplierScorecard', $scorecard);
    }

    public function supplierEvaluate(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorizeOrg($supplier);

        $validated = $request->validate([
            'quality_score'       => 'required|integer|min:1|max:5',
            'delivery_score'      => 'required|integer|min:1|max:5',
            'price_score'         => 'required|integer|min:1|max:5',
            'communication_score' => 'required|integer|min:1|max:5',
            'comments'            => 'nullable|string',
            'recommend'           => 'boolean',
            'purchase_order_id'   => 'nullable|exists:purchase_orders,id',
        ]);

        $po = isset($validated['purchase_order_id'])
            ? PurchaseOrder::find($validated['purchase_order_id'])
            : null;

        $this->service->evaluateSupplier(
            $supplier,
            array_merge($validated, ['evaluator_user_id' => Auth::id()]),
            $po
        );

        return back()->with('success', 'Évaluation enregistrée.');
    }

    public function supplierTogglePortal(Request $request, Supplier $supplier): RedirectResponse
    {
        $this->authorizeOrg($supplier);

        $validated = $request->validate([
            'portal_email' => 'required|email',
        ]);

        if ($supplier->portal_access) {
            $supplier->update(['portal_access' => false]);
            return back()->with('success', 'Accès portail désactivé.');
        }

        $portalService = app(\App\Services\SupplierPortalService::class);
        $password = $portalService->generatePortalCredentials($supplier, $validated['portal_email']);

        return back()->with('success', "Accès portail activé. Mot de passe envoyé à {$validated['portal_email']}.");
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  DEMANDES D'ACHAT
    // ═════════════════════════════════════════════════════════════════════════

    public function prIndex(Request $request): Response
    {
        $query = PurchaseRequest::where('organization_id', Auth::user()->organization_id)
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->priority, fn($q, $p) => $q->where('priority', $p))
            ->when($request->search, fn($q, $s) => $q->where('title', 'like', "%$s%")
                ->orWhere('pr_number', 'like', "%$s%"))
            ->with(['requestor', 'approver'])
            ->orderByDesc('created_at');

        return Inertia::render('Achats/PurchaseRequests', [
            'purchase_requests' => $query->paginate(20)->withQueryString(),
            'filters'           => $request->only(['status', 'priority', 'search']),
        ]);
    }

    public function prStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title'          => 'required|string|max:200',
            'description'    => 'nullable|string',
            'priority'       => 'required|in:normale,urgente,tres_urgente',
            'needed_by_date' => 'nullable|date',
            'justification'  => 'nullable|string',
            'department_id'  => 'nullable|exists:departments,id',
            'items'          => 'required|array|min:1',
            'items.*.description'    => 'required|string',
            'items.*.qty'            => 'required|numeric|min:0.01',
            'items.*.unit'           => 'required|string',
            'items.*.unit_price_est' => 'nullable|numeric|min:0',
        ]);

        $this->service->createPurchaseRequest(array_merge($validated, [
            'organization_id'  => Auth::user()->organization_id,
            'requestor_user_id'=> Auth::id(),
        ]));

        return back()->with('success', 'Demande d\'achat créée.');
    }

    public function prSubmit(PurchaseRequest $pr): RedirectResponse
    {
        $this->authorizeOrg($pr);
        $this->service->submitPurchaseRequest($pr);
        return back()->with('success', 'Demande soumise pour approbation.');
    }

    public function prApprove(Request $request, PurchaseRequest $pr): RedirectResponse
    {
        $this->authorizeOrg($pr);
        $this->service->approvePurchaseRequest($pr, Auth::user());
        return back()->with('success', 'Demande approuvée.');
    }

    public function prRefuse(Request $request, PurchaseRequest $pr): RedirectResponse
    {
        $this->authorizeOrg($pr);
        $validated = $request->validate(['reason' => 'required|string|max:500']);
        $this->service->refusePurchaseRequest($pr, Auth::user(), $validated['reason']);
        return back()->with('success', 'Demande refusée.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  APPELS D'OFFRES
    // ═════════════════════════════════════════════════════════════════════════

    public function rfqIndex(Request $request): Response
    {
        $rfqs = Rfq::where('organization_id', Auth::user()->organization_id)
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->with(['purchaseRequest', 'rfqSuppliers.supplier'])
            ->withCount('rfqSuppliers')
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Achats/RfqManagement', [
            'rfqs'      => $rfqs,
            'filters'   => $request->only(['status']),
            'suppliers' => Supplier::where('organization_id', Auth::user()->organization_id)
                ->where('status', 'actif')
                ->get(['id', 'company_name', 'category', 'email', 'rating']),
        ]);
    }

    public function rfqStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title'               => 'required|string|max:200',
            'description'         => 'nullable|string',
            'purchase_request_id' => 'nullable|exists:purchase_requests,id',
            'items'               => 'required|array|min:1',
            'closing_date'        => 'required|date|after:today',
            'evaluation_criteria' => 'nullable|array',
            'notes'               => 'nullable|string',
        ]);

        $pr = isset($validated['purchase_request_id'])
            ? PurchaseRequest::find($validated['purchase_request_id'])
            : null;

        $this->service->createRfq(array_merge($validated, [
            'organization_id' => Auth::user()->organization_id,
            'created_by'      => Auth::id(),
        ]), $pr);

        return back()->with('success', 'Appel d\'offres créé.');
    }

    public function rfqInviteSuppliers(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorizeOrg($rfq);
        $validated = $request->validate([
            'supplier_ids'   => 'required|array|min:1',
            'supplier_ids.*' => 'exists:suppliers,id',
        ]);

        $this->service->inviteSuppliers($rfq, $validated['supplier_ids']);

        return back()->with('success', count($validated['supplier_ids']) . ' fournisseur(s) invité(s).');
    }

    public function rfqSubmitQuotation(Request $request, Rfq $rfq, int $supplierId): RedirectResponse
    {
        $this->authorizeOrg($rfq);

        $validated = $request->validate([
            'items'           => 'required|array|min:1',
            'items.*.description'  => 'required|string',
            'items.*.qty'          => 'required|numeric|min:0',
            'items.*.unit'         => 'required|string',
            'items.*.unit_price'   => 'required|numeric|min:0',
            'validity_days'        => 'nullable|integer|min:1',
            'delivery_days'        => 'nullable|integer|min:1',
            'payment_terms'        => 'nullable|string|max:200',
            'notes'                => 'nullable|string',
        ]);

        $this->service->receiveQuotation($rfq, $supplierId, array_merge($validated, [
            'organization_id' => $rfq->organization_id,
        ]));

        return back()->with('success', 'Devis enregistré.');
    }

    public function rfqEvaluate(Request $request, Rfq $rfq): \Illuminate\Http\JsonResponse
    {
        $this->authorizeOrg($rfq);

        // Mise à jour des scores techniques si fournis
        if ($request->has('technical_scores')) {
            foreach ($request->technical_scores as $quotationId => $score) {
                Quotation::where('id', $quotationId)
                    ->where('rfq_id', $rfq->id)
                    ->update(['technical_score' => $score]);
            }
        }

        $results = $this->service->evaluateQuotations($rfq);

        return response()->json(['results' => $results]);
    }

    public function rfqSelectQuotation(Request $request, Rfq $rfq): RedirectResponse
    {
        $this->authorizeOrg($rfq);

        $validated = $request->validate([
            'quotation_id' => 'required|exists:quotations,id',
            'justification'=> 'required|string|min:20',
        ]);

        $quotation = Quotation::findOrFail($validated['quotation_id']);
        $this->service->selectQuotation($rfq, $quotation, $validated['justification']);

        return back()->with('success', 'Devis sélectionné. Les fournisseurs ont été notifiés.');
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  BONS DE COMMANDE
    // ═════════════════════════════════════════════════════════════════════════

    public function poIndex(Request $request): Response
    {
        $pos = PurchaseOrder::where('organization_id', Auth::user()->organization_id)
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->supplier_id, fn($q, $s) => $q->where('supplier_id', $s))
            ->with(['supplier', 'rfq', 'quotation'])
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Achats/PurchaseOrders', [
            'purchase_orders' => $pos,
            'filters'         => $request->only(['status', 'supplier_id']),
            'suppliers'       => Supplier::where('organization_id', Auth::user()->organization_id)
                ->where('status', 'actif')
                ->get(['id', 'company_name']),
        ]);
    }

    public function poStore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id'           => 'required|exists:suppliers,id',
            'quotation_id'          => 'nullable|exists:quotations,id',
            'rfq_id'                => 'nullable|exists:rfqs,id',
            'purchase_request_id'   => 'nullable|exists:purchase_requests,id',
            'items'                 => 'required|array|min:1',
            'items.*.description'   => 'required|string',
            'items.*.qty'           => 'required|numeric|min:0.01',
            'items.*.unit'          => 'required|string',
            'items.*.unit_price'    => 'required|numeric|min:0',
            'items.*.tax_rate'      => 'nullable|numeric|min:0|max:100',
            'payment_terms_days'    => 'nullable|integer|in:30,45,60,90',
            'delivery_address'      => 'nullable|string',
            'expected_delivery_date'=> 'nullable|date',
            'notes'                 => 'nullable|string',
        ]);

        $this->service->createPurchaseOrder(array_merge($validated, [
            'organization_id' => Auth::user()->organization_id,
            'created_by'      => Auth::id(),
        ]));

        return back()->with('success', 'Bon de commande créé.');
    }

    public function poApprove(PurchaseOrder $po): RedirectResponse
    {
        $this->authorizeOrg($po);

        $po->update([
            'status'      => 'approuve',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        return back()->with('success', 'Bon de commande approuvé.');
    }

    public function poSend(PurchaseOrder $po): RedirectResponse
    {
        $this->authorizeOrg($po);
        $this->service->sendPurchaseOrder($po);
        return back()->with('success', 'Bon de commande envoyé au fournisseur.');
    }

    public function poReceive(Request $request, PurchaseOrder $po): RedirectResponse
    {
        $this->authorizeOrg($po);

        $validated = $request->validate([
            'received_date'               => 'required|date',
            'notes'                       => 'nullable|string',
            'items_received'              => 'required|array',
            'items_received.*.po_item_ref'  => 'required|integer',
            'items_received.*.description'  => 'required|string',
            'items_received.*.qty_ordered'  => 'required|numeric',
            'items_received.*.qty_received' => 'required|numeric|min:0',
            'items_received.*.qty_rejected' => 'nullable|numeric|min:0',
            'items_received.*.rejection_reason' => 'nullable|string',
        ]);

        $this->service->receiveGoods($po, array_merge($validated, [
            'received_by' => Auth::id(),
        ]));

        return back()->with('success', 'Bon de réception enregistré.');
    }

    public function poDestroy(PurchaseOrder $po): RedirectResponse
    {
        $this->authorizeOrg($po);

        if (!in_array($po->status, ['brouillon', 'annule'])) {
            return back()->withErrors(['error' => 'Seuls les BC en brouillon peuvent être supprimés.']);
        }

        $po->delete();
        return back()->with('success', 'Bon de commande supprimé.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helper
    // ─────────────────────────────────────────────────────────────────────────

    private function authorizeOrg(mixed $model): void
    {
        if ($model->organization_id !== Auth::user()->organization_id) {
            abort(403);
        }
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
