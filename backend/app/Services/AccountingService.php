<?php

namespace App\Services;

use App\Models\AccountingClient;
use App\Models\AccountingExpense;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\PaymentReceipt;
use App\Models\Quote;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

/**
 * AccountingService — Logique métier du module Comptabilité SECRETIS ERP
 *
 * Responsabilités :
 *   - Création / mise à jour de factures et devis
 *   - Enregistrement des paiements
 *   - Génération PDF (DomPDF)
 *   - Envoi email (template professionnel)
 *   - Dashboard KPIs comptables
 *   - Relances automatiques (CRON)
 *   - Export CSV
 */
class AccountingService
{
    public function __construct(
        private readonly AuditService $audit,
    ) {}

    // =========================================================================
    // FACTURES
    // =========================================================================

    /**
     * Crée une facture avec ses lignes.
     *
     * @param  array $data    Données validées (title, client_id, issue_date, due_date, items[], tax_rate, notes, terms)
     * @param  int   $orgId   ID de l'organisation tenant
     * @return Invoice
     */
    public function createInvoice(array $data, int $orgId): Invoice
    {
        return DB::transaction(function () use ($data, $orgId) {
            $items    = $data['items'] ?? [];
            $taxRate  = (float) ($data['tax_rate'] ?? 18.0);
            $discount = (float) ($data['discount_amount'] ?? 0);

            // Calcul sous-total
            $subtotal = collect($items)->sum(fn($i) => (float) $i['quantity'] * (float) $i['unit_price']);
            $taxAmt   = round($subtotal * $taxRate / 100, 2);
            $total    = round($subtotal + $taxAmt - $discount, 2);

            $invoice = Invoice::create([
                'organization_id' => $orgId,
                'client_id'       => $data['client_id'],
                'quote_id'        => $data['quote_id'] ?? null,
                'invoice_number'  => Invoice::generateInvoiceNumber($orgId),
                'title'           => $data['title'],
                'issue_date'      => $data['issue_date'] ?? now()->toDateString(),
                'due_date'        => $data['due_date'] ?? now()->addDays(30)->toDateString(),
                'status'          => 'draft',
                'subtotal'        => $subtotal,
                'tax_rate'        => $taxRate,
                'tax_amount'      => $taxAmt,
                'discount_amount' => $discount,
                'total'           => $total,
                'paid_amount'     => 0,
                'balance_due'     => $total,
                'notes'           => $data['notes'] ?? null,
                'terms'           => $data['terms'] ?? null,
                'created_by'      => auth()->id(),
            ]);

            foreach ($items as $i => $item) {
                $lineTotal = round((float) $item['quantity'] * (float) $item['unit_price'], 2);
                $invoice->items()->create([
                    'description' => $item['description'],
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'total'       => $lineTotal,
                    'sort_order'  => $i,
                ]);
            }

            $this->audit->logCreated('accounting', 'invoice', $invoice->id, [
                'invoice_number' => $invoice->invoice_number,
                'total'          => $invoice->total,
                'client_id'      => $invoice->client_id,
            ]);

            return $invoice->load(['client', 'items']);
        });
    }

    /**
     * Met à jour une facture existante (uniquement si statut draft).
     */
    public function updateInvoice(Invoice $invoice, array $data): Invoice
    {
        return DB::transaction(function () use ($invoice, $data) {
            $old = $invoice->toArray();

            $items    = $data['items'] ?? [];
            $taxRate  = (float) ($data['tax_rate'] ?? $invoice->tax_rate);
            $discount = (float) ($data['discount_amount'] ?? $invoice->discount_amount);

            $subtotal = collect($items)->sum(fn($i) => (float) $i['quantity'] * (float) $i['unit_price']);
            $taxAmt   = round($subtotal * $taxRate / 100, 2);
            $total    = round($subtotal + $taxAmt - $discount, 2);

            $invoice->update([
                'client_id'       => $data['client_id'] ?? $invoice->client_id,
                'title'           => $data['title'] ?? $invoice->title,
                'issue_date'      => $data['issue_date'] ?? $invoice->issue_date,
                'due_date'        => $data['due_date'] ?? $invoice->due_date,
                'tax_rate'        => $taxRate,
                'subtotal'        => $subtotal,
                'tax_amount'      => $taxAmt,
                'discount_amount' => $discount,
                'total'           => $total,
                'balance_due'     => $total - $invoice->paid_amount,
                'notes'           => $data['notes'] ?? $invoice->notes,
                'terms'           => $data['terms'] ?? $invoice->terms,
            ]);

            // Remplacer les lignes
            $invoice->items()->delete();
            foreach ($items as $i => $item) {
                $lineTotal = round((float) $item['quantity'] * (float) $item['unit_price'], 2);
                $invoice->items()->create([
                    'description' => $item['description'],
                    'quantity'    => $item['quantity'],
                    'unit_price'  => $item['unit_price'],
                    'total'       => $lineTotal,
                    'sort_order'  => $i,
                ]);
            }

            $this->audit->logUpdated('accounting', 'invoice', $invoice->id, $old, $invoice->fresh()->toArray());

            return $invoice->fresh()->load(['client', 'items']);
        });
    }

    // =========================================================================
    // PAIEMENTS
    // =========================================================================

    /**
     * Enregistre un paiement pour une facture.
     * Gère les paiements partiels et met à jour le solde/statut.
     */
    public function recordPayment(Invoice $invoice, array $paymentData): PaymentReceipt
    {
        return DB::transaction(function () use ($invoice, $paymentData) {
            $amount = (float) $paymentData['amount'];

            if ($amount <= 0) {
                throw new \InvalidArgumentException('Le montant du paiement doit être positif.');
            }

            if ($amount > $invoice->balance_due + 0.01) {
                throw new \InvalidArgumentException(
                    "Le montant ({$amount} FCFA) dépasse le solde dû ({$invoice->balance_due} FCFA)."
                );
            }

            $receipt = PaymentReceipt::create([
                'invoice_id'     => $invoice->id,
                'organization_id'=> $invoice->organization_id,
                'amount'         => $amount,
                'payment_date'   => $paymentData['payment_date'] ?? now()->toDateString(),
                'payment_method' => $paymentData['payment_method'] ?? 'virement',
                'reference'      => $paymentData['reference'] ?? null,
                'notes'          => $paymentData['notes'] ?? null,
                'created_by'     => auth()->id(),
            ]);

            // Mettre à jour le solde de la facture
            $newPaidAmount  = $invoice->paid_amount + $amount;
            $newBalanceDue  = max(0, $invoice->total - $newPaidAmount);
            $newStatus      = $newBalanceDue <= 0 ? 'paid' : $invoice->status;

            $invoice->update([
                'paid_amount'    => $newPaidAmount,
                'balance_due'    => $newBalanceDue,
                'status'         => $newStatus,
                'payment_date'   => $newStatus === 'paid' ? ($paymentData['payment_date'] ?? now()->toDateString()) : $invoice->payment_date,
                'payment_method' => $newStatus === 'paid' ? ($paymentData['payment_method'] ?? 'virement') : $invoice->payment_method,
            ]);

            $this->audit->logCreated('accounting', 'payment_receipt', $receipt->id, [
                'invoice_number' => $invoice->invoice_number,
                'amount'         => $amount,
            ]);

            return $receipt;
        });
    }

    // =========================================================================
    // EMAIL
    // =========================================================================

    /**
     * Envoie la facture par email au client avec PDF en pièce jointe.
     */
    public function sendInvoiceByEmail(Invoice $invoice): void
    {
        $invoice->loadMissing(['client', 'items', 'organization']);
        $client = $invoice->client;

        if (! $client->email) {
            throw new \RuntimeException("Le client '{$client->name}' n'a pas d'adresse email.");
        }

        $pdfPath = $this->generateInvoicePdf($invoice);

        Mail::send(
            'invoices.invoice-email',
            ['invoice' => $invoice, 'client' => $client, 'org' => $invoice->organization],
            function ($message) use ($invoice, $client, $pdfPath) {
                $message->to($client->email, $client->name)
                    ->subject("Facture {$invoice->invoice_number} — {$invoice->organization->name}")
                    ->attach($pdfPath, [
                        'as'   => "facture-{$invoice->invoice_number}.pdf",
                        'mime' => 'application/pdf',
                    ]);
            }
        );

        // Mettre à jour le statut si brouillon
        if ($invoice->status === 'draft') {
            $invoice->update(['status' => 'sent']);
        }

        $this->audit->log('sent_email', 'accounting', 'invoice', $invoice->id, [], [
            'to' => $client->email,
        ]);

        // Nettoyer le PDF temporaire
        @unlink($pdfPath);
    }

    /**
     * Envoie le devis par email au client.
     */
    public function sendQuoteByEmail(Quote $quote): void
    {
        $quote->loadMissing(['client', 'items', 'organization']);
        $client = $quote->client;

        if (! $client->email) {
            throw new \RuntimeException("Le client '{$client->name}' n'a pas d'adresse email.");
        }

        $pdfPath = $this->generateQuotePdf($quote);

        Mail::send(
            'invoices.quote-email',
            ['quote' => $quote, 'client' => $client, 'org' => $quote->organization],
            function ($message) use ($quote, $client, $pdfPath) {
                $message->to($client->email, $client->name)
                    ->subject("Devis {$quote->quote_number} — {$quote->organization->name}")
                    ->attach($pdfPath, [
                        'as'   => "devis-{$quote->quote_number}.pdf",
                        'mime' => 'application/pdf',
                    ]);
            }
        );

        if ($quote->status === 'draft') {
            $quote->update(['status' => 'sent']);
        }

        @unlink($pdfPath);
    }

    // =========================================================================
    // PDF
    // =========================================================================

    /**
     * Génère le PDF de la facture et retourne le chemin temporaire.
     *
     * @return string Chemin du fichier PDF temporaire
     */
    public function generateInvoicePdf(Invoice $invoice): string
    {
        $invoice->loadMissing(['client', 'items', 'organization', 'creator']);

        // L'organisation est prise sur la facture, pas sur l'utilisateur : ce
        // PDF est aussi produit par une file d'attente et par l'envoi
        // d'e-mail, où personne n'est authentifié.
        $pdf = app('dompdf.wrapper')->pourOrganisation($invoice->organization_id);
        $pdf->loadView('invoices.invoice-pdf', [
            'invoice' => $invoice,
            'client'  => $invoice->client,
            'org'     => $invoice->organization,
            'items'   => $invoice->items,
        ]);

        $pdf->setPaper('A4', 'portrait');
        $pdf->setOption('defaultFont', 'DejaVu Sans');
        $pdf->setOption('dpi', 150);

        $tmpPath = sys_get_temp_dir() . "/facture-{$invoice->invoice_number}-" . uniqid() . '.pdf';
        file_put_contents($tmpPath, $pdf->output());

        return $tmpPath;
    }

    /**
     * Génère le PDF du devis et retourne le chemin temporaire.
     */
    public function generateQuotePdf(Quote $quote): string
    {
        $quote->loadMissing(['client', 'items', 'organization', 'creator']);

        $pdf = app('dompdf.wrapper')->pourOrganisation($quote->organization_id);
        $pdf->loadView('invoices.quote-pdf', [
            'quote'  => $quote,
            'client' => $quote->client,
            'org'    => $quote->organization,
            'items'  => $quote->items,
        ]);

        $pdf->setPaper('A4', 'portrait');
        $pdf->setOption('defaultFont', 'DejaVu Sans');
        $pdf->setOption('dpi', 150);

        $tmpPath = sys_get_temp_dir() . "/devis-{$quote->quote_number}-" . uniqid() . '.pdf';
        file_put_contents($tmpPath, $pdf->output());

        return $tmpPath;
    }

    // =========================================================================
    // DASHBOARD / KPIs
    // =========================================================================

    /**
     * Retourne les KPIs comptables pour la période donnée.
     *
     * @return array{
     *   total_invoiced: float,
     *   total_paid: float,
     *   total_pending: float,
     *   total_overdue: float,
     *   payment_rate: float,
     *   revenue_by_month: array,
     *   top_clients: array,
     *   overdue_invoices: array
     * }
     */
    public function getAccountingDashboard(int $orgId, Carbon $start, Carbon $end): array
    {
        // Montants par statut sur la période
        $invoices = Invoice::forOrg($orgId)
            ->whereBetween('issue_date', [$start->toDateString(), $end->toDateString()])
            ->whereNotIn('status', ['draft', 'cancelled'])
            ->get(['id', 'status', 'total', 'paid_amount', 'balance_due', 'due_date']);

        $totalInvoiced = $invoices->sum('total');
        $totalPaid     = $invoices->where('status', 'paid')->sum('total');
        $totalPending  = $invoices->whereIn('status', ['sent'])->sum('balance_due');
        $totalOverdue  = $invoices->where('status', 'overdue')->sum('balance_due');
        $paymentRate   = $totalInvoiced > 0
            ? round($totalPaid / $totalInvoiced * 100, 1)
            : 0;

        // Revenus par mois (12 derniers mois)
        $revenueByMonth = Invoice::forOrg($orgId)
            ->where('status', 'paid')
            ->where('issue_date', '>=', now()->subMonths(11)->startOfMonth()->toDateString())
            ->selectRaw("to_char(issue_date, 'YYYY-MM') as month, SUM(total) as revenue")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($r) => ['month' => $r->month, 'revenue' => (float) $r->revenue])
            ->values()
            ->toArray();

        // Top 5 clients
        // Colonnes qualifiées : invoices ET accounting_clients ont toutes deux
        // organization_id / status / issue_date → sans préfixe, PostgreSQL renvoie
        // « column reference is ambiguous » (500 sur tout écran chargeant ce tableau de bord).
        $topClients = Invoice::query()
            ->where('invoices.organization_id', $orgId)
            ->whereBetween('invoices.issue_date', [$start->toDateString(), $end->toDateString()])
            ->whereNotIn('invoices.status', ['draft', 'cancelled'])
            ->join('accounting_clients', 'accounting_clients.id', '=', 'invoices.client_id')
            ->selectRaw('accounting_clients.name, SUM(invoices.total) as total_billed, COUNT(invoices.id) as invoice_count')
            ->groupBy('accounting_clients.id', 'accounting_clients.name')
            ->orderByDesc('total_billed')
            ->limit(5)
            ->get()
            ->toArray();

        // Factures en retard
        $overdueInvoices = Invoice::forOrg($orgId)
            ->where('status', 'overdue')
            ->with('client:id,name,email')
            ->orderBy('due_date')
            ->limit(10)
            ->get(['id', 'invoice_number', 'client_id', 'total', 'balance_due', 'due_date'])
            ->map(fn($inv) => [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'client'         => $inv->client?->name,
                'total'          => $inv->total,
                'balance_due'    => $inv->balance_due,
                'due_date'       => $inv->due_date?->toDateString(),
                'days_overdue'   => $inv->getDaysOverdue(),
            ])
            ->values()
            ->toArray();

        return [
            'total_invoiced'  => (float) $totalInvoiced,
            'total_paid'      => (float) $totalPaid,
            'total_pending'   => (float) $totalPending,
            'total_overdue'   => (float) $totalOverdue,
            'payment_rate'    => $paymentRate,
            'revenue_by_month'=> $revenueByMonth,
            'top_clients'     => $topClients,
            'overdue_invoices'=> $overdueInvoices,
        ];
    }

    // =========================================================================
    // RELANCES AUTOMATIQUES (CRON)
    // =========================================================================

    /**
     * Envoie des relances email aux clients dont les factures sont en retard.
     * Relances à J+7, J+14, J+30.
     * Appelée par le planificateur Laravel (daily).
     */
    public function sendOverdueReminders(): void
    {
        $reminderDays = [7, 14, 30];

        foreach ($reminderDays as $days) {
            $targetDate = now()->subDays($days)->toDateString();

            $invoices = Invoice::where('status', 'overdue')
                ->whereDate('due_date', $targetDate)
                ->with(['client', 'organization'])
                ->get();

            foreach ($invoices as $invoice) {
                try {
                    if (! $invoice->client?->email) {
                        continue;
                    }

                    Mail::send(
                        'invoices.overdue-reminder',
                        [
                            'invoice'     => $invoice,
                            'client'      => $invoice->client,
                            'org'         => $invoice->organization,
                            'days_overdue'=> $days,
                        ],
                        function ($message) use ($invoice) {
                            $message->to($invoice->client->email, $invoice->client->name)
                                ->subject("Relance — Facture {$invoice->invoice_number} impayée");
                        }
                    );

                    $this->audit->log('reminder_sent', 'accounting', 'invoice', $invoice->id, [], [
                        'days_overdue' => $days,
                        'to'           => $invoice->client->email,
                    ]);
                } catch (\Throwable $e) {
                    Log::error('Relance facture échouée', [
                        'invoice_id' => $invoice->id,
                        'error'      => $e->getMessage(),
                    ]);
                }
            }
        }

        // Marquer automatiquement les factures "sent" expirées comme "overdue"
        Invoice::where('status', 'sent')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->update(['status' => 'overdue']);
    }

    // =========================================================================
    // EXPORT CSV
    // =========================================================================

    /**
     * Génère un export CSV compatible logiciels comptables (Sage, QuickBooks).
     *
     * @return string Contenu CSV (UTF-8 avec BOM pour Excel)
     */
    public function exportAccountingCsv(int $orgId, Carbon $start, Carbon $end): string
    {
        $invoices = Invoice::forOrg($orgId)
            ->whereBetween('issue_date', [$start->toDateString(), $end->toDateString()])
            ->with(['client', 'items', 'creator'])
            ->orderBy('issue_date')
            ->get();

        $rows = [];

        // En-tête
        $rows[] = [
            'Numéro facture',
            'Date émission',
            'Date échéance',
            'Statut',
            'Client',
            'Email client',
            'NIF client',
            'Description',
            'Sous-total HT',
            'Taux TVA (%)',
            'TVA',
            'Remise',
            'Total TTC',
            'Montant payé',
            'Solde dû',
            'Date paiement',
            'Mode paiement',
            'Créé par',
        ];

        foreach ($invoices as $inv) {
            $rows[] = [
                $inv->invoice_number,
                $inv->issue_date?->format('d/m/Y'),
                $inv->due_date?->format('d/m/Y'),
                $inv->getStatusLabel(),
                $inv->client?->name,
                $inv->client?->email,
                $inv->client?->tax_number,
                $inv->title,
                number_format($inv->subtotal, 2, ',', ' '),
                number_format($inv->tax_rate, 2, ',', ' '),
                number_format($inv->tax_amount, 2, ',', ' '),
                number_format($inv->discount_amount, 2, ',', ' '),
                number_format($inv->total, 2, ',', ' '),
                number_format($inv->paid_amount, 2, ',', ' '),
                number_format($inv->balance_due, 2, ',', ' '),
                $inv->payment_date?->format('d/m/Y'),
                $inv->payment_method,
                $inv->creator?->name,
            ];
        }

        // Générer CSV avec BOM UTF-8 pour Excel
        $output = "\xEF\xBB\xBF"; // BOM
        foreach ($rows as $row) {
            $output .= implode(';', array_map(
                fn($cell) => '"' . str_replace('"', '""', (string) $cell) . '"',
                $row
            )) . "\r\n";
        }

        return $output;
    }
}
