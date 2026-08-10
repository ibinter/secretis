<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Equipment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Equipement assigne a un utilisateur.
 *
 * Point d'appel : App\Services\ResourceService::assignEquipment()
 *   $user->notify(new EquipmentAssigned($equipment));
 * (l'appel y est actuellement commente).
 */
class EquipmentAssigned extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Equipment $equipment,
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
        $label = trim(($this->equipment->brand ?? '') . ' ' . ($this->equipment->model ?? ''));

        return [
            'type'          => 'equipment_assigned',
            'category'      => 'system',
            'severity'      => 'info',
            'title'         => 'Un équipement vous a été attribué',
            'body'          => "« {$this->equipment->name} »"
                             . ($label !== '' ? " ({$label})" : '')
                             . ($this->equipment->serial_number ? " — n/s {$this->equipment->serial_number}" : '')
                             . ' est désormais sous votre responsabilité.',
            'action_url'    => '/ressources/equipements/' . $this->equipment->id,
            'action_label'  => 'Voir l\'équipement',
            'equipment_id'  => $this->equipment->id,
            'name'          => $this->equipment->name,
            'serial_number' => $this->equipment->serial_number,
            'category_name' => $this->equipment->category,
        ];
    }
}
