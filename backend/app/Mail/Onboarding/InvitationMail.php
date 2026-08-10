<?php

declare(strict_types=1);

namespace App\Mail\Onboarding;

use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Invitation d'un collaborateur pendant l'onboarding.
 *
 * Appelé par App\Services\OnboardingService::inviteUser() :
 *   new InvitationMail($org, $invitation, $invitedBy)
 *
 * À ne pas confondre avec App\Mail\InvitationMail (SettingsController).
 */
class InvitationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Organization           $organization,
        public readonly OrganizationInvitation $invitation,
        public readonly User                   $invitedBy,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Invitation à rejoindre ' . $this->organization->name . ' sur SECRETIS',
        );
    }

    public function content(): Content
    {
        $url = rtrim((string) config('app.url'), '/') . '/invitation/' . $this->invitation->token;

        $expires = $this->invitation->expires_at instanceof \DateTimeInterface
            ? $this->invitation->expires_at->format('d/m/Y')
            : (string) $this->invitation->expires_at;

        $html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222">'
              . '<h2 style="color:#2E86C1;margin:0 0 12px">Vous êtes invité</h2>'
              . '<p>' . e((string) $this->invitedBy->name) . ' vous invite à rejoindre <strong>'
              . e((string) $this->organization->name) . '</strong> sur SECRETIS avec le rôle <strong>'
              . e((string) $this->invitation->role) . '</strong>.</p>'
              . '<p style="margin-top:16px"><a href="' . e($url) . '" '
              . 'style="background:#2E86C1;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">'
              . 'Accepter l\'invitation</a></p>'
              . '<p style="margin-top:12px;color:#666">Cette invitation expire le ' . e($expires) . '.</p>'
              . '<p style="margin-top:20px;color:#888;font-size:12px">SECRETIS ERP — message automatique.</p>'
              . '</div>';

        return new Content(htmlString: $html);
    }
}
