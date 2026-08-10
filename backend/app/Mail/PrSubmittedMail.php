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
 * Demande d'achat soumise — email à l'approbateur.
 *
 * Point d'appel : App\Services\ProcurementService::submit() (actuellement commenté).
 * Colonnes réelles de `purchase_requests` : pr_number, title, priority,
 * total_estimated_xof, needed_by_date.
 */
class PrSubmittedMail extends Mailable implements ShouldQueue
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
            subject: 'Demande d\'achat à approuver — ' . $this->purchaseRequest->pr_number,
        );
    }

    public function content(): Content
    {
        $pr     = $this->purchaseRequest;
        $amount = number_format((float) $pr->total_estimated_xof, 0, ',', ' ');

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Nouvelle demande d\'achat</h2>'
              . '<table cellpadding="0" cellspacing="0">'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Référence</td><td style="padding:6px 0;font-weight:600">' . e((string) $pr->pr_number) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Objet</td><td style="padding:6px 0;font-weight:600">' . e((string) $pr->title) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Priorité</td><td style="padding:6px 0;font-weight:600">' . e((string) $pr->priority) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Montant estimé</td><td style="padding:6px 0;font-weight:600">' . e($amount) . ' XOF</td></tr>'
              . '</table>'
              . '<p style="margin-top:16px"><a href="' . e((string) config('app.url')) . '/achats/demandes/' . e((string) $pr->id) . '" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Examiner la demande</a></p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
