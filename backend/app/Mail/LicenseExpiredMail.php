<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\License;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LicenseExpiredMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public readonly bool $isTrial;

    public function __construct(
        public readonly User $user,
        public readonly Organization $organization,
        public readonly License $license,
    ) {
        $this->isTrial = $this->license->status === 'trial';
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        $type = $this->isTrial ? 'essai' : 'abonnement';
        return new Envelope(
            subject: "Votre {$type} SECRETIS a expiré — réactivez maintenant",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.expiration',
            with: [
                'user_name'         => $this->user->name,
                'user_email'        => $this->user->email,
                'org_name'          => $this->organization->name,
                'is_trial'          => $this->isTrial,
                'expired_at'        => $this->license->ends_at->format('d/m/Y'),
                'grace_until'       => $this->license->grace_until?->format('d/m/Y') ?? now()->addDays(7)->format('d/m/Y'),
                'user_count'        => $this->organization->users()->count(),
                'app_url'           => config('app.url'),
                'unsubscribe_email' => $this->user->email,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
