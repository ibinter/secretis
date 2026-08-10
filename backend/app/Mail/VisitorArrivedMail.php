<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\VisitLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email à l'hôte : son visiteur vient d'arriver à l'accueil.
 *
 * Appelé par App\Jobs\NotifyHostVisitorArrived::handle().
 *
 * Aucune vue Blade dédiée n'existe dans resources/views/emails/ :
 * le corps est généré en HTML inline (Content::htmlString).
 */
class VisitorArrivedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly VisitLog $visit,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre visiteur est arrivé à l\'accueil',
        );
    }

    public function content(): Content
    {
        $visitor = $this->visit->visitor;
        $name    = $visitor
            ? trim(($visitor->first_name ?? '') . ' ' . ($visitor->last_name ?? ''))
            : 'Votre visiteur';

        $rows = [
            'Visiteur'   => $name,
            'Société'    => $visitor?->company ?: '-',
            'Objet'      => $this->visit->purpose ?: '-',
            'Badge'      => $this->visit->badge_number ?: '-',
            'Arrivée'    => $this->visit->checked_in_at instanceof \DateTimeInterface
                ? $this->visit->checked_in_at->format('d/m/Y à H:i')
                : (string) $this->visit->checked_in_at,
        ];

        $lines = '';
        foreach ($rows as $label => $value) {
            $lines .= '<tr><td style="padding:6px 12px 6px 0;color:#666">'
                    . e((string) $label)
                    . '</td><td style="padding:6px 0;font-weight:600">'
                    . e((string) $value)
                    . '</td></tr>';
        }

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Visiteur arrivé</h2>'
              . '<p>' . e($name) . ' vous attend à l\'accueil.</p>'
              . '<table cellpadding="0" cellspacing="0">' . $lines . '</table>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
