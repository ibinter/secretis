<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Quotation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Offre retenue à l'issue d'une consultation — email au fournisseur.
 *
 * Point d'appel : App\Services\ProcurementService (actuellement commenté) :
 *   new QuotationSelectedMail($selected, $justification)
 */
class QuotationSelectedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Quotation $quotation,
        public readonly ?string   $justification = null,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre offre a été retenue — ' . $this->quotation->quotation_number,
        );
    }

    public function content(): Content
    {
        $amount = number_format((float) $this->quotation->total_amount_xof, 0, ',', ' ');

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#27AE60;margin:0 0 12px">Offre retenue</h2>'
              . '<p>Votre offre <strong>' . e((string) $this->quotation->quotation_number) . '</strong> '
              . '(' . e($amount) . ' ' . e((string) ($this->quotation->currency_code ?? 'XOF')) . ') a été retenue.</p>'
              . ($this->justification
                    ? '<p><strong>Motivation :</strong> ' . e($this->justification) . '</p>'
                    : '')
              . '<p>Un bon de commande vous sera transmis prochainement.</p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
