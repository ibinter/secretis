<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

/**
 * Rapport hebdomadaire des ressources — envoye aux admins de l'organisation.
 *
 * Point d'appel : App\Services\ResourceService::sendWeeklyResourceReport()
 *   new WeeklyResourceReport($lowStock, $vehicleAlerts, $maintenance)
 * (l'appel y est actuellement commente).
 *
 * $lowStock      : Collection de Supply (getLowStockSupplies)
 * $vehicleAlerts : array d'alertes vehicules (getVehicleAlerts)
 * $maintenance   : nombre d'equipements en maintenance
 */
class WeeklyResourceReport extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param Collection<int, mixed>            $lowStock
     * @param array<int, array<string, mixed>>  $vehicleAlerts
     */
    public function __construct(
        public readonly Collection $lowStock,
        public readonly array      $vehicleAlerts,
        public readonly int        $maintenance,
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
        $parts = [];

        if ($this->lowStock->isNotEmpty()) {
            $parts[] = $this->lowStock->count() . ' fourniture(s) sous le seuil minimum';
        }
        if ($this->vehicleAlerts !== []) {
            $parts[] = count($this->vehicleAlerts) . ' alerte(s) véhicule';
        }
        if ($this->maintenance > 0) {
            $parts[] = $this->maintenance . ' équipement(s) en maintenance';
        }

        return [
            'type'                => 'weekly_resource_report',
            'category'            => 'system',
            'severity'            => 'info',
            'title'               => 'Rapport hebdomadaire des ressources',
            'body'                => $parts === []
                ? 'Aucune alerte ressource cette semaine.'
                : implode(' — ', $parts) . '.',
            'action_url'          => '/ressources',
            'action_label'        => 'Ouvrir les ressources',
            'low_stock_count'     => $this->lowStock->count(),
            'low_stock'           => $this->lowStock->map(fn ($s) => [
                'id'            => $s->id ?? null,
                'name'          => $s->name ?? null,
                'current_stock' => $s->current_stock ?? null,
                'minimum_stock' => $s->minimum_stock ?? null,
            ])->values()->all(),
            'vehicle_alerts'      => $this->vehicleAlerts,
            'maintenance_count'   => $this->maintenance,
        ];
    }
}
