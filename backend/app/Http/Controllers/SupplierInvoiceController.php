<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Services\PurchaseAccountingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Factures fournisseurs — dernière étape du cycle achat.
 *
 * C'est le seul document qui porte la TVA déductible : sans lui, l'entreprise
 * déclare la TVA qu'elle collecte sans déduire celle qu'elle a supportée.
 */
class SupplierInvoiceController extends Controller
{
    public function __construct(private PurchaseAccountingService $comptabilite) {}

    public function index(Request $request): Response
    {
        $orgId = $request->user()->organization_id;

        $factures = SupplierInvoice::with('supplier:id,company_name')
            ->where('organization_id', $orgId)
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->orderByDesc('invoice_date')
            ->limit(200)
            ->get();

        // Une seule requête pour savoir lesquelles sont comptabilisées, plutôt
        // qu'un appel par ligne.
        $comptabilisees = DB::table('journal_entries')
            ->where('organization_id', $orgId)
            ->where('reference', 'like', 'FF/%')
            ->pluck('reference')
            ->flip();

        return Inertia::render('Achats/FacturesFournisseurs', [
            'factures' => $factures->map(fn ($f) => [
                'id'             => $f->id,
                'invoice_number' => $f->invoice_number,
                'supplier'       => $f->supplier->company_name ?? '—',
                'invoice_date'   => optional($f->invoice_date)->format('d/m/Y'),
                'due_date'       => optional($f->due_date)->format('d/m/Y'),
                'subtotal'       => $f->subtotal,
                'tax_amount'     => $f->tax_amount,
                'total'          => $f->total,
                'paid_amount'    => $f->paid_amount,
                'status'         => $f->status,
                'comptabilisee'  => isset($comptabilisees['FF/' . $f->supplier_id . '/' . $f->invoice_number]),
            ])->values(),
            'fournisseurs' => Supplier::where('organization_id', $orgId)
                ->orderBy('company_name')
                ->get(['id', 'company_name']),
            'comptesCharge' => DB::table('chart_of_accounts')
                ->where('organization_id', $orgId)
                ->where('ohada_class', 6)
                ->orderBy('account_number')
                ->get(['account_number', 'account_name']),
            'aComptabiliser' => $this->comptabilite->facturesNonComptabilisees($orgId)->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $valide = $request->validate([
            'supplier_id'     => ['required', 'integer', 'exists:suppliers,id'],
            'invoice_number'  => ['required', 'string', 'max:100'],
            'invoice_date'    => ['required', 'date'],
            'due_date'        => ['nullable', 'date', 'after_or_equal:invoice_date'],
            'subtotal'        => ['required', 'numeric', 'min:0'],
            'tax_rate'        => ['nullable', 'numeric', 'min:0', 'max:100'],
            'tax_amount'      => ['required', 'numeric', 'min:0'],
            'total'           => ['required', 'numeric', 'min:0.01'],
            'expense_account' => ['nullable', 'string', 'max:20'],
            'notes'           => ['nullable', 'string', 'max:2000'],
        ]);

        // Contrôle de cohérence dès la saisie : le corriger plus tard suppose
        // d'avoir remarqué l'erreur, ce qui n'arrive presque jamais.
        if (abs(($valide['subtotal'] + $valide['tax_amount']) - $valide['total']) > 0.01) {
            return back()->withErrors([
                'facture' => 'Le total TTC ne correspond pas au HT plus la TVA.',
            ]);
        }

        $orgId = $request->user()->organization_id;

        $doublon = SupplierInvoice::where('organization_id', $orgId)
            ->where('supplier_id', $valide['supplier_id'])
            ->where('invoice_number', $valide['invoice_number'])
            ->exists();

        if ($doublon) {
            return back()->withErrors([
                'facture' => "Ce fournisseur a déjà une facture n° {$valide['invoice_number']}. "
                           . "C'est le garde-fou le plus efficace contre le double paiement.",
            ]);
        }

        SupplierInvoice::create($valide + [
            'organization_id' => $orgId,
            'currency'        => 'XOF',
            'status'          => 'received',
            'created_by'      => $request->user()->id,
        ]);

        return back()->with('success', 'Facture fournisseur enregistrée.');
    }

    /** POST /achats/factures/{id}/comptabiliser */
    public function comptabiliser(Request $request, int $id): RedirectResponse
    {
        $facture = SupplierInvoice::where('organization_id', $request->user()->organization_id)
            ->findOrFail($id);

        try {
            $ecriture = $this->comptabilite->comptabiliserFacture($facture, $request->user());
        } catch (\Throwable $e) {
            return back()->withErrors(['comptabilisation' => $e->getMessage()]);
        }

        return back()->with('success', "Facture comptabilisée — écriture {$ecriture->entry_number}.");
    }

    /** POST /achats/factures/comptabiliser-tout */
    public function comptabiliserTout(Request $request): RedirectResponse
    {
        $ok = 0;
        $erreurs = [];

        foreach ($this->comptabilite->facturesNonComptabilisees($request->user()->organization_id) as $facture) {
            try {
                $this->comptabilite->comptabiliserFacture($facture, $request->user());
                $ok++;
            } catch (\Throwable $e) {
                $erreurs[] = $facture->invoice_number . ' : ' . $e->getMessage();
            }
        }

        return $erreurs
            ? back()->with('success', "{$ok} facture(s) comptabilisée(s).")
                    ->withErrors(['comptabilisation' => $erreurs])
            : back()->with('success', "{$ok} facture(s) comptabilisée(s).");
    }
}
