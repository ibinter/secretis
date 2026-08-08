<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Invitation d'un collaborateur à rejoindre une organisation.
 *
 * Appelé par App\Http\Controllers\SettingsController::inviteUser() :
 *   new InvitationMail($org, $validated['role'], $token)
 *
 * $organization n'est volontairement pas typé : le contrôleur passe le modèle
 * fantôme App\Models\Organisation (voir rapport). Seul ->name / ->raison_sociale
 * est lu, avec repli.
 *
 * À ne pas confondre avec App\Mail\Onboarding\InvitationMail (autre signature).
 */
class InvitationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly mixed  $organization,
        public readonly string $role,
        public readonly string $token,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Invitation à rejoindre ' . $this->organizationName() . ' sur SECRETIS',
        );
    }

    public function content(): Content
    {
        $url = rtrim((string) config('app.url'), '/') . '/invitation/' . $this->token;

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Vous êtes invité</h2>'
              . '<p>Vous avez été invité à rejoindre <strong>' . e($this->organizationName()) . '</strong> '
              . 'sur SECRETIS avec le rôle <strong>' . e($this->role) . '</strong>.</p>'
              . '<p style="margin-top:16px"><a href="' . e($url) . '" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Accepter l\'invitation</a></p>'
              . '<p style="margin-top:12px;color:#666">Ce lien est valable 72 heures.</p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — notification automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }

    private function organizationName(): string
    {
        $org = $this->organization;

        if (is_object($org)) {
            return (string) ($org->name ?? $org->raison_sociale ?? 'votre organisation');
        }

        return 'votre organisation';
    }
}
