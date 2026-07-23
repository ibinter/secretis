<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Email d'alerte pour nouvelle connexion ou connexion suspecte.
 *
 * @param  array{ip: string, country?: string, city?: string, device?: string, browser?: string, os?: string, is_suspicious?: bool, login_at?: string} $loginData
 */
class SuspiciousLoginMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly array $loginData,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nouvelle connexion détectée sur votre compte SECRETIS',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.connexion_suspecte',
            with: [
                'user_name'         => $this->user->name,
                'user_email'        => $this->user->email,
                'ip_address'        => $this->loginData['ip'] ?? '—',
                'country'           => $this->loginData['country'] ?? 'Inconnu',
                'city'              => $this->loginData['city'] ?? null,
                'device'            => $this->loginData['device'] ?? 'Inconnu',
                'browser'           => $this->loginData['browser'] ?? 'Inconnu',
                'os'                => $this->loginData['os'] ?? 'Inconnu',
                'is_suspicious'     => $this->loginData['is_suspicious'] ?? false,
                'login_at'          => $this->loginData['login_at'] ?? now()->format('d/m/Y à H:i'),
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
