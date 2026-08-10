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
 * Licence définitivement expirée — accès suspendu.
 *
 * Appelé par App\Console\Commands\ProcessLicenseGrace : new LicenseExpired($license)
 *
 * Ne pas confondre avec App\Mail\LicenseExpiredMail (vue emails.expiration),
 * qui attend un User + une Organization et n'est pas interchangeable ici.
 */
class LicenseExpired extends Mailable implements ShouldQueue
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
            subject: 'Votre licence SECRETIS a expiré — accès suspendu',
        );
    }

    public function content(): Content
    {
        $end = $this->license->ends_at instanceof \DateTimeInterface
            ? $this->license->ends_at->format('d/m/Y')
            : (string) $this->license->ends_at;

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#C0392B;margin:0 0 12px">Licence expirée</h2>'
              . '<p>La période de grâce est terminée : votre licence <strong>'
              . e((string) $this->license->plan_name) . '</strong> (échéance du ' . e($end) . ') '
              . 'est désormais expirée et l\'accès à votre espace est suspendu.</p>'
              . '<p>Vos données sont conservées. Le renouvellement rétablit l\'accès immédiatement.</p>'
              . '<p style="margin-top:16px"><a href="' . e((string) config('app.url')) . '/abonnement" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Réactiver mon abonnement</a></p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
