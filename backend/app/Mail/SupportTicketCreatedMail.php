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

class SupportTicketCreatedMail extends Mailable implements ShouldQueue
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
            subject: "Votre demande #{$this->ticket->reference} a été enregistrée — IBIG SECRETIS Support",
        );
    }

    public function content(): Content
    {
        $slaMap = [
            'urgent' => '4 heures ouvrables',
            'high'   => '24 heures ouvrables',
            'medium' => '48 heures ouvrables',
            'low'    => '5 jours ouvrables',
        ];

        return new Content(
            view: 'emails.ticket_cree',
            with: [
                'user_name'        => $this->user->name,
                'user_email'       => $this->user->email,
                'ticket_id'        => $this->ticket->id,
                'ticket_number'    => $this->ticket->reference,
                'ticket_subject'   => $this->ticket->subject,
                'ticket_category'  => $this->ticket->category,
                'ticket_priority'  => $this->ticket->priority,
                'sla_label'        => $slaMap[$this->ticket->priority] ?? '48 heures ouvrables',
                'app_url'          => config('app.url'),
                'unsubscribe_email'=> $this->user->email,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
