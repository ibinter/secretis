<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\PurchaseRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Demande d'achat approuvée — email au demandeur.
 *
 * Point d'appel : App\Services\ProcurementService::approve() (actuellement commenté).
 */
class PrApprovedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly PurchaseRequest $purchaseRequest,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Demande d\'achat approuvée — ' . $this->purchaseRequest->pr_number,
        );
    }

    public function content(): Content
    {
        $pr     = $this->purchaseRequest;
        $amount = number_format((float) $pr->total_estimated_xof, 0, ',', ' ');

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#27AE60;margin:0 0 12px">Demande d\'achat approuvée</h2>'
              . '<p>Votre demande <strong>' . e((string) $pr->pr_number) . '</strong> — '
              . e((string) $pr->title) . ' (' . e($amount) . ' XOF) a été approuvée.</p>'
              . '<p>Elle peut désormais être convertie en consultation ou en bon de commande.</p>'
              . '<p style="margin-top:16px"><a href="' . e((string) config('app.url')) . '/achats/demandes/' . e((string) $pr->id) . '" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Voir la demande</a></p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
