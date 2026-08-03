<?php

namespace App\Mail;

use App\Models\Meeting;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ConvocationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Meeting $meeting,
        public readonly User    $recipient,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Convocation — {$this->meeting->title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.convocation',
        );
    }
}
