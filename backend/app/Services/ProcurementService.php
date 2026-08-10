<?php

namespace App\Services;

use App\Models\GoodsReceipt;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequest;
use App\Models\Quotation;
use App\Models\Rfq;
use App\Models\RfqSupplier;
use App\Models\Supply;
use App\Models\Supplier;
use App\Models\SupplierEvaluation;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ProcurementService
{
    // ─────────────────────────────────────────────────────────────────────────
    //  DEMANDES D'ACHAT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Crée une demande d'achat avec numéro auto DA-2026-XXXXX.
     */
    public function createPurchaseRequest(array $data): PurchaseRequest
    {
        return DB::transaction(function () use ($data) {
            $year   = now()->year;
            $orgId  = $data['organization_id'];

            $last   = PurchaseRequest::where('organization_id', $orgId)
                ->whereYear('created_at', $year)
                ->count();

            $number = sprintf('DA-%d-%05d', $year, $last + 1);

            // Calcul du total estimé depuis les items
            $total = collect($data['items'] ?? [])->sum(function ($item) {
                return ($item['qty'] ?? 0) * ($item['unit_price_est'] ?? 0);
            });

            $pr = PurchaseRequest::create(array_merge($data, [
                'pr_number'           => $number,
                'status'              => 'brouillon',
                'total_estimated_xof' => $total,
            ]));

            return $pr;
        });
    }

    /**
     * Soumet une DA au workflow d'approbation.
     */
    public function submitPurchaseRequest(PurchaseRequest $pr): void
    {
        if ($pr->status !== 'brouillon') {
            throw new \LogicException('Seules les DA en brouillon peuvent être soumises.');
        }

        $pr->update(['status' => 'soumis']);

        // Notifier les approbateurs (managers / direction achats)
        // Mail::to(config('procurement.approver_email'))->send(new \App\Mail\PrSubmittedMail($pr));
    }

    /**
     * Approuve une DA et déclenche la suite du workflow.
     */
    public function approvePurchaseRequest(PurchaseRequest $pr, User $approver): void
    {
        if ($pr->status !== 'soumis') {
            throw new \LogicException('Seules les DA soumises peuvent être approuvées.');
        }

        $pr->update([
            'status'      => 'approuve',
            'approved_by' => $approver->id,
            'approved_at' => now(),
        ]);

        // Notifier le demandeur
        // Mail::to($pr->requestor)->send(new \App\Mail\PrApprovedMail($pr));
    }

    /**
     * Refuse une DA avec motif.
     */
    public function refusePurchaseRequest(PurchaseRequest $pr, User $approver, string $reason): void
    {
        $pr->update([
            'status'         => 'refuse',
            'approved_by'    => $approver->id,
            'approved_at'    => now(),
            'refusal_reason' => $reason,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  APPELS D'OFFRES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Crée un AO depuis une DA ou indépendamment (AO-2026-XXXXX).
     */
    public function createRfq(array $data, ?PurchaseRequest $pr = null): Rfq
    {
        return DB::transaction(function () use ($data, $pr) {
            $year  = now()->year;
            $orgId = $data['organization_id'];

            $last   = Rfq::where('organization_id', $orgId)
                ->whereYear('created_at', $year)
                ->count();

            $number = sprintf('AO-%d-%05d', $year, $last + 1);

            if ($pr) {
                $data['purchase_request_id'] = $pr->id;
                $data['items']               = $data['items'] ?? $pr->items;
            }

            $rfq = Rfq::create(array_merge($data, [
                'rfq_number' => $number,
                'status'     => 'brouillon',
            ]));

            // Marquer la DA comme convertie si liée
            if ($pr) {
                $pr->update(['status' => 'converti']);
            }

            return $rfq;
        });
    }

    /**
     * Invite des fournisseurs à l'AO et envoie les emails.
     */
    public function inviteSuppliers(Rfq $rfq, array $supplierIds): void
    {
        if ($rfq->status === 'brouillon') {
            $rfq->update(['status' => 'publie']);
        }

        $suppliers = Supplier::whereIn('id', $supplierIds)->get();

        foreach ($suppliers as $supplier) {
            // Créer ou mettre à jour la ligne rfq_suppliers
            RfqSupplier::updateOrCreate(
                ['rfq_id' => $rfq->id, 'supplier_id' => $supplier->id],
                ['status' => 'invite', 'invited_at' => now()]
            );

            // Envoyer l'email d'invitation
            if ($supplier->portal_email || $supplier->email) {
                $email = $supplier->portal_email ?? $supplier->email;
                // Mail::to($email)->send(new \App\Mail\RfqInvitationMail($rfq, $supplier));
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DEVIS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Enregistre la réponse d'un fournisseur (DEV-2026-XXXXX).
     */
    public function receiveQuotation(Rfq $rfq, int $supplierId, array $data): Quotation
    {
        return DB::transaction(function () use ($rfq, $supplierId, $data) {
            $year   = now()->year;
            $orgId  = $rfq->organization_id;

            $last   = Quotation::where('organization_id', $orgId)
                ->whereYear('created_at', $year)
                ->count();

            $number = sprintf('DEV-%d-%05d', $year, $last + 1);

            $total = collect($data['items'] ?? [])->sum(function ($item) {
                return ($item['qty'] ?? 0) * ($item['unit_price'] ?? 0);
            });

            $quotation = Quotation::create(array_merge($data, [
                'rfq_id'           => $rfq->id,
                'supplier_id'      => $supplierId,
                'organization_id'  => $orgId,
                'quotation_number' => $number,
                'total_amount_xof' => $total,
                'status'           => 'soumis',
                'submitted_at'     => now(),
            ]));

            // Mettre à jour rfq_suppliers
            RfqSupplier::where('rfq_id', $rfq->id)
                ->where('supplier_id', $supplierId)
                ->update(['status' => 'repondu', 'responded_at' => now()]);

            return $quotation;
        });
    }

    /**
     * Calcule les scores de tous les devis d'un AO selon les critères pondérés.
     * Retourne les devis avec leurs scores.
     */
    public function evaluateQuotations(Rfq $rfq): array
    {
        $quotations = Quotation::where('rfq_id', $rfq->id)
            ->where('status', 'soumis')
            ->with('supplier')
            ->get();

        if ($quotations->isEmpty()) {
            return [];
        }

        $criteria = collect($rfq->evaluation_criteria ?? []);

        // Poids des critères financiers et techniques
        $financialWeight = $criteria->where('type', 'financier')->sum('weight') ?? 50;
        $technicalWeight = $criteria->where('type', 'technique')->sum('weight') ?? 50;

        // Normalisation pour que total = 100
        $totalWeight = $financialWeight + $technicalWeight ?: 100;

        // Score financier : le moins cher obtient 100
        $minPrice = $quotations->min('total_amount_xof');

        $results = $quotations->map(function ($q) use ($minPrice, $financialWeight, $technicalWeight, $totalWeight) {
            $financialScore = $minPrice > 0
                ? round(($minPrice / $q->total_amount_xof) * 100, 2)
                : 0;

            $totalScore = round(
                ($financialScore * ($financialWeight / $totalWeight))
                + ($q->technical_score * ($technicalWeight / $totalWeight)),
                2
            );

            $q->update([
                'financial_score' => $financialScore,
                'total_score'     => $totalScore,
                'status'          => 'evalue',
            ]);

            return [
                'quotation_id'    => $q->id,
                'quotation_number'=> $q->quotation_number,
                'supplier_id'     => $q->supplier_id,
                'supplier_name'   => $q->supplier->company_name,
                'total_amount'    => $q->total_amount_xof,
                'technical_score' => $q->technical_score,
                'financial_score' => $financialScore,
                'total_score'     => $totalScore,
            ];
        })->sortByDesc('total_score')->values()->toArray();

        return $results;
    }

    /**
     * Sélectionne le devis gagnant et notifie tous les fournisseurs.
     */
    public function selectQuotation(Rfq $rfq, Quotation $selected, string $justification): void
    {
        DB::transaction(function () use ($rfq, $selected, $justification) {
            // Marquer le gagnant
            $selected->update(['status' => 'selectionne']);

            // Rejeter les autres
            Quotation::where('rfq_id', $rfq->id)
                ->where('id', '!=', $selected->id)
                ->update(['status' => 'rejete']);

            // Mettre à jour l'AO
            $rfq->update([
                'selected_quotation_id' => $selected->id,
                'status'                => 'clos',
                'notes'                 => ($rfq->notes ? $rfq->notes . "\n" : '') . "Sélection : $justification",
            ]);

            // Mettre à jour rfq_suppliers
            RfqSupplier::where('rfq_id', $rfq->id)
                ->where('supplier_id', $selected->supplier_id)
                ->update(['status' => 'selectionne']);

            RfqSupplier::where('rfq_id', $rfq->id)
                ->where('supplier_id', '!=', $selected->supplier_id)
                ->where('status', 'repondu')
                ->update(['status' => 'elimine']);

            // Notifications email
            // Mail::to($selected->supplier->email)->send(new \App\Mail\QuotationSelectedMail($selected, $justification));
            // foreach rejetés...
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  BONS DE COMMANDE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Crée un BC depuis un devis sélectionné ou manuellement (BC-2026-XXXXX).
     */
    public function createPurchaseOrder(array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($data) {
            $year   = now()->year;
            $orgId  = $data['organization_id'];

            $last   = PurchaseOrder::where('organization_id', $orgId)
                ->whereYear('created_at', $year)
                ->count();

            $number = sprintf('BC-%d-%05d', $year, $last + 1);

            // Si créé depuis un devis, récupérer les infos
            if (!empty($data['quotation_id'])) {
                $quotation              = Quotation::findOrFail($data['quotation_id']);
                $data['supplier_id']    = $data['supplier_id'] ?? $quotation->supplier_id;
                $data['rfq_id']         = $data['rfq_id'] ?? $quotation->rfq_id;
                $data['items']          = $data['items'] ?? $quotation->items;
                $data['total_amount_xof'] = $data['total_amount_xof'] ?? $quotation->total_amount_xof;
                $data['currency_code']  = $data['currency_code'] ?? $quotation->currency_code;
            }

            $total = collect($data['items'] ?? [])->sum(function ($item) {
                return ($item['qty'] ?? 0) * ($item['unit_price'] ?? 0);
            });

            $po = PurchaseOrder::create(array_merge($data, [
                'po_number'       => $number,
                'status'          => 'brouillon',
                'total_amount_xof' => $data['total_amount_xof'] ?? $total,
            ]));

            return $po;
        });
    }

    /**
     * Envoie le BC au fournisseur par email avec PDF en pièce jointe.
     */
    public function sendPurchaseOrder(PurchaseOrder $po): void
    {
        if (!in_array($po->status, ['brouillon', 'approuve'])) {
            throw new \LogicException('Le BC doit être approuvé avant envoi.');
        }

        $po->update([
            'status'  => 'envoye',
            'sent_at' => now(),
        ]);

        // Générer le PDF et envoyer
        $supplier = $po->supplier;
        $email    = $supplier->email;
        if ($email) {
            // Mail::to($email)->send(new \App\Mail\PurchaseOrderMail($po));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  RÉCEPTION DES MARCHANDISES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Enregistre un bon de réception (BR-2026-XXXXX).
     */
    public function receiveGoods(PurchaseOrder $po, array $receipts): GoodsReceipt
    {
        return DB::transaction(function () use ($po, $receipts) {
            $year   = now()->year;
            $orgId  = $po->organization_id;

            $last   = GoodsReceipt::where('organization_id', $orgId)
                ->whereYear('created_at', $year)
                ->count();

            $number = sprintf('BR-%d-%05d', $year, $last + 1);

            // Déterminer si la réception est partielle ou complète
            $status = 'complet';
            foreach ($receipts['items_received'] as $item) {
                if (($item['qty_received'] ?? 0) < ($item['qty_ordered'] ?? 0)) {
                    $status = 'partiel';
                    break;
                }
                if (($item['qty_rejected'] ?? 0) > 0) {
                    $status = 'rejete';
                }
            }

            $gr = GoodsReceipt::create([
                'purchase_order_id' => $po->id,
                'organization_id'   => $orgId,
                'receipt_number'    => $number,
                'received_by'       => $receipts['received_by'],
                'received_date'     => $receipts['received_date'] ?? today(),
                'items_received'    => $receipts['items_received'],
                'status'            => $status,
                'notes'             => $receipts['notes'] ?? null,
            ]);

            // Mettre à jour le statut du BC
            $poStatus = match ($status) {
                'complet' => 'livre',
                'partiel' => 'livre_partiel',
                default   => $po->status,
            };

            $po->update([
                'status'               => $poStatus,
                'actual_delivery_date' => $gr->received_date,
            ]);

            // -- Entree en stock ------------------------------------------
            // La reception enregistrait la livraison sans jamais toucher au
            // stock : les cartons arrivaient, l'ERP le notait, et
            // `supplies.quantity` ne bougeait pas. Deux silos, exactement
            // comme la facturation et la comptabilite l'etaient.
            //
            // Seules les lignes rattachees a une fourniture entrent en stock :
            // une prestation ou un consommable non suivi n'a rien a y faire.
            $this->entrerEnStock($gr, $receipts['items_received'], $receipts['received_by']);

            return $gr;
        });
    }

    /**
     * Alimente le stock a partir des lignes receptionnees.
     *
     * La quantite retenue est celle REELLEMENT acceptee : `qty_received` moins
     * `qty_rejected`. Faire entrer la quantite recue sans deduire les rebuts
     * gonflerait le stock d'articles qu'on s'apprete a retourner.
     */
    private function entrerEnStock(GoodsReceipt $gr, array $lignes, int $userId): void
    {
        $auteur = User::find($userId);

        if (! $auteur) {
            return;
        }

        $stock = app(StockService::class);

        foreach ($lignes as $ligne) {
            $supplyId = $ligne['supply_id'] ?? null;

            if (! $supplyId) {
                continue;
            }

            $acceptee = (int) round(($ligne['qty_received'] ?? 0) - ($ligne['qty_rejected'] ?? 0));

            if ($acceptee <= 0) {
                continue;
            }

            $supply = Supply::where('organization_id', $gr->organization_id)->find($supplyId);

            if (! $supply) {
                continue;
            }

            $stock->entrer(
                $supply,
                $acceptee,
                'Reception ' . $gr->receipt_number,
                $auteur,
                isset($ligne['unit_price']) ? (float) $ligne['unit_price'] : null,
                'goods_receipt',
                $gr->id,
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  ÉVALUATION FOURNISSEURS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Enregistre une évaluation fournisseur et met à jour son rating global.
     */
    public function evaluateSupplier(Supplier $supplier, array $scores, ?PurchaseOrder $po = null): void
    {
        DB::transaction(function () use ($supplier, $scores, $po) {
            $overall = round(
                (($scores['quality_score'] + $scores['delivery_score']
                + $scores['price_score'] + $scores['communication_score']) / 4),
                2
            );

            SupplierEvaluation::create([
                'supplier_id'        => $supplier->id,
                'organization_id'    => $supplier->organization_id,
                'purchase_order_id'  => $po?->id,
                'evaluation_date'    => $scores['evaluation_date'] ?? today(),
                'evaluator_user_id'  => $scores['evaluator_user_id'],
                'quality_score'      => $scores['quality_score'],
                'delivery_score'     => $scores['delivery_score'],
                'price_score'        => $scores['price_score'],
                'communication_score'=> $scores['communication_score'],
                'overall_score'      => $overall,
                'comments'           => $scores['comments'] ?? null,
                'recommend'          => $scores['recommend'] ?? true,
            ]);

            // Recalculer le rating global (moyenne des 3 dernières évals)
            $avgRating = SupplierEvaluation::where('supplier_id', $supplier->id)
                ->latest('evaluation_date')
                ->limit(3)
                ->avg('overall_score');

            $supplier->update(['rating' => round($avgRating)]);
        });
    }

    /**
     * Retourne le scorecard complet d'un fournisseur.
     */
    public function getSupplierScorecard(Supplier $supplier): array
    {
        $evaluations = SupplierEvaluation::where('supplier_id', $supplier->id)
            ->with('evaluator')
            ->orderByDesc('evaluation_date')
            ->get();

        $avgByCategory = [
            'quality'       => round($evaluations->avg('quality_score'), 2),
            'delivery'      => round($evaluations->avg('delivery_score'), 2),
            'price'         => round($evaluations->avg('price_score'), 2),
            'communication' => round($evaluations->avg('communication_score'), 2),
            'overall'       => round($evaluations->avg('overall_score'), 2),
        ];

        // Tendance : comparer les 3 dernières vs 3 précédentes
        $recent = $evaluations->take(3)->avg('overall_score');
        $older  = $evaluations->slice(3, 3)->avg('overall_score');
        $trend  = match (true) {
            $recent > $older + 0.3 => 'hausse',
            $recent < $older - 0.3 => 'baisse',
            default                => 'stable',
        };

        // Statistiques commandes
        $orders = PurchaseOrder::where('supplier_id', $supplier->id)
            ->where('organization_id', $supplier->organization_id)
            ->get();

        $totalSpend     = $orders->whereIn('status', ['livre', 'facture', 'clos'])->sum('total_amount_xof');
        $onTimeOrders   = 0;
        $lateOrders     = 0;
        foreach ($orders->whereNotNull('actual_delivery_date') as $order) {
            if ($order->actual_delivery_date <= $order->expected_delivery_date) {
                $onTimeOrders++;
            } else {
                $lateOrders++;
            }
        }

        return [
            'supplier'          => $supplier,
            'evaluations'       => $evaluations,
            'averages'          => $avgByCategory,
            'trend'             => $trend,
            'total_evaluations' => $evaluations->count(),
            'total_orders'      => $orders->count(),
            'total_spend_xof'   => $totalSpend,
            'on_time_orders'    => $onTimeOrders,
            'late_orders'       => $lateOrders,
            'on_time_rate'      => $orders->whereNotNull('actual_delivery_date')->count()
                                    ? round($onTimeOrders / $orders->whereNotNull('actual_delivery_date')->count() * 100, 1)
                                    : null,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  DASHBOARD ACHATS
    // ─────────────────────────────────────────────────────────────────────────

    public function getDashboardData(int $organizationId): array
    {
        $year = now()->year;

        // KPIs
        $pendingPrs   = PurchaseRequest::where('organization_id', $organizationId)
            ->where('status', 'soumis')->count();
        $activePos    = PurchaseOrder::where('organization_id', $organizationId)
            ->whereIn('status', ['approuve', 'envoye', 'accuse', 'livre_partiel'])->count();
        $activeSuppliers = Supplier::where('organization_id', $organizationId)
            ->where('status', 'actif')->count();

        // Économies : comparaison prix estimés DA vs prix BC réels
        $totalEstimated = PurchaseRequest::where('organization_id', $organizationId)
            ->whereYear('created_at', $year)
            ->where('status', 'converti')
            ->sum('total_estimated_xof');
        $totalActual = PurchaseOrder::where('organization_id', $organizationId)
            ->whereYear('created_at', $year)
            ->whereNotIn('status', ['annule'])
            ->sum('total_amount_xof');
        $savings = max(0, $totalEstimated - $totalActual);

        // Dépenses par catégorie fournisseur
        $byCategory = PurchaseOrder::where('purchase_orders.organization_id', $organizationId)
            ->whereYear('purchase_orders.created_at', $year)
            ->whereNotIn('purchase_orders.status', ['annule', 'brouillon'])
            ->join('suppliers', 'purchase_orders.supplier_id', '=', 'suppliers.id')
            ->selectRaw('suppliers.category, SUM(purchase_orders.total_amount_xof) as total')
            ->groupBy('suppliers.category')
            ->get()
            ->map(fn($r) => ['category' => $r->category, 'total' => $r->total])
            ->toArray();

        // Évolution mensuelle sur 12 mois
        $monthly = PurchaseOrder::where('organization_id', $organizationId)
            ->whereYear('created_at', $year)
            ->whereNotIn('status', ['annule', 'brouillon'])
            ->selectRaw('EXTRACT(MONTH FROM created_at) as month, SUM(total_amount_xof) as total')
            ->groupBy('month')
            ->pluck('total', 'month')
            ->toArray();

        $monthlyData = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthlyData[] = ['month' => $m, 'total' => $monthly[$m] ?? 0];
        }

        // BC en retard
        $latePos = PurchaseOrder::where('organization_id', $organizationId)
            ->whereIn('status', ['envoye', 'accuse', 'livre_partiel'])
            ->where('expected_delivery_date', '<', today())
            ->with('supplier')
            ->limit(10)
            ->get();

        // Top 5 fournisseurs
        $topSuppliers = PurchaseOrder::where('purchase_orders.organization_id', $organizationId)
            ->whereYear('purchase_orders.created_at', $year)
            ->whereNotIn('purchase_orders.status', ['annule'])
            ->join('suppliers', 'purchase_orders.supplier_id', '=', 'suppliers.id')
            ->selectRaw('suppliers.id, suppliers.company_name, suppliers.category, SUM(purchase_orders.total_amount_xof) as total')
            ->groupBy('suppliers.id', 'suppliers.company_name', 'suppliers.category')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        return [
            'kpis' => [
                'pending_prs'     => $pendingPrs,
                'savings_xof'     => $savings,
                'active_suppliers'=> $activeSuppliers,
                'active_pos'      => $activePos,
            ],
            'by_category'  => $byCategory,
            'monthly'      => $monthlyData,
            'late_pos'     => $latePos,
            'top_suppliers'=> $topSuppliers,
        ];
    }
}
