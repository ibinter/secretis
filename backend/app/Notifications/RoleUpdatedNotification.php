<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Changement de role d'un utilisateur.
 *
 * Appelee par App\Http\Controllers\SettingsController::updateUserRole() :
 *   new RoleUpdatedNotification($ancienRole, $validated['role'])
 */
class RoleUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly ?string $ancienRole,
        public readonly string  $nouveauRole,
    ) {
        $this->queue = 'notifications';
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type'         => 'role_updated',
            'category'     => 'system',
            'severity'     => 'info',
            'title'        => 'Votre rôle a été modifié',
            'body'         => $this->ancienRole
                ? "Votre rôle est passé de « {$this->ancienRole} » a « {$this->nouveauRole} »."
                : "Votre rôle est désormais « {$this->nouveauRole} ».",
            'action_url'   => '/parametres/profil',
            'action_label' => 'Voir mon profil',
            'ancien_role'  => $this->ancienRole,
            'nouveau_role' => $this->nouveauRole,
        ];
    }
}
