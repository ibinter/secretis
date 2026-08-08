<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Rfq;
use App\Models\Supplier;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Invitation d'un fournisseur à répondre à une consultation (RFQ).
 *
 * Point d'appel : App\Services\ProcurementService (actuellement commenté) :
 *   new RfqInvitationMail($rfq, $supplier)
 */
class RfqInvitationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Rfq      $rfq,
        public readonly Supplier $supplier,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Consultation fournisseur — ' . $this->rfq->rfq_number,
        );
    }

    public function content(): Content
    {
        $closing = $this->rfq->closing_date instanceof \DateTimeInterface
            ? $this->rfq->closing_date->format('d/m/Y à H:i')
            : (string) $this->rfq->closing_date;

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Appel d\'offres</h2>'
              . '<p>Bonjour ' . e((string) ($this->supplier->name ?? '')) . ',</p>'
              . '<p>Vous êtes invité à répondre à la consultation <strong>'
              . e((string) $this->rfq->rfq_number) . '</strong> — ' . e((string) $this->rfq->title) . '.</p>'
              . '<p><strong>Date limite de remise des offres :</strong> ' . e($closing) . '</p>'
              . '<p style="margin-top:16px"><a href="' . e((string) config('app.url')) . '/portail-fournisseur/consultations/' . e((string) $this->rfq->id) . '" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Déposer mon offre</a></p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
