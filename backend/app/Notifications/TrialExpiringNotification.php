<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TrialExpiringNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** @var int Nombre de jours restants (7, 3 ou 1) */
    public int    $daysLeft;
    public string $organisationName;
    public string $adminName;
    public string $trialEndsAt;
    public string $upgradeUrl;
    public array  $usedFeatures;

    /**
     * @param int    $daysLeft         Jours restants : 7, 3 ou 1
     * @param string $organisationName Nom de l'organisation
     * @param string $adminName        Nom de l'administrateur
     * @param string $trialEndsAt      Date d'expiration lisible (ex: "28 juillet 2026")
     * @param array  $usedFeatures     Liste des fonctionnalités utilisées (pour J-7)
     * @param string $upgradeUrl       URL de la page d'abonnement
     */
    public function __construct(
        int    $daysLeft,
        string $organisationName,
        string $adminName,
        string $trialEndsAt,
        array  $usedFeatures = [],
        string $upgradeUrl   = ''
    ) {
        $this->daysLeft         = $daysLeft;
        $this->organisationName = $organisationName;
        $this->adminName        = $adminName;
        $this->trialEndsAt      = $trialEndsAt;
        $this->usedFeatures     = $usedFeatures;
        $this->upgradeUrl       = $upgradeUrl ?: config('app.url') . '/abonnement';
        $this->queue            = 'emails';
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $view    = $this->resolveView();
        $subject = $this->resolveSubject();

        return (new MailMessage)
            ->subject($subject)
            ->view($view, [
                'organisationName' => $this->organisationName,
                'adminName'        => $this->adminName,
                'trialEndsAt'      => $this->trialEndsAt,
                'upgradeUrl'       => $this->upgradeUrl,
                'usedFeatures'     => $this->usedFeatures,
            ]);
    }

    protected function resolveView(): string
    {
        return match ($this->daysLeft) {
            7       => 'emails.trial_expiring_7',
            3       => 'emails.trial_expiring_3',
            1       => 'emails.trial_expiring_1',
            default => 'emails.trial_expiring_7',
        };
    }

    protected function resolveSubject(): string
    {
        return match ($this->daysLeft) {
            7       => "[SECRETIS] Il vous reste 7 jours d'essai gratuit",
            3       => "[SECRETIS] Plus que 3 jours — Activez votre abonnement",
            1       => "[SECRETIS] URGENT — Votre accès expire dans moins de 24 heures",
            default => "[SECRETIS] Votre essai expire bientôt",
        };
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'              => 'trial_expiring',
            'daysLeft'          => $this->daysLeft,
            'organisationName'  => $this->organisationName,
            'trialEndsAt'       => $this->trialEndsAt,
        ];
    }
}
