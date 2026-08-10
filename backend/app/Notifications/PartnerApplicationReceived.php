<?php

namespace App\Notifications;

use App\Models\Partner;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartnerApplicationReceived extends Notification
{
    public function __construct(private readonly Partner $partner) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Votre candidature IBIG PARTNERS a bien été reçue')
            ->greeting("Bonjour {$this->partner->contact_name},")
            ->line("Merci pour votre intérêt pour le programme **IBIG PARTNERS**.")
            ->line("Nous avons bien reçu votre candidature pour le type de partenariat : **{$this->partner->getPartnerTypeLabel()}**.")
            ->line("Notre équipe l'examine et vous contactera dans les **2 à 5 jours ouvrables** pour la suite du processus.")
            ->line("Voici un résumé de votre dossier :")
            ->line("- **Société** : {$this->partner->company_name}")
            ->line("- **Pays** : {$this->partner->country}")
            ->line("- **Email** : {$this->partner->email}")
            ->action('En savoir plus sur IBIG PARTNERS', url('/partenaires'))
            ->line("En attendant, n'hésitez pas à consulter notre documentation partenaire.")
            ->salutation("L'équipe IBIG Soft");
    }
}
