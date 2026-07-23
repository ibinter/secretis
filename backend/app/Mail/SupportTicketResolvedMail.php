<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SupportTicketResolvedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly SupportTicket $ticket,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Votre demande #{$this->ticket->reference} a été traitée",
        );
    }

    public function content(): Content
    {
        $resolutionTime = null;
        if ($this->ticket->created_at && $this->ticket->resolved_at) {
            $diff = $this->ticket->created_at->diff($this->ticket->resolved_at);
            $resolutionTime = $diff->days > 0
                ? $diff->days . ' jour(s) ' . $diff->h . 'h'
                : $diff->h . 'h ' . $diff->i . 'min';
        }

        return new Content(
            view: 'emails.ticket_resolu',
            with: [
                'user_name'           => $this->user->name,
                'user_email'          => $this->user->email,
                'ticket_id'           => $this->ticket->id,
                'ticket_number'       => $this->ticket->reference,
                'resolution_summary'  => $this->ticket->satisfaction_comment ?? null,
                'resolved_at'         => $this->ticket->resolved_at?->format('d/m/Y à H:i'),
                'resolution_time'     => $resolutionTime,
                'rating_token'        => hash('sha256', $this->ticket->id . $this->ticket->reference . config('app.key')),
                'app_url'             => config('app.url'),
                'unsubscribe_email'   => $this->user->email,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
