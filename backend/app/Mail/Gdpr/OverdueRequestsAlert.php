<?php

declare(strict_types=1);

namespace App\Mail\Gdpr;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Alerte au DPO : demandes RGPD proches du délai légal de 30 jours.
 *
 * Appelé par App\Console\Commands\ProcessPendingGdprRequests :
 *   new OverdueRequestsAlert($alerts)
 * Chaque entrée : id, type, email, days, org_id, deadline.
 */
class OverdueRequestsAlert extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param array<int, array<string, mixed>> $alerts
     */
    public function __construct(
        public readonly array $alerts,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[RGPD] ' . count($this->alerts) . ' demande(s) proche(s) du délai légal',
        );
    }

    public function content(): Content
    {
        $rows = '';
        foreach ($this->alerts as $alert) {
            $rows .= '<tr>'
                   . '<td style="padding:4px 10px 4px 0">#' . e((string) ($alert['id'] ?? '-')) . '</td>'
                   . '<td style="padding:4px 10px 4px 0">' . e((string) ($alert['type'] ?? '-')) . '</td>'
                   . '<td style="padding:4px 10px 4px 0">' . e((string) ($alert['email'] ?? '-')) . '</td>'
                   . '<td style="padding:4px 10px 4px 0">' . e((string) ($alert['days'] ?? '-')) . ' j</td>'
                   . '<td style="padding:4px 0">' . e((string) ($alert['deadline'] ?? '-')) . '</td>'
                   . '</tr>';
        }

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#C0392B;margin:0 0 12px">Demandes RGPD en retard</h2>'
              . '<p>Les demandes suivantes approchent ou dépassent le délai légal de 30 jours :</p>'
              . '<table cellpadding="0" cellspacing="0">'
              . '<tr style="color:#666"><th align="left">ID</th><th align="left">Type</th>'
              . '<th align="left">Email</th><th align="left">Attente</th><th align="left">Échéance</th></tr>'
              . $rows
              . '</table>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — alerte automatique DPO.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
