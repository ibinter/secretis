<?php

declare(strict_types=1);

namespace App\Mail\Gdpr;

use App\Models\DataSubjectRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Accusé de réception d'une demande RGPD.
 *
 * Appelé par App\Http\Controllers\GdprController : new RequestReceived($dsRequest)
 */
class RequestReceived extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly DataSubjectRequest $request,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Votre demande RGPD a bien été enregistrée');
    }

    public function content(): Content
    {
        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Demande enregistrée</h2>'
              . '<p>Votre demande RGPD n° <strong>' . e((string) $this->request->id) . '</strong> '
              . '(type : ' . e((string) $this->request->type) . ') a bien été reçue.</p>'
              . '<p>Elle sera traitée dans un délai maximum de 30 jours, conformément au RGPD.</p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — message automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
