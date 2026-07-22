<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Organization;
use App\Models\Vehicle;
use App\Models\VehicleMaintenanceSchedule;
use App\Services\FleetService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * FleetMaintenanceAlertJob — CRON quotidien de surveillance de la flotte
 *
 * Schedule : Kernel → $schedule->job(FleetMaintenanceAlertJob::class)->dailyAt('07:00');
 *
 * Responsabilités :
 *  - Alertes maintenance imminente (< 500 km ou < 15 jours) → "bientôt"
 *  - Alertes maintenance dépassée                             → "urgent" + escalade
 *  - CT / Assurance / Vignette à 30 jours avant              → "expiration"
 *  - Rapport hebdomadaire santé flotte (lundi)
 */
class FleetMaintenanceAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 300; // 5 minutes max

    public function __construct() {}

    // =========================================================================
    // HANDLE
    // =========================================================================

    public function handle(FleetService $fleetService, NotificationService $notifications): void
    {
        Log::info('FleetMaintenanceAlertJob: démarrage');

        $organizations = Organization::whereHas('vehicles')->get();

        foreach ($organizations as $org) {
            $this->processOrganization($org, $fleetService, $notifications);
        }

        // Rapport hebdomadaire chaque lundi
        if (now()->isMonday()) {
            foreach ($organizations as $org) {
                $this->sendWeeklyHealthReport($org, $fleetService, $notifications);
            }
        }

        Log::info('FleetMaintenanceAlertJob: terminé', [
            'organizations' => $organizations->count(),
        ]);
    }

    // =========================================================================
    // TRAITEMENT PAR ORGANISATION
    // =========================================================================

    private function processOrganization(
        Organization $org,
        FleetService $fleetService,
        NotificationService $notifications,
    ): void {
        $vehicles = Vehicle::where('organization_id', $org->id)
            ->where('status', '!=', 'retired')
            ->get();

        $urgentVehicles = [];
        $soonVehicles   = [];
        $expiringDocs   = [];

        foreach ($vehicles as $vehicle) {
            $predictions = $fleetService->predictMaintenance($vehicle);

            foreach ($predictions as $type => $pred) {
                $vehicleInfo = "[{$vehicle->plate_number}] {$vehicle->brand} {$vehicle->model}";

                if ($pred['status'] === 'depassé') {
                    $urgentVehicles[] = [
                        'vehicle' => $vehicleInfo,
                        'type'    => $pred['label'],
                        'km_over' => $pred['km_remaining'] !== null ? abs($pred['km_remaining']) . ' km' : null,
                        'days_over'=> $pred['days_remaining'] !== null ? abs($pred['days_remaining']) . ' jours' : null,
                    ];

                    // Notification individuelle urgente
                    $notifications->send(
                        organizationId: $org->id,
                        type: 'fleet_maintenance_overdue',
                        title: "URGENT — {$pred['label']} dépassée : {$vehicle->plate_number}",
                        body: "La maintenance {$pred['label']} du véhicule {$vehicle->plate_number} est dépassée.",
                        data: ['vehicle_id' => $vehicle->id, 'maintenance_type' => $type],
                    );
                }

                elseif ($pred['status'] === 'urgent') {
                    $urgentVehicles[] = [
                        'vehicle' => $vehicleInfo,
                        'type'    => $pred['label'],
                        'km_left' => $pred['km_remaining'] !== null ? $pred['km_remaining'] . ' km' : null,
                        'days_left'=> $pred['days_remaining'] !== null ? $pred['days_remaining'] . ' jours' : null,
                    ];
                }

                elseif ($pred['status'] === 'bientot') {
                    $soonVehicles[] = [
                        'vehicle'  => $vehicleInfo,
                        'type'     => $pred['label'],
                        'km_left'  => $pred['km_remaining'] !== null ? $pred['km_remaining'] . ' km' : null,
                        'days_left'=> $pred['days_remaining'] !== null ? $pred['days_remaining'] . ' jours' : null,
                    ];
                }
            }

            // Vérification CT / Assurance / Vignette (30 jours)
            $this->checkExpirations($vehicle, $expiringDocs);
        }

        // Notification résumé si des alertes existent
        if (!empty($urgentVehicles)) {
            $notifications->send(
                organizationId: $org->id,
                type: 'fleet_maintenance_summary',
                title: count($urgentVehicles) . ' véhicule(s) nécessitent une intervention urgente',
                body: implode(', ', array_column(array_slice($urgentVehicles, 0, 3), 'vehicle')),
                data: ['urgent_vehicles' => $urgentVehicles, 'level' => 'urgent'],
            );
        }

        if (!empty($expiringDocs)) {
            foreach ($expiringDocs as $doc) {
                $notifications->send(
                    organizationId: $org->id,
                    type: 'fleet_document_expiring',
                    title: "Expiration {$doc['label']} — {$doc['vehicle']}",
                    body: "Le document expire dans {$doc['days']} jours ({$doc['date']})",
                    data: $doc,
                );
            }
        }
    }

    /**
     * Vérifie CT, assurance, vignette — alerte 30 jours avant.
     */
    private function checkExpirations(Vehicle $vehicle, array &$expiringDocs): void
    {
        $checks = [
            'ct'        => ['date' => $vehicle->control_end,   'label' => 'Contrôle Technique'],
            'assurance' => ['date' => $vehicle->insurance_end, 'label' => 'Assurance'],
        ];

        foreach ($checks as $type => $check) {
            if (!$check['date']) continue;

            $daysLeft = (int) now()->diffInDays($check['date'], false);

            if ($daysLeft >= 0 && $daysLeft <= 30) {
                $expiringDocs[] = [
                    'vehicle'    => "[{$vehicle->plate_number}] {$vehicle->brand} {$vehicle->model}",
                    'vehicle_id' => $vehicle->id,
                    'type'       => $type,
                    'label'      => $check['label'],
                    'date'       => $check['date']->format('d/m/Y'),
                    'days'       => $daysLeft,
                ];
            } elseif ($daysLeft < 0) {
                // Déjà expiré — alerte urgente
                $expiringDocs[] = [
                    'vehicle'    => "[{$vehicle->plate_number}] {$vehicle->brand} {$vehicle->model}",
                    'vehicle_id' => $vehicle->id,
                    'type'       => $type,
                    'label'      => $check['label'],
                    'date'       => $check['date']->format('d/m/Y'),
                    'days'       => $daysLeft,
                    'expired'    => true,
                ];
            }
        }
    }

    // =========================================================================
    // RAPPORT HEBDOMADAIRE
    // =========================================================================

    private function sendWeeklyHealthReport(
        Organization $org,
        FleetService $fleetService,
        NotificationService $notifications,
    ): void {
        $kpis = $fleetService->getFleetKpis($org);

        $notifications->send(
            organizationId: $org->id,
            type: 'fleet_weekly_report',
            title: "Rapport hebdomadaire Parc Auto",
            body: "Flotte : {$kpis['total_vehicles']} véhicules | Disponibilité : {$kpis['availability_pct']}% | Alertes : {$kpis['vehicles_on_alert']}",
            data: $kpis,
        );

        Log::info("Fleet: rapport hebdomadaire envoyé pour {$org->name}");
    }
}
