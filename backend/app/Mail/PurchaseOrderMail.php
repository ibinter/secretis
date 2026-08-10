<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\PurchaseOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Transmission d'un bon de commande au fournisseur.
 *
 * Point d'appel : App\Services\ProcurementService (actuellement commenté) :
 *   new PurchaseOrderMail($po)
 * Colonnes réelles de `purchase_orders` : po_number, total_amount_xof,
 * currency_code, payment_terms_days, expected_delivery_date, delivery_address.
 */
class PurchaseOrderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly PurchaseOrder $purchaseOrder,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bon de commande ' . $this->purchaseOrder->po_number,
        );
    }

    public function content(): Content
    {
        $po       = $this->purchaseOrder;
        $amount   = number_format((float) $po->total_amount_xof, 0, ',', ' ');
        $delivery = $po->expected_delivery_date instanceof \DateTimeInterface
            ? $po->expected_delivery_date->format('d/m/Y')
            : (string) ($po->expected_delivery_date ?? '-');

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Bon de commande</h2>'
              . '<table cellpadding="0" cellspacing="0">'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Référence</td><td style="padding:6px 0;font-weight:600">' . e((string) $po->po_number) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Montant</td><td style="padding:6px 0;font-weight:600">' . e($amount) . ' ' . e((string) ($po->currency_code ?? 'XOF')) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Délai de paiement</td><td style="padding:6px 0;font-weight:600">' . e((string) ($po->payment_terms_days ?? 30)) . ' jours</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Livraison attendue</td><td style="padding:6px 0;font-weight:600">' . e($delivery) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Adresse</td><td style="padding:6px 0;font-weight:600">' . e((string) ($po->delivery_address ?? '-')) . '</td></tr>'
              . '</table>'
              . '<p style="margin-top:16px">Merci d\'accuser réception de cette commande.</p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
