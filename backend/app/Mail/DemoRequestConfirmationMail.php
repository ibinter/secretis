<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\ProspectDemo;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DemoRequestConfirmationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ProspectDemo $demoRequest,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre demande de démonstration SECRETIS a été reçue',
        );
    }

    public function content(): Content
    {
        $prospect = $this->demoRequest->prospect;

        return new Content(
            view: 'emails.demo_confirmee',
            with: [
                'contact_name'     => $prospect?->name ?? $this->demoRequest->contact_name ?? 'Client',
                'contact_email'    => $prospect?->email ?? $this->demoRequest->contact_email ?? '',
                'contact_phone'    => $prospect?->phone ?? '—',
                'company_name'     => $prospect?->company ?? '—',
                'company_size'     => $prospect?->company_size ?? '—',
                'modules_interest' => $this->demoRequest->modules_interest ?? [],
                'preferred_date'   => $this->demoRequest->scheduled_at?->format('d/m/Y à H:i') ?? 'Dès que possible',
                'demo_reference'   => 'DEMO-' . date('Y') . '-' . str_pad((string) $this->demoRequest->id, 4, '0', STR_PAD_LEFT),
                'demo_token'       => $this->demoRequest->token ?? '',
                'app_url'          => config('app.url'),
                'unsubscribe_email'=> $prospect?->email ?? '',
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
