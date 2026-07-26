<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification in-app : licence (essai ou payant) expirant sous peu.
 *
 * Envoyée aux admins de l'organisation par CheckExpiringLicensesCommand.
 * Stockée dans la table `notifications` (Laravel database driver).
 */
class LicenseExpiringNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int    $daysLeft,
        public readonly string $orgName,
        public readonly string $expiresAt,
        public readonly string $renewUrl,
    ) {
        $this->queue = 'notifications';
    }

    public function via(mixed $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(mixed $notifiable): array
    {
        $plural  = $this->daysLeft > 1;
        $urgency = $this->daysLeft === 1 ? 'high' : ($this->daysLeft <= 3 ? 'medium' : 'low');

        return [
            'type'       => 'license_expiring',
            'urgency'    => $urgency,
            'days_left'  => $this->daysLeft,
            'org_name'   => $this->orgName,
            'expires_at' => $this->expiresAt,
            'renew_url'  => $this->renewUrl,
            'title'      => "Licence expirant dans {$this->daysLeft} jour" . ($plural ? 's' : ''),
            'body'       => "Votre accès à SECRETIS pour « {$this->orgName} » expire le {$this->expiresAt}. "
                          . "Renouvelez maintenant pour ne pas perdre l'accès.",
        ];
    }

    public function toBroadcast(mixed $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
