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
 * Export des données personnelles prêt au téléchargement (lien signé 48 h).
 *
 * Appelé par App\Services\GdprService::handleAccessRequest() :
 *   new DataExportReady($request, $token)
 * Le token en clair n'est jamais persisté (seul son sha256 l'est).
 */
class DataExportReady extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly DataSubjectRequest $request,
        public readonly string             $token,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Votre export de données personnelles est prêt');
    }

    public function content(): Content
    {
        $url = rtrim((string) config('app.url'), '/')
             . '/rgpd/export/' . $this->request->id . '?token=' . $this->token;

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Export disponible</h2>'
              . '<p>L\'export de vos données personnelles (demande n° '
              . e((string) $this->request->id) . ') est prêt.</p>'
              . '<p style="margin-top:16px"><a href="' . e($url) . '" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Télécharger mon export</a></p>'
              . '<p style="margin-top:12px;color:#666">Ce lien expire dans 48 heures et ne doit pas être partagé.</p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — message automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
