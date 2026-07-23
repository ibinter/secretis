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

class AccountSuspendedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly Organization $organization,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Information importante concernant votre compte SECRETIS',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.compte_suspendu',
            with: [
                'user_name'         => $this->user->name,
                'user_email'        => $this->user->email,
                'org_name'          => $this->organization->name,
                'org_id'            => $this->organization->id,
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
