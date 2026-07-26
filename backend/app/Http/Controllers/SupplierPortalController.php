<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use App\Models\Rfq;
use App\Models\Supplier;
use App\Services\SupplierPortalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SupplierPortalController
 *
 * Routes publiques — authentification via session portail (pas Sanctum/Breeze).
 * Préfixe : /supplier-portal
 */
class SupplierPortalController extends Controller
{
    public function __construct(private readonly SupplierPortalService $service) {}

    // ─────────────────────────────────────────────────────────────────────────
    //  AUTHENTIFICATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /supplier-portal — Page de connexion.
     */
    public function loginPage(): Response
    {
        if ($this->getAuthenticatedSupplier()) {
            return Inertia::render('Portal/SupplierPortal', $this->loadDashboardData());
        }

        return Inertia::render('Portal/SupplierPortal', ['view' => 'login']);
    }

    /**
     * POST /supplier-portal/login
     */
    public function login(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $supplier = $this->service->authenticateSupplier(
            $validated['email'],
            $validated['password']
        );

        if (!$supplier) {
            return back()->withErrors(['email' => 'Email ou mot de passe incorrect.']);
        }

        Session::put('supplier_portal_id', $supplier->id);
        Session::put('supplier_portal_org', $supplier->organization_id);

        return redirect('/supplier-portal/dashboard');
    }

    /**
     * POST /supplier-portal/logout
     */
    public function logout(): RedirectResponse
    {
        Session::forget(['supplier_portal_id', 'supplier_portal_org']);
        return redirect('/supplier-portal');
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /supplier-portal/dashboard
     */
    public function dashboard(): Response
    {
        $supplier = $this->requireSupplier();

        $data = $this->service->getSupplierDashboard($supplier);

        return Inertia::render('Portal/SupplierPortal', array_merge($data, ['view' => 'dashboard']));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  APPELS D'OFFRES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /supplier-portal/rfqs — Liste les AO ouverts pour ce fournisseur.
     */
    public function rfqs(): Response
    {
        $supplier = $this->requireSupplier();
        $rfqs     = $this->service->getSupplierRfqs($supplier);

        return Inertia::render('Portal/SupplierPortal', [
            'view' => 'rfqs',
            'rfqs' => $rfqs,
        ]);
    }

    /**
     * POST /supplier-portal/rfqs/{rfq}/respond — Soumettre une offre.
     */
    public function respondToRfq(Request $request, Rfq $rfq): RedirectResponse
    {
        $supplier = $this->requireSupplier();

        $validated = $request->validate([
            'items'             => 'required|array|min:1',
            'items.*.description'   => 'required|string',
            'items.*.qty'           => 'required|numeric|min:0',
            'items.*.unit'          => 'required|string',
            'items.*.unit_price'    => 'required|numeric|min:0',
            'items.*.delivery_days' => 'nullable|integer',
            'validity_days'     => 'nullable|integer|min:1',
            'delivery_days'     => 'nullable|integer|min:1',
            'payment_terms'     => 'nullable|string|max:200',
            'notes'             => 'nullable|string',
        ]);

        $this->service->submitQuotation($supplier, $rfq, $validated);

        return redirect('/supplier-portal/rfqs')->with('success', 'Votre offre a été soumise avec succès.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  COMMANDES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /supplier-portal/orders — Liste les commandes du fournisseur.
     */
    public function orders(): Response
    {
        $supplier = $this->requireSupplier();
        $orders   = $this->service->getSupplierOrders($supplier);

        return Inertia::render('Portal/SupplierPortal', [
            'view'   => 'orders',
            'orders' => $orders,
        ]);
    }

    /**
     * POST /supplier-portal/orders/{po}/acknowledge — Accuser réception.
     */
    public function acknowledgeOrder(PurchaseOrder $po): RedirectResponse
    {
        $supplier = $this->requireSupplier();

        $this->service->acknowledgeOrder($po, $supplier);

        return back()->with('success', 'Bon de commande accusé de réception.');
    }

    /**
     * POST /supplier-portal/orders/{po}/invoice — Déposer une facture.
     */
    public function uploadInvoice(Request $request, PurchaseOrder $po): RedirectResponse
    {
        $supplier = $this->requireSupplier();

        $request->validate([
            'invoice_file'   => 'required|file|mimes:pdf|max:10240',
            'invoice_number' => 'nullable|string|max:50',
        ]);

        $this->service->uploadInvoice($po, $supplier, $request->file('invoice_file'));

        return back()->with('success', 'Facture déposée avec succès.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function getAuthenticatedSupplier(): ?Supplier
    {
        $id = Session::get('supplier_portal_id');
        if (!$id) return null;

        return Supplier::where('id', $id)->where('portal_access', true)->first();
    }

    private function requireSupplier(): Supplier
    {
        $supplier = $this->getAuthenticatedSupplier();

        if (!$supplier) {
            abort(redirect('/supplier-portal'));
        }

        return $supplier;
    }

    private function loadDashboardData(): array
    {
        $supplier = $this->getAuthenticatedSupplier();
        if (!$supplier) return ['view' => 'login'];

        $data = $this->service->getSupplierDashboard($supplier);
        return array_merge($data, ['view' => 'dashboard']);
    }
}
