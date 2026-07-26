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

class LicenseExpiringMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public readonly bool $isTrial;

    public function __construct(
        public readonly User $user,
        public readonly Organization $organization,
        public readonly License $license,
        public readonly int $daysLeft,
    ) {
        $this->isTrial = $this->license->status === 'trial';
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        $subject = match (true) {
            $this->isTrial && $this->daysLeft <= 1 => 'Votre essai expire dans moins de 24 heures — ne perdez pas accès',
            $this->isTrial => "Votre essai SECRETIS expire dans {$this->daysLeft} jours",
            $this->daysLeft <= 1 => 'Votre abonnement SECRETIS expire dans moins de 24 heures',
            default => "Votre abonnement SECRETIS arrive à échéance dans {$this->daysLeft} jours",
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        $modules = is_array($this->license->modules)
            ? $this->license->modules
            : (json_decode((string) $this->license->modules, true) ?? []);

        return new Content(
            view: 'emails.echeance',
            with: [
                'user_name'         => $this->user->name,
                'user_email'        => $this->user->email,
                'org_name'          => $this->organization->name,
                'is_trial'          => $this->isTrial,
                'days_left'         => $this->daysLeft,
                'expires_at'        => $this->license->ends_at->format('d/m/Y'),
                'plan_name'         => $this->license->plan_name,
                'price'             => number_format((float) $this->license->price, 0, ',', ' '),
                'currency'          => 'XOF',
                'max_users'         => $this->license->max_users,
                'modules_used'      => $modules,
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
