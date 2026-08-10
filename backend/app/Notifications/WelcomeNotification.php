<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public string $organisationName;
    public string $adminName;
    public string $trialEndsAt;
    public string $loginUrl;

    public function __construct(
        string $organisationName,
        string $adminName,
        string $trialEndsAt,
        string $loginUrl = ''
    ) {
        $this->organisationName = $organisationName;
        $this->adminName        = $adminName;
        $this->trialEndsAt      = $trialEndsAt;
        $this->loginUrl         = $loginUrl ?: config('app.url') . '/dashboard';
        $this->queue            = 'emails';
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            // La duree venait d'etre ecrite en dur dans l'objet du courriel :
            // le premier message recu par un client annoncait donc une duree
            // qui ne changeait jamais, meme si la configuration changeait.
            ->subject(sprintf(
                'Bienvenue sur IBIG SECRETIS — Votre essai de %d jours est active',
                app(\App\Services\LicenceService::class)->essaiJours()
            ))
            ->view('emails.welcome', [
                'organisationName' => $this->organisationName,
                'adminName'        => $this->adminName,
                'trialEndsAt'      => $this->trialEndsAt,
                'loginUrl'         => $this->loginUrl,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'              => 'welcome',
            'organisationName'  => $this->organisationName,
            'trialEndsAt'       => $this->trialEndsAt,
        ];
    }
}
