<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleFuelLog;
use App\Models\VehicleGeofence;
use App\Models\VehicleGpsLog;
use App\Models\VehicleMaintenanceLog;
use App\Models\VehicleMaintenanceSchedule;
use App\Models\VehicleTrip;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * FleetService — Logique métier du module Parc Auto Avancé
 *
 * Couvre : géolocalisation temps réel, maintenances prédictives,
 * gestion du carburant, géofences, trajets et KPIs de flotte.
 */
class FleetService
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    // =========================================================================
    // CARTE TEMPS RÉEL
    // =========================================================================

    /**
     * Retourne la position actuelle de tous les véhicules d'une organisation.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getFleetMap(Organization $org): array
    {
        return Vehicle::where('organization_id', $org->id)
            ->whereNull('deleted_at')
            ->get()
            ->map(function (Vehicle $v) {
                $activeAssignment = $v->activeAssignment;
                return [
                    'id'               => $v->id,
                    'plate_number'     => $v->plate_number,
                    'brand'            => $v->brand,
                    'model'            => $v->model,
                    'photo'            => $v->photo,
                    'status'           => $v->status,
                    'lat'              => $v->current_lat,
                    'lng'              => $v->current_lng,
                    'speed'            => $v->current_speed,
                    'engine_on'        => $v->engine_on,
                    'fuel_percent'     => $v->fuel_level_percent,
                    'odometer'         => $v->odometer_km,
                    'last_update'      => $v->last_gps_update?->diffForHumans(),
                    'driver'           => $activeAssignment?->user?->name,
                    'map_status'       => $this->resolveMapStatus($v),
                ];
            })
            ->toArray();
    }

    /**
     * Couleur/statut affiché sur la carte.
     * green = en mouvement | orange = arrêté moteur ON | gray = éteint
     */
    private function resolveMapStatus(Vehicle $v): string
    {
        if (!$v->engine_on) return 'off';
        if ($v->current_speed > 0) return 'moving';
        return 'idle';
    }

    // =========================================================================
    // TRAJETS
    // =========================================================================

    /**
     * Démarre un nouveau trajet.
     */
    public function startTrip(Vehicle $vehicle, User $driver, array $data): VehicleTrip
    {
        // Annuler un éventuel trajet en cours
        VehicleTrip::where('vehicle_id', $vehicle->id)
            ->where('status', 'in_progress')
            ->update(['status' => 'cancelled']);

        return VehicleTrip::create([
            'vehicle_id'       => $vehicle->id,
            'organization_id'  => $vehicle->organization_id,
            'driver_user_id'   => $driver->id,
            'start_at'         => now(),
            'start_location'   => $data['start_location'] ?? null,
            'start_lat'        => $data['lat'] ?? $vehicle->current_lat,
            'start_lng'        => $data['lng'] ?? $vehicle->current_lng,
            'purpose'          => $data['purpose'] ?? 'professionnel',
            'notes'            => $data['notes'] ?? null,
            'status'           => 'in_progress',
        ]);
    }

    /**
     * Termine un trajet et calcule les statistiques.
     */
    public function endTrip(VehicleTrip $trip, float $endLat, float $endLng, array $data = []): void
    {
        $endAt    = now();
        $distance = $this->haversineDistance(
            (float) $trip->start_lat, (float) $trip->start_lng,
            $endLat, $endLng
        );
        $duration = (int) $trip->start_at->diffInMinutes($endAt);

        $trip->update([
            'end_at'           => $endAt,
            'end_location'     => $data['end_location'] ?? null,
            'end_lat'          => $endLat,
            'end_lng'          => $endLng,
            'distance_km'      => round($distance, 2),
            'duration_minutes' => $duration,
            'avg_speed'        => $duration > 0 ? round($distance / ($duration / 60), 1) : 0,
            'max_speed'        => $data['max_speed'] ?? null,
            'fuel_consumed_liters' => $data['fuel_consumed'] ?? null,
            'polyline'         => $data['polyline'] ?? null,
            'status'           => 'completed',
        ]);

        // Mise à jour kilométrage véhicule
        if (!empty($data['end_odometer'])) {
            $trip->vehicle->update(['odometer_km' => $data['end_odometer']]);
        }
    }

    /**
     * Historique des trajets d'un véhicule sur une période.
     */
    public function getTripHistory(Vehicle $vehicle, Carbon $start, Carbon $end): array
    {
        $trips = VehicleTrip::where('vehicle_id', $vehicle->id)
            ->whereBetween('start_at', [$start, $end])
            ->with('driver:id,name,email')
            ->orderByDesc('start_at')
            ->get();

        $totalKm   = $trips->sum('distance_km');
        $totalTime = $trips->sum('duration_minutes');

        return [
            'trips'          => $trips->toArray(),
            'total_km'       => round($totalKm, 1),
            'total_time_h'   => round($totalTime / 60, 1),
            'total_trips'    => $trips->count(),
            'avg_km_per_trip' => $trips->count() > 0 ? round($totalKm / $trips->count(), 1) : 0,
        ];
    }

    // =========================================================================
    // GPS
    // =========================================================================

    /**
     * Enregistre une position GPS et déclenche les alertes si nécessaire.
     */
    public function logGpsPosition(int $vehicleId, array $gpsData): void
    {
        $vehicle = Vehicle::findOrFail($vehicleId);

        // Persiste le log GPS
        VehicleGpsLog::create([
            'vehicle_id'         => $vehicleId,
            'organization_id'    => $vehicle->organization_id,
            'latitude'           => $gpsData['lat'],
            'longitude'          => $gpsData['lng'],
            'speed_kmh'          => $gpsData['speed'] ?? 0,
            'heading'            => $gpsData['heading'] ?? 0,
            'altitude'           => $gpsData['altitude'] ?? 0,
            'accuracy'           => $gpsData['accuracy'] ?? 0,
            'engine_on'          => $gpsData['engine_on'] ?? false,
            'fuel_level_percent' => $gpsData['fuel_percent'] ?? null,
            'odometer_km'        => $gpsData['odometer'] ?? null,
            'recorded_at'        => $gpsData['recorded_at'] ?? now(),
            'source'             => $gpsData['source'] ?? 'gps_device',
        ]);

        // Met à jour la position courante du véhicule
        $vehicle->update([
            'current_lat'        => $gpsData['lat'],
            'current_lng'        => $gpsData['lng'],
            'current_speed'      => $gpsData['speed'] ?? 0,
            'engine_on'          => $gpsData['engine_on'] ?? false,
            'fuel_level_percent' => $gpsData['fuel_percent'] ?? null,
            'odometer_km'        => $gpsData['odometer'] ?? $vehicle->odometer_km,
            'last_gps_update'    => now(),
        ]);

        // Alerte vitesse excessive
        if (($gpsData['speed'] ?? 0) > 120) {
            $this->sendSpeedAlert($vehicle, (int) $gpsData['speed']);
        }

        // Vérification géofences
        $this->checkGeofenceViolations($vehicleId, (float) $gpsData['lat'], (float) $gpsData['lng']);
    }

    private function sendSpeedAlert(Vehicle $vehicle, int $speed): void
    {
        Log::warning("Fleet: vitesse excessive {$speed} km/h", [
            'vehicle_id'   => $vehicle->id,
            'plate_number' => $vehicle->plate_number,
        ]);

        // Notification au responsable de la flotte
        $this->notifications->send(
            organizationId: $vehicle->organization_id,
            type: 'fleet_speed_alert',
            title: "Vitesse excessive — {$vehicle->plate_number}",
            body: "{$vehicle->brand} {$vehicle->model} roule à {$speed} km/h",
            data: ['vehicle_id' => $vehicle->id, 'speed' => $speed],
        );
    }

    // =========================================================================
    // MAINTENANCE PRÉDICTIVE
    // =========================================================================

    /**
     * Calcule le statut de chaque type de maintenance pour un véhicule.
     *
     * @return array<string, array{type, label, next_km, next_date, wear_pct, status, days_remaining, km_remaining}>
     */
    public function predictMaintenance(Vehicle $vehicle): array
    {
        $schedules = VehicleMaintenanceSchedule::where('vehicle_id', $vehicle->id)
            ->where('is_active', true)
            ->get();

        $labels = [
            'vidange'  => 'Vidange',
            'pneus'    => 'Pneus',
            'freins'   => 'Freins',
            'courroie' => 'Courroie de distribution',
            'revision' => 'Révision générale',
            'ct'       => 'Contrôle technique',
            'assurance'=> 'Assurance',
            'vignette' => 'Vignette',
        ];

        $results = [];

        foreach ($schedules as $schedule) {
            $wearPct     = 0;
            $kmRemaining = null;
            $dayRemaining= null;
            $alertStatus = 'ok';

            // --- Usure par km ---
            if ($schedule->interval_km && $schedule->next_due_km && $vehicle->odometer_km) {
                $kmDone      = $vehicle->odometer_km - ($schedule->last_done_km ?? 0);
                $wearByKm    = $schedule->interval_km > 0
                    ? min(100, round($kmDone / $schedule->interval_km * 100))
                    : 0;
                $kmRemaining = $schedule->next_due_km - $vehicle->odometer_km;
                $wearPct     = max($wearPct, $wearByKm);
            }

            // --- Usure par date ---
            if ($schedule->interval_days && $schedule->next_due_date) {
                $daysDone     = ($schedule->last_done_date ? Carbon::parse($schedule->last_done_date)->diffInDays(now()) : 0);
                $wearByDay    = $schedule->interval_days > 0
                    ? min(100, round($daysDone / $schedule->interval_days * 100))
                    : 0;
                $dayRemaining = (int) now()->diffInDays($schedule->next_due_date, false);
                $wearPct      = max($wearPct, $wearByDay);
            }

            // --- Détermination du statut ---
            $overdue = ($kmRemaining !== null && $kmRemaining < 0)
                    || ($dayRemaining !== null && $dayRemaining < 0);
            $urgent  = ($kmRemaining !== null && $kmRemaining <= 500)
                    || ($dayRemaining !== null && $dayRemaining <= 15);
            $soon    = ($kmRemaining !== null && $kmRemaining <= 1500)
                    || ($dayRemaining !== null && $dayRemaining <= 30);

            if ($overdue) $alertStatus = 'depassé';
            elseif ($urgent) $alertStatus = 'urgent';
            elseif ($soon) $alertStatus = 'bientot';
            else $alertStatus = 'ok';

            $results[$schedule->maintenance_type] = [
                'type'          => $schedule->maintenance_type,
                'label'         => $labels[$schedule->maintenance_type] ?? $schedule->maintenance_type,
                'next_km'       => $schedule->next_due_km,
                'next_date'     => $schedule->next_due_date,
                'wear_pct'      => (int) $wearPct,
                'status'        => $alertStatus,
                'km_remaining'  => $kmRemaining,
                'days_remaining'=> $dayRemaining,
                'cost_last'     => $schedule->cost_last,
                'interval_km'   => $schedule->interval_km,
                'interval_days' => $schedule->interval_days,
            ];
        }

        // Trier par urgence
        uasort($results, function ($a, $b) {
            $order = ['depassé' => 0, 'urgent' => 1, 'bientot' => 2, 'ok' => 3];
            return ($order[$a['status']] ?? 4) <=> ($order[$b['status']] ?? 4);
        });

        return $results;
    }

    // =========================================================================
    // CARBURANT
    // =========================================================================

    /**
     * Calcule la consommation de carburant d'un véhicule sur une période.
     */
    public function calculateFuelConsumption(Vehicle $vehicle, Carbon $start, Carbon $end): array
    {
        $logs = VehicleFuelLog::where('vehicle_id', $vehicle->id)
            ->whereBetween('fuel_date', [$start, $end])
            ->orderBy('fuel_date')
            ->orderBy('odometer_km')
            ->get();

        if ($logs->count() < 2) {
            return [
                'logs'          => $logs->toArray(),
                'total_liters'  => $logs->sum('quantity_liters'),
                'total_cost'    => $logs->sum('total_cost'),
                'avg_l100km'    => null,
                'trend'         => [],
            ];
        }

        $totalLiters = 0;
        $totalKm     = 0;
        $trend       = [];

        for ($i = 1; $i < $logs->count(); $i++) {
            $prev    = $logs[$i - 1];
            $curr    = $logs[$i];
            $km      = $curr->odometer_km - $prev->odometer_km;
            $liters  = $curr->quantity_liters;

            if ($km > 0 && $curr->full_tank) {
                $l100km = round($liters / $km * 100, 2);
                $trend[] = [
                    'date'   => $curr->fuel_date,
                    'l100km' => $l100km,
                    'km'     => $km,
                    'liters' => $liters,
                    'cost'   => $curr->total_cost,
                ];
                $totalLiters += $liters;
                $totalKm     += $km;
            }
        }

        $avgL100km = $totalKm > 0 ? round($totalLiters / $totalKm * 100, 2) : null;

        // Détection anomalie : +20% vs moyenne
        $avgForAlert = $avgL100km ?? 0;
        foreach ($trend as &$point) {
            $point['anomaly'] = $avgForAlert > 0 && $point['l100km'] > $avgForAlert * 1.20;
        }

        return [
            'logs'         => $logs->toArray(),
            'total_liters' => round($totalLiters, 2),
            'total_cost'   => round($logs->sum('total_cost'), 2),
            'total_km'     => $totalKm,
            'avg_l100km'   => $avgL100km,
            'trend'        => $trend,
        ];
    }

    // =========================================================================
    // GÉOFENCES
    // =========================================================================

    /**
     * Vérifie si un véhicule viole une géofence active et envoie les alertes.
     */
    public function checkGeofenceViolations(int $vehicleId, float $lat, float $lng): void
    {
        $vehicle   = Vehicle::find($vehicleId);
        $geofences = VehicleGeofence::where('organization_id', $vehicle->organization_id)
            ->where('is_active', true)
            ->get();

        foreach ($geofences as $zone) {
            $isInside = $this->isPointInGeofence($lat, $lng, $zone);
            $cacheKey = "geofence_state_{$vehicleId}_{$zone->id}";
            $wasInside = cache($cacheKey, null);

            if ($wasInside === null) {
                // Premier passage : initialise sans alerte
                cache([$cacheKey => $isInside], now()->addHours(2));
                continue;
            }

            cache([$cacheKey => $isInside], now()->addHours(2));

            $entered = !$wasInside && $isInside;
            $exited  = $wasInside && !$isInside;

            if ($entered && $zone->alert_on_enter) {
                $this->sendGeofenceAlert($vehicle, $zone, 'entrée');
            }
            if ($exited && $zone->alert_on_exit) {
                $this->sendGeofenceAlert($vehicle, $zone, 'sortie');
            }
        }
    }

    private function isPointInGeofence(float $lat, float $lng, VehicleGeofence $zone): bool
    {
        if ($zone->type === 'circle') {
            $dist = $this->haversineDistance(
                $lat, $lng,
                (float) $zone->center_lat, (float) $zone->center_lng
            ) * 1000; // en mètres
            return $dist <= $zone->radius_meters;
        }

        // Polygon — Ray casting algorithm
        $coords = $zone->polygon_coords;
        if (empty($coords)) return false;

        $inside = false;
        $n      = count($coords);
        $j      = $n - 1;

        for ($i = 0; $i < $n; $i++) {
            $xi = $coords[$i]['lng'];
            $yi = $coords[$i]['lat'];
            $xj = $coords[$j]['lng'];
            $yj = $coords[$j]['lat'];

            if ((($yi > $lat) !== ($yj > $lat)) &&
                ($lng < ($xj - $xi) * ($lat - $yi) / ($yj - $yi) + $xi)) {
                $inside = !$inside;
            }
            $j = $i;
        }

        return $inside;
    }

    private function sendGeofenceAlert(Vehicle $vehicle, VehicleGeofence $zone, string $event): void
    {
        $userIds = $zone->notify_user_ids ?? [];

        $this->notifications->send(
            organizationId: $vehicle->organization_id,
            type: 'fleet_geofence',
            title: "Géofence : {$event} de zone « {$zone->name} »",
            body: "{$vehicle->plate_number} a effectué une {$event} de la zone {$zone->name}",
            data: ['vehicle_id' => $vehicle->id, 'zone_id' => $zone->id, 'event' => $event],
            targetUserIds: $userIds,
        );
    }

    // =========================================================================
    // RAPPORT MENSUEL
    // =========================================================================

    /**
     * Génère le rapport mensuel complet de la flotte.
     */
    public function generateFleetReport(Organization $org, Carbon $month): array
    {
        $start = $month->copy()->startOfMonth();
        $end   = $month->copy()->endOfMonth();

        $vehicles = Vehicle::where('organization_id', $org->id)->get();

        $byVehicle = [];
        $totalFuel = 0;
        $totalMaint = 0;
        $totalKm   = 0;

        foreach ($vehicles as $v) {
            $fuelLogs = VehicleFuelLog::where('vehicle_id', $v->id)
                ->whereBetween('fuel_date', [$start, $end])
                ->get();
            $maintLogs = VehicleMaintenanceLog::where('vehicle_id', $v->id)
                ->whereBetween('done_date', [$start, $end])
                ->get();
            $trips = VehicleTrip::where('vehicle_id', $v->id)
                ->whereBetween('start_at', [$start, $end])
                ->where('status', 'completed')
                ->get();

            $fuelCost  = $fuelLogs->sum('total_cost');
            $maintCost = $maintLogs->sum('cost');
            $km        = $trips->sum('distance_km');
            $totalCost = $fuelCost + $maintCost;

            $byVehicle[] = [
                'vehicle_id'    => $v->id,
                'plate_number'  => $v->plate_number,
                'brand_model'   => "{$v->brand} {$v->model}",
                'fuel_cost'     => round($fuelCost, 2),
                'maint_cost'    => round($maintCost, 2),
                'total_cost'    => round($totalCost, 2),
                'km'            => round($km, 1),
                'cost_per_km'   => $km > 0 ? round($totalCost / $km, 2) : null,
                'trips'         => $trips->count(),
                'fuel_liters'   => round($fuelLogs->sum('quantity_liters'), 2),
            ];

            $totalFuel  += $fuelCost;
            $totalMaint += $maintCost;
            $totalKm    += $km;
        }

        // Par conducteur
        $byDriver = DB::table('vehicle_trips')
            ->join('users', 'users.id', '=', 'vehicle_trips.driver_user_id')
            ->join('vehicle_fuel_logs', function ($join) use ($start, $end) {
                $join->on('vehicle_fuel_logs.vehicle_id', '=', 'vehicle_trips.vehicle_id')
                     ->whereBetween('vehicle_fuel_logs.fuel_date', [$start->toDateString(), $end->toDateString()]);
            })
            ->where('vehicle_trips.organization_id', $org->id)
            ->whereBetween('vehicle_trips.start_at', [$start, $end])
            ->where('vehicle_trips.status', 'completed')
            ->groupBy('vehicle_trips.driver_user_id', 'users.name')
            ->select(
                'vehicle_trips.driver_user_id',
                'users.name as driver_name',
                DB::raw('ROUND(SUM(vehicle_trips.distance_km), 1) as total_km'),
                DB::raw('COUNT(vehicle_trips.id) as trip_count'),
                DB::raw('ROUND(SUM(vehicle_fuel_logs.quantity_liters), 2) as fuel_liters'),
                DB::raw('ROUND(SUM(vehicle_fuel_logs.total_cost), 2) as fuel_cost'),
            )
            ->get()
            ->toArray();

        return [
            'month'          => $month->format('Y-m'),
            'total_fuel_cost'=> round($totalFuel, 2),
            'total_maint_cost'=> round($totalMaint, 2),
            'total_cost'     => round($totalFuel + $totalMaint, 2),
            'total_km'       => round($totalKm, 1),
            'vehicles_count' => count($vehicles),
            'by_vehicle'     => $byVehicle,
            'by_driver'      => $byDriver,
            'kpis'           => $this->getFleetKpis($org),
        ];
    }

    // =========================================================================
    // KPIs
    // =========================================================================

    /**
     * Retourne les KPIs globaux de la flotte.
     */
    public function getFleetKpis(Organization $org): array
    {
        $vehicles = Vehicle::where('organization_id', $org->id)->get();
        $count    = $vehicles->count();

        if ($count === 0) {
            return [
                'tco'              => 0,
                'availability_pct' => 0,
                'utilization_pct'  => 0,
                'avg_cost_per_km'  => 0,
                'vehicles_on_alert'=> 0,
            ];
        }

        // TCO sur les 12 derniers mois
        $since = now()->subYear();
        $tcoFuel = VehicleFuelLog::where('organization_id', $org->id)
            ->where('fuel_date', '>=', $since)
            ->sum('total_cost');
        $tcoMaint = VehicleMaintenanceLog::where('organization_id', $org->id)
            ->where('done_date', '>=', $since)
            ->sum('cost');

        // Km parcourus (12 mois)
        $totalKm = VehicleTrip::where('organization_id', $org->id)
            ->where('start_at', '>=', $since)
            ->where('status', 'completed')
            ->sum('distance_km');

        // Disponibilité
        $inMaintCount = $vehicles->where('status', 'maintenance')->count();
        $availabilityPct = $count > 0 ? round(($count - $inMaintCount) / $count * 100, 1) : 0;

        // Véhicules en alerte maintenance
        $alertCount = 0;
        foreach ($vehicles as $v) {
            $predictions = $this->predictMaintenance($v);
            foreach ($predictions as $p) {
                if (in_array($p['status'], ['urgent', 'depassé'])) {
                    $alertCount++;
                    break;
                }
            }
        }

        // Taux utilisation (nb de véhicules ayant un trajet dans les 7 derniers jours)
        $activeVehicles = VehicleTrip::where('organization_id', $org->id)
            ->where('start_at', '>=', now()->subDays(7))
            ->distinct('vehicle_id')
            ->count('vehicle_id');
        $utilizationPct = $count > 0 ? round($activeVehicles / $count * 100, 1) : 0;

        $totalCost   = $tcoFuel + $tcoMaint;
        $avgCostPerKm = $totalKm > 0 ? round($totalCost / $totalKm, 2) : 0;

        return [
            'tco'               => round($totalCost, 2),
            'tco_fuel'          => round($tcoFuel, 2),
            'tco_maintenance'   => round($tcoMaint, 2),
            'availability_pct'  => $availabilityPct,
            'utilization_pct'   => $utilizationPct,
            'avg_cost_per_km'   => $avgCostPerKm,
            'vehicles_on_alert' => $alertCount,
            'total_vehicles'    => $count,
            'total_km_12m'      => round($totalKm, 0),
        ];
    }

    // =========================================================================
    // UTILITAIRES
    // =========================================================================

    /**
     * Distance Haversine entre deux coordonnées GPS (en km).
     */
    private function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371; // rayon Terre en km
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2
              + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        $c    = 2 * atan2(sqrt($a), sqrt(1 - $a));
        return $R * $c;
    }
}
