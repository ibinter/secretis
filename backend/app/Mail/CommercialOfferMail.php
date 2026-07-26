<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\Organization;
use App\Models\Prospect;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CommercialOfferMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  User|Prospect              $recipient   Utilisateur existant ou prospect
     * @param  Organization|null          $organization
     * @param  array<string, mixed>       $offerData   Données de l'offre
     */
    public function __construct(
        public readonly User|Prospect $recipient,
        public readonly ?Organization $organization,
        public readonly array $offerData,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre offre personnalisée SECRETIS est disponible',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.offre_commerciale',
            with: array_merge([
                'user_name'         => $this->recipient->name,
                'user_email'        => $this->recipient->email,
                'org_name'          => $this->organization?->name ?? $this->offerData['company_name'] ?? '—',
                'app_url'           => config('app.url'),
                'unsubscribe_email' => $this->recipient->email,
                'currency'          => 'XOF',
                'validity_days'     => 30,
            ], $this->offerData),
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
