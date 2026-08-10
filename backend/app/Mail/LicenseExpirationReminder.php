<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\License;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Rappel d'échéance de licence (J-3).
 *
 * Appelé par App\Console\Commands\ProcessLicenseGrace :
 *   new LicenseExpirationReminder($license)
 *
 * Aucune vue Blade dédiée : corps HTML inline (Content::htmlString).
 */
class LicenseExpirationReminder extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly License $license,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre licence SECRETIS arrive à échéance',
        );
    }

    public function content(): Content
    {
        $end = $this->license->ends_at instanceof \DateTimeInterface
            ? $this->license->ends_at->format('d/m/Y')
            : (string) $this->license->ends_at;

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#E67E22;margin:0 0 12px">Échéance proche</h2>'
              . '<p>Votre licence <strong>' . e((string) $this->license->plan_name) . '</strong> '
              . 'arrive à échéance le <strong>' . e($end) . '</strong>.</p>'
              . '<p>Renouvelez dès maintenant pour éviter toute interruption de service.</p>'
              . '<p style="margin-top:16px"><a href="' . e((string) config('app.url')) . '/abonnement" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Renouveler ma licence</a></p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
