<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Preuve de paiement rejetée — email au client.
 *
 * Appelé par App\Services\Payment\ManualPaymentService::notifyClientRejection() :
 *   new PaymentProofRejected($order, $reason)
 *
 * Aucune vue Blade dédiée : corps HTML inline (Content::htmlString).
 */
class PaymentProofRejected extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Order  $order,
        public readonly string $reason,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Preuve de paiement refusée — commande ' . $this->order->reference,
        );
    }

    public function content(): Content
    {
        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#C0392B;margin:0 0 12px">Preuve de paiement refusée</h2>'
              . '<p>La preuve de paiement transmise pour la commande <strong>'
              . e((string) $this->order->reference) . '</strong> n\'a pas pu être validée.</p>'
              . '<p><strong>Motif :</strong> ' . e($this->reason) . '</p>'
              . '<p>Vous pouvez déposer une nouvelle preuve depuis votre espace abonnement.</p>'
              . '<p style="margin-top:16px"><a href="' . e((string) config('app.url'))
              . '/abonnement/commandes/' . e((string) $this->order->id) . '" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Déposer une nouvelle preuve</a></p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
