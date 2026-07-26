<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\Rfq;
use App\Models\RfqSupplier;
use App\Models\Supplier;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/**
 * SupplierPortalService
 *
 * Portail fournisseur externe — accessible sans compte SECRETIS.
 * Les fournisseurs s'authentifient avec portal_email / portal_password_hash.
 */
class SupplierPortalService
{
    /**
     * Authentifie un fournisseur sur le portail externe.
     */
    public function authenticateSupplier(string $email, string $password): ?Supplier
    {
        $supplier = Supplier::where('portal_email', $email)
            ->where('portal_access', true)
            ->where('status', 'actif')
            ->first();

        if (!$supplier || !Hash::check($password, $supplier->portal_password_hash)) {
            return null;
        }

        return $supplier;
    }

    /**
     * Génère ou réinitialise le mot de passe portail d'un fournisseur.
     * Retourne le mot de passe en clair (à envoyer par email une seule fois).
     */
    public function generatePortalCredentials(Supplier $supplier, string $email): string
    {
        $password = $this->generateSecurePassword();

        $supplier->update([
            'portal_access'        => true,
            'portal_email'         => $email,
            'portal_password_hash' => Hash::make($password),
        ]);

        // Mail::to($email)->send(new \App\Mail\SupplierPortalCredentialsMail($supplier, $email, $password));

        return $password;
    }

    /**
     * Retourne le tableau de bord d'un fournisseur sur le portail.
     */
    public function getSupplierDashboard(Supplier $supplier): array
    {
        // AO en cours auxquels le fournisseur est invité
        $activeRfqs = Rfq::whereHas('rfqSuppliers', function ($q) use ($supplier) {
            $q->where('supplier_id', $supplier->id)
              ->whereIn('status', ['invite', 'repondu']);
        })
        ->where('status', 'publie')
        ->with(['rfqSuppliers' => fn($q) => $q->where('supplier_id', $supplier->id)])
        ->get()
        ->map(function ($rfq) {
            $rs = $rfq->rfqSuppliers->first();
            return [
                'id'           => $rfq->id,
                'rfq_number'   => $rfq->rfq_number,
                'title'        => $rfq->title,
                'closing_date' => $rfq->closing_date,
                'days_left'    => now()->diffInDays($rfq->closing_date, false),
                'responded'    => $rs?->status === 'repondu',
            ];
        });

        // Commandes actives
        $activeOrders = PurchaseOrder::where('supplier_id', $supplier->id)
            ->whereIn('status', ['envoye', 'accuse', 'livre_partiel'])
            ->get(['id', 'po_number', 'status', 'total_amount_xof', 'expected_delivery_date', 'sent_at']);

        // Commandes en attente d'accusé de réception
        $pendingAck = PurchaseOrder::where('supplier_id', $supplier->id)
            ->where('status', 'envoye')
            ->get(['id', 'po_number', 'total_amount_xof', 'sent_at']);

        // Commandes livrées en attente de facturation
        $pendingInvoice = PurchaseOrder::where('supplier_id', $supplier->id)
            ->where('status', 'livre')
            ->whereNull('invoice_path')
            ->get(['id', 'po_number', 'total_amount_xof', 'actual_delivery_date']);

        // Historique des commandes terminées
        $completedOrders = PurchaseOrder::where('supplier_id', $supplier->id)
            ->whereIn('status', ['facture', 'clos'])
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get(['id', 'po_number', 'status', 'total_amount_xof', 'actual_delivery_date']);

        return [
            'supplier'        => $supplier->only(['id', 'company_name', 'contact_name', 'email', 'portal_email', 'rating', 'status']),
            'active_rfqs'     => $activeRfqs,
            'active_orders'   => $activeOrders,
            'pending_ack'     => $pendingAck,
            'pending_invoice' => $pendingInvoice,
            'completed_orders'=> $completedOrders,
            'stats' => [
                'rfqs_responded'   => $activeRfqs->where('responded', true)->count(),
                'rfqs_pending'     => $activeRfqs->where('responded', false)->count(),
                'orders_active'    => $activeOrders->count(),
                'orders_to_ack'    => $pendingAck->count(),
                'invoices_to_send' => $pendingInvoice->count(),
            ],
        ];
    }

    /**
     * Soumet une offre depuis le portail fournisseur.
     */
    public function submitQuotation(Supplier $supplier, Rfq $rfq, array $data): Quotation
    {
        // Vérifier que le fournisseur est bien invité à cet AO
        $rfqSupplier = RfqSupplier::where('rfq_id', $rfq->id)
            ->where('supplier_id', $supplier->id)
            ->whereIn('status', ['invite', 'repondu'])
            ->first();

        if (!$rfqSupplier) {
            throw new \LogicException('Vous n\'êtes pas invité à cet appel d\'offres.');
        }

        if ($rfq->status !== 'publie') {
            throw new \LogicException('Cet appel d\'offres n\'est plus ouvert.');
        }

        if (now()->isAfter($rfq->closing_date)) {
            throw new \LogicException('La date limite de soumission est dépassée.');
        }

        $procurementService = app(ProcurementService::class);
        return $procurementService->receiveQuotation($rfq, $supplier->id, array_merge($data, [
            'organization_id' => $rfq->organization_id,
        ]));
    }

    /**
     * Accuse réception d'un bon de commande.
     */
    public function acknowledgeOrder(PurchaseOrder $po, Supplier $supplier): void
    {
        if ($po->supplier_id !== $supplier->id) {
            throw new \LogicException('Ce bon de commande ne vous appartient pas.');
        }

        if ($po->status !== 'envoye') {
            throw new \LogicException('Ce bon de commande n\'est pas en attente d\'accusé de réception.');
        }

        $po->update(['status' => 'accuse']);
    }

    /**
     * Le fournisseur dépose sa facture sur le portail.
     */
    public function uploadInvoice(PurchaseOrder $po, Supplier $supplier, UploadedFile $file): void
    {
        if ($po->supplier_id !== $supplier->id) {
            throw new \LogicException('Ce bon de commande ne vous appartient pas.');
        }

        if (!in_array($po->status, ['livre', 'livre_partiel', 'accuse'])) {
            throw new \LogicException('La facture ne peut être déposée qu\'après livraison ou accusé de réception.');
        }

        $path = $file->store(
            "invoices/{$po->organization_id}/supplier/{$supplier->id}",
            'private'
        );

        $po->update([
            'invoice_path' => $path,
            'status'       => 'facture',
        ]);
    }

    /**
     * Retourne les AO ouverts pour un fournisseur.
     */
    public function getSupplierRfqs(Supplier $supplier): array
    {
        $rfqs = Rfq::whereHas('rfqSuppliers', function ($q) use ($supplier) {
            $q->where('supplier_id', $supplier->id)
              ->whereIn('status', ['invite', 'repondu']);
        })
        ->where('status', 'publie')
        ->where('closing_date', '>', now())
        ->with(['rfqSuppliers' => fn($q) => $q->where('supplier_id', $supplier->id)])
        ->get();

        return $rfqs->map(function ($rfq) use ($supplier) {
            $rs = $rfq->rfqSuppliers->first();
            $myQuotation = Quotation::where('rfq_id', $rfq->id)
                ->where('supplier_id', $supplier->id)
                ->first();

            return [
                'id'             => $rfq->id,
                'rfq_number'     => $rfq->rfq_number,
                'title'          => $rfq->title,
                'description'    => $rfq->description,
                'items'          => $rfq->items,
                'closing_date'   => $rfq->closing_date,
                'days_left'      => now()->diffInDays($rfq->closing_date, false),
                'status'         => $rs?->status,
                'has_responded'  => !is_null($myQuotation),
                'my_quotation'   => $myQuotation ? [
                    'quotation_number' => $myQuotation->quotation_number,
                    'total_amount'     => $myQuotation->total_amount_xof,
                    'submitted_at'     => $myQuotation->submitted_at,
                ] : null,
            ];
        })->toArray();
    }

    /**
     * Retourne les commandes d'un fournisseur.
     */
    public function getSupplierOrders(Supplier $supplier): array
    {
        $orders = PurchaseOrder::where('supplier_id', $supplier->id)
            ->orderByDesc('created_at')
            ->get();

        return $orders->map(fn($po) => [
            'id'                    => $po->id,
            'po_number'             => $po->po_number,
            'status'                => $po->status,
            'items'                 => $po->items,
            'total_amount_xof'      => $po->total_amount_xof,
            'currency_code'         => $po->currency_code,
            'payment_terms_days'    => $po->payment_terms_days,
            'delivery_address'      => $po->delivery_address,
            'expected_delivery_date'=> $po->expected_delivery_date,
            'actual_delivery_date'  => $po->actual_delivery_date,
            'notes'                 => $po->notes,
            'sent_at'               => $po->sent_at,
            'has_invoice'           => !is_null($po->invoice_path),
        ])->toArray();
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Helpers privés
    // ─────────────────────────────────────────────────────────────────────────

    private function generateSecurePassword(int $length = 12): string
    {
        $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        $password = '';
        for ($i = 0; $i < $length; $i++) {
            $password .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $password;
    }
}
