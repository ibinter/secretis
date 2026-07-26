<?php

namespace App\Notifications;

use App\Models\Partner;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartnerApproved extends Notification
{
    public function __construct(private readonly Partner $partner) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $dashboardUrl = route('partner.dashboard');
        $referralLink = url('/inscription?ref=' . $this->partner->referral_code);

        return (new MailMessage)
            ->subject('Félicitations — Votre candidature IBIG PARTNERS est approuvée !')
            ->greeting("Félicitations {$this->partner->contact_name} !")
            ->line("Nous avons le plaisir de vous informer que votre candidature au programme **IBIG PARTNERS** a été **approuvée**.")
            ->line("Vous êtes désormais partenaire officiel IBIG Soft en tant que **{$this->partner->getPartnerTypeLabel()}**.")
            ->line("---")
            ->line("### Vos informations partenaire")
            ->line("- **Code de parrainage** : `{$this->partner->referral_code}`")
            ->line("- **Taux de commission** : {$this->partner->commission_rate} %")
            ->line("- **Lien de parrainage** : {$referralLink}")
            ->line("---")
            ->line("### Prochaines étapes")
            ->line("1. Connectez-vous à votre espace partenaire pour accéder à votre tableau de bord")
            ->line("2. Partagez votre lien de parrainage avec vos prospects")
            ->line("3. Suivez vos clients référés et vos commissions en temps réel")
            ->action('Accéder à mon espace partenaire', $dashboardUrl)
            ->line("Pour toute question, contactez votre responsable partenaire à partners@ibigsoft.com.")
            ->salutation("L'équipe IBIG Soft");
    }
}
