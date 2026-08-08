<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\User;
use App\Models\VisitorInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Invitation envoyée à un visiteur externe (code d'accès + créneau).
 *
 * Appelé par App\Services\VisitorService::createInvitation() :
 *   new VisitorInvitationMail($invitation, $host)
 */
class VisitorInvitationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly VisitorInvitation $invitation,
        public readonly User              $host,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Invitation à une visite — ' . ($this->host->name ?? 'SECRETIS'),
        );
    }

    public function content(): Content
    {
        $date = $this->invitation->visit_date instanceof \DateTimeInterface
            ? $this->invitation->visit_date->format('d/m/Y')
            : (string) $this->invitation->visit_date;

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Vous êtes invité</h2>'
              . '<p>Bonjour ' . e((string) $this->invitation->visitor_name) . ',</p>'
              . '<p>' . e((string) $this->host->name) . ' vous invite à une visite.</p>'
              . '<table cellpadding="0" cellspacing="0">'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Date</td><td style="padding:6px 0;font-weight:600">' . e($date) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Horaire</td><td style="padding:6px 0;font-weight:600">'
              . e((string) $this->invitation->visit_time_start) . ' - ' . e((string) $this->invitation->visit_time_end) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Objet</td><td style="padding:6px 0;font-weight:600">'
              . e((string) ($this->invitation->purpose ?: '-')) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Lieu</td><td style="padding:6px 0;font-weight:600">'
              . e((string) ($this->invitation->location ?: '-')) . '</td></tr>'
              . '<tr><td style="padding:6px 12px 6px 0;color:#666">Code d\'accès</td><td style="padding:6px 0;font-weight:700;font-size:16px">'
              . e((string) $this->invitation->access_code) . '</td></tr>'
              . '</table>'
              . '<p style="margin-top:16px">Présentez ce code à l\'accueil le jour de votre visite.</p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
