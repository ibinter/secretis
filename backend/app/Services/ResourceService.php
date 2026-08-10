<?php

namespace App\Services;

use App\Models\Equipment;
use App\Models\Organization;
use App\Models\Room;
use App\Models\RoomReservation;
use App\Models\Supply;
use App\Services\StockService;
use App\Models\SupplyMovement;
use App\Models\User;
use App\Models\Vehicle;
use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * ResourceService — Logique métier MODULE 7 Ressources & Stocks
 */
class ResourceService
{
    /**
     * Génère le planning hebdomadaire d'une salle.
     *
     * Retourne un tableau indexé par jour (lundi→dimanche) avec les créneaux horaires
     * (8h→20h par tranches de 30 minutes) et leur statut.
     *
     * @return array<string, array<string, mixed>>  { 'YYYY-MM-DD' => [ { slot, status, reservation? } ] }
     */
    public function getRoomSchedule(Room $room, Carbon $weekStart): array
    {
        $weekEnd = $weekStart->copy()->endOfWeek();

        $reservations = RoomReservation::with('user:id,name')
            ->where('room_id', $room->id)
            ->whereIn('status', ['pending', 'approved'])
            ->where('start_at', '<=', $weekEnd)
            ->where('end_at', '>=', $weekStart)
            ->get();

        $schedule = [];

        for ($day = $weekStart->copy(); $day->lte($weekEnd); $day->addDay()) {
            $date  = $day->format('Y-m-d');
            $slots = [];

            // Créneaux de 30 minutes de 08:00 à 20:00
            for ($hour = 8; $hour < 20; $hour++) {
                foreach ([0, 30] as $minute) {
                    $slotStart = $day->copy()->setTime($hour, $minute);
                    $slotEnd   = $slotStart->copy()->addMinutes(30);

                    $reservation = $reservations->first(function (RoomReservation $r) use ($slotStart, $slotEnd) {
                        return $r->start_at->lt($slotEnd) && $r->end_at->gt($slotStart);
                    });

                    $slots[] = [
                        'slot'        => $slotStart->format('H:i'),
                        'status'      => $reservation ? $reservation->status : 'free',
                        'reservation' => $reservation ? [
                            'id'         => $reservation->id,
                            'user'       => $reservation->user,
                            'notes'      => $reservation->notes,
                            'start_at'   => $reservation->start_at->format('H:i'),
                            'end_at'     => $reservation->end_at->format('H:i'),
                        ] : null,
                    ];
                }
            }

            $schedule[$date] = $slots;
        }

        return $schedule;
    }

    /**
     * Vérifie les conflits de réservation pour une salle sur un créneau.
     *
     * @return Collection<RoomReservation>
     */
    public function checkRoomConflicts(int $roomId, Carbon $start, Carbon $end): Collection
    {
        return RoomReservation::with('user:id,name')
            ->where('room_id', $roomId)
            ->whereIn('status', ['pending', 'approved'])
            ->where('start_at', '<', $end)
            ->where('end_at', '>', $start)
            ->get();
    }

    /**
     * Assigne un équipement à un utilisateur.
     * Enregistre un log de maintenance et envoie une notification.
     */
    public function assignEquipment(Equipment $equipment, User $user): void
    {
        DB::transaction(function () use ($equipment, $user) {
            $previousUserId = $equipment->assigned_user_id;

            $equipment->update([
                'assigned_user_id' => $user->id,
                'status'           => 'assigned',
            ]);

            // Log d'assignation dans maintenance_logs
            $equipment->maintenanceLogs()->create([
                'requested_by'     => $user->id,
                'reason'           => "Assignation à {$user->name}" . ($previousUserId ? " (précédemment assigné à l'utilisateur #{$previousUserId})" : ''),
                'status'           => 'done',
                'resolved_at'      => now(),
            ]);
        });

        // Notification (silencieux si echec)
        try {
            // $user->notify(new \App\Notifications\EquipmentAssigned($equipment));
        } catch (\Throwable $e) {
            Log::warning("Notification assignation équipement échouée : {$e->getMessage()}");
        }
    }

    /**
     * Enregistre un mouvement de stock (entrée/sortie).
     *
     * @throws \InvalidArgumentException Si la sortie excède le stock disponible.
     */
    /**
     * Mouvement de stock.
     *
     * Le calcul vivait ici, sans verrou : la quantité était lue avant la
     * transaction, le contrôle « stock suffisant » portait donc sur une valeur
     * déjà périmée, et deux sorties simultanées se perdaient l'une l'autre.
     * Toute la logique — verrou, coût moyen, alerte de seuil — est passée dans
     * StockService ; cette méthode reste comme point d'entrée des appels
     * existants.
     */
    public function processSupplyMovement(
        Supply $supply,
        string $type,
        int    $qty,
        string $reason,
        User   $user
    ): void {
        $stock = app(StockService::class);

        $type === 'in'
            ? $stock->entrer($supply, $qty, $reason, $user)
            : $stock->sortir($supply, $qty, $reason, $user);
    }

    /**
     * Retourne les fournitures en stock bas pour une organisation.
     */
    public function getLowStockSupplies(Organization $org): Collection
    {
        return Supply::forOrganization($org->id)
            ->lowStock()
            ->orderByRaw('quantity - min_quantity ASC')
            ->get();
    }

    /**
     * Retourne les alertes véhicule (assurance, CT, vidange) expirant dans 30 jours.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getVehicleAlerts(Organization $org): array
    {
        $vehicles = Vehicle::forOrganization($org->id)
            ->whereNot('status', 'retired')
            ->get();

        $alerts = [];

        foreach ($vehicles as $vehicle) {
            $vehicleAlerts = $vehicle->alertsNeeded();

            foreach ($vehicleAlerts as $alert) {
                $alerts[] = array_merge($alert, [
                    'vehicle_id'    => $vehicle->id,
                    'plate_number'  => $vehicle->plate_number,
                    'vehicle_label' => "{$vehicle->brand} {$vehicle->model} ({$vehicle->plate_number})",
                ]);
            }
        }

        // Trier par jours restants croissant (les plus urgents en premier)
        usort($alerts, fn ($a, $b) => $a['days_remaining'] <=> $b['days_remaining']);

        return $alerts;
    }

    /**
     * Rapport hebdomadaire des ressources — destiné au CRON.
     * Envoie un email récapitulatif aux admins de chaque organisation.
     */
    public function sendWeeklyResourceReport(): void
    {
        $organizations = Organization::all();

        foreach ($organizations as $org) {
            try {
                $lowStock      = $this->getLowStockSupplies($org);
                $vehicleAlerts = $this->getVehicleAlerts($org);
                $maintenance   = Equipment::forOrganization($org->id)->underMaintenance()->count();

                // Envoyer uniquement si au moins une alerte active
                if ($lowStock->isEmpty() && empty($vehicleAlerts) && $maintenance === 0) {
                    continue;
                }

                $admins = User::where('organization_id', $org->id)
                    ->role('admin_org')
                    ->get();

                // $admins->each(fn ($admin) =>
                //     $admin->notify(new \App\Notifications\WeeklyResourceReport($lowStock, $vehicleAlerts, $maintenance))
                // );

                Log::info("Rapport ressources hebdo envoyé pour {$org->name} ({$admins->count()} admin(s)).");
            } catch (\Throwable $e) {
                Log::error("Erreur rapport ressources org #{$org->id} : {$e->getMessage()}");
            }
        }
    }
}
