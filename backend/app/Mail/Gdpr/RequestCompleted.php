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
 * Demande RGPD traitée et clôturée.
 *
 * Appelé par App\Services\GdprService : new RequestCompleted($request)
 */
class RequestCompleted extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly DataSubjectRequest $request,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Votre demande RGPD a été traitée');
    }

    public function content(): Content
    {
        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#27AE60;margin:0 0 12px">Demande traitée</h2>'
              . '<p>Votre demande RGPD n° <strong>' . e((string) $this->request->id) . '</strong> '
              . '(type : ' . e((string) $this->request->type) . ') a été traitée.</p>'
              . '<p>Pour toute question, répondez à ce message ou contactez notre délégué à la protection des données.</p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — message automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
