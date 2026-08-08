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
 * Licence expirée : passage en période de grâce.
 *
 * Appelé par App\Console\Commands\ProcessLicenseGrace :
 *   new LicenseGracePeriod($license, $graceDays)
 *
 * Aucune vue Blade dédiée : corps HTML inline (Content::htmlString).
 * NOTE : la table `licenses` porte `ends_at` (la commande lit `expires_at`).
 */
class LicenseGracePeriod extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly License $license,
        public readonly int     $graceDays,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Votre licence SECRETIS est en période de grâce ({$this->graceDays} jours)",
        );
    }

    public function content(): Content
    {
        $end = $this->license->ends_at instanceof \DateTimeInterface
            ? $this->license->ends_at->format('d/m/Y')
            : (string) $this->license->ends_at;

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#E67E22;margin:0 0 12px">Période de grâce activée</h2>'
              . '<p>Votre licence <strong>' . e((string) $this->license->plan_name) . '</strong> '
              . 'a expiré le ' . e($end) . '.</p>'
              . '<p>Vous disposez de <strong>' . e((string) $this->graceDays) . ' jours</strong> '
              . 'pour renouveler avant la suspension de votre accès.</p>'
              . '<p style="margin-top:16px"><a href="' . e((string) config('app.url')) . '/abonnement" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Renouveler maintenant</a></p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
