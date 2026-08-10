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
 * Commande impayée expirée et annulée.
 *
 * Appelé par App\Console\Commands\ExpireUnpaidOrders : new OrderExpired($order)
 *
 * Aucune vue Blade dédiée : corps HTML inline (Content::htmlString).
 */
class OrderExpired extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Order $order,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre commande ' . $this->order->reference . ' a expiré',
        );
    }

    public function content(): Content
    {
        $amount = number_format((float) $this->order->amount, 0, ',', ' ');

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#C0392B;margin:0 0 12px">Commande expirée</h2>'
              . '<p>La commande <strong>' . e((string) $this->order->reference) . '</strong> ('
              . e($amount) . ' ' . e((string) ($this->order->currency ?? 'XOF'))
              . ') a été annulée faute de paiement dans le délai imparti.</p>'
              . '<p>Vous pouvez passer une nouvelle commande à tout moment depuis votre espace abonnement.</p>'
              . '<p style="margin-top:16px"><a href="' . e((string) config('app.url')) . '/abonnement" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Renouveler mon abonnement</a></p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
