<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly Organization $organization,
        public readonly int $trialDays = 14,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Bienvenue sur IBIG SECRETIS — votre essai de {$this->trialDays} jours est activé",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.bienvenue',
            with: [
                'user_name'       => $this->user->name,
                'user_email'      => $this->user->email,
                'org_name'        => $this->organization->name,
                'trial_days'      => $this->trialDays,
                'app_url'         => config('app.url'),
                'unsubscribe_email' => $this->user->email,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
