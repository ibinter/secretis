<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\VehicleAssignment;
use App\Models\VehicleFuelLog;
use App\Models\VehicleGeofence;
use App\Models\VehicleMaintenanceLog;
use App\Models\VehicleMaintenanceSchedule;
use App\Models\VehicleTrip;
use App\Services\FleetService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * FleetController — Module Parc Auto Avancé
 *
 * Gère : carte GPS, trajets, maintenance, carburant,
 * géofences, affectations et rapports.
 */
class FleetController extends Controller
{
    public function __construct(
        private readonly FleetService $fleet,
    ) {}

    // =========================================================================
    // PAGES INERTIA
    // =========================================================================

    public function mapView(): Response
    {
        $org     = auth()->user()->organization;
        $vehicles = $this->fleet->getFleetMap($org);

        return Inertia::render('Fleet/MapView', [
            'vehicles' => $vehicles,
        ]);
    }

    public function vehicleDetail(int $id): Response
    {
        $vehicle = Vehicle::where('organization_id', auth()->user()->organization_id)
            ->with(['activeAssignment.user'])
            ->findOrFail($id);

        $maintenance = $this->fleet->predictMaintenance($vehicle);
        $fuelSummary = $this->fleet->calculateFuelConsumption(
            $vehicle,
            now()->subMonths(12),
            now()
        );

        return Inertia::render('Fleet/VehicleDetail', [
            'vehicle'     => $vehicle,
            'maintenance' => $maintenance,
            'fuelSummary' => $fuelSummary,
        ]);
    }

    public function maintenancePlanning(): Response
    {
        $org      = auth()->user()->organization;
        $vehicles = Vehicle::where('organization_id', $org->id)->get();

        $planningRows = [];
        foreach ($vehicles as $v) {
            foreach ($this->fleet->predictMaintenance($v) as $m) {
                $planningRows[] = array_merge($m, [
                    'vehicle_id'   => $v->id,
                    'plate_number' => $v->plate_number,
                    'brand_model'  => "{$v->brand} {$v->model}",
                ]);
            }
        }

        // Tri par urgence
        usort($planningRows, function ($a, $b) {
            $order = ['depassé' => 0, 'urgent' => 1, 'bientot' => 2, 'ok' => 3];
            return ($order[$a['status']] ?? 4) <=> ($order[$b['status']] ?? 4);
        });

        return Inertia::render('Fleet/MaintenancePlanning', [
            'planningRows' => $planningRows,
        ]);
    }

    public function fuelManagement(): Response
    {
        $org      = auth()->user()->organization;
        $vehicles = Vehicle::where('organization_id', $org->id)->select('id', 'plate_number', 'brand', 'model')->get();

        $recentFuels = VehicleFuelLog::where('organization_id', $org->id)
            ->with(['vehicle:id,plate_number,brand,model', 'driver:id,name'])
            ->orderByDesc('fuel_date')
            ->limit(50)
            ->get();

        return Inertia::render('Fleet/FuelManagement', [
            'vehicles'    => $vehicles,
            'recentFuels' => $recentFuels,
        ]);
    }

    public function fleetReport(): Response
    {
        $org    = auth()->user()->organization;
        $month  = request()->has('month')
            ? Carbon::parse(request('month'))
            : now();

        $report = $this->fleet->generateFleetReport($org, $month);

        return Inertia::render('Fleet/FleetReport', [
            'report'       => $report,
            'currentMonth' => $month->format('Y-m'),
        ]);
    }

    public function geofenceManager(): Response
    {
        $org       = auth()->user()->organization;
        $geofences = VehicleGeofence::where('organization_id', $org->id)->get();

        return Inertia::render('Fleet/GeofenceManager', [
            'geofences' => $geofences,
        ]);
    }

    public function tripLogger(): Response
    {
        $user     = auth()->user();
        $vehicles = Vehicle::where('organization_id', $user->organization_id)
            ->where('status', 'available')
            ->select('id', 'plate_number', 'brand', 'model')
            ->get();

        $myTrips = VehicleTrip::where('driver_user_id', $user->id)
            ->where('start_at', '>=', now()->startOfMonth())
            ->orderByDesc('start_at')
            ->get();

        return Inertia::render('Fleet/TripLogger', [
            'vehicles' => $vehicles,
            'myTrips'  => $myTrips,
            'monthKm'  => round($myTrips->sum('distance_km'), 1),
        ]);
    }

    // =========================================================================
    // API — CARTE GPS
    // =========================================================================

    /**
     * GET /fleet/map — Positions actuelles (polling)
     */
    public function getMapData(): JsonResponse
    {
        $org  = auth()->user()->organization;
        $data = $this->fleet->getFleetMap($org);
        return response()->json(['vehicles' => $data]);
    }

    // =========================================================================
    // API — TRAJETS
    // =========================================================================

    /**
     * GET /fleet/vehicles/{id}/trips
     */
    public function trips(int $id): JsonResponse
    {
        $vehicle = $this->authorizeVehicle($id);

        $start = request()->has('start')
            ? Carbon::parse(request('start'))
            : now()->startOfMonth();
        $end = request()->has('end')
            ? Carbon::parse(request('end'))
            : now();

        $history = $this->fleet->getTripHistory($vehicle, $start, $end);
        return response()->json($history);
    }

    /**
     * POST /fleet/trips/start
     */
    public function startTrip(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id'     => 'required|integer',
            'purpose'        => 'required|in:professionnel,personnel,mixte',
            'start_location' => 'nullable|string|max:255',
            'lat'            => 'nullable|numeric',
            'lng'            => 'nullable|numeric',
            'notes'          => 'nullable|string|max:1000',
        ]);

        $vehicle = $this->authorizeVehicle($validated['vehicle_id']);
        $trip    = $this->fleet->startTrip($vehicle, auth()->user(), $validated);

        return response()->json(['trip' => $trip], 201);
    }

    /**
     * POST /fleet/trips/{id}/end
     */
    public function endTrip(Request $request, int $id): JsonResponse
    {
        $trip = VehicleTrip::where('organization_id', auth()->user()->organization_id)
            ->where('status', 'in_progress')
            ->findOrFail($id);

        $validated = $request->validate([
            'lat'            => 'required|numeric',
            'lng'            => 'required|numeric',
            'end_location'   => 'nullable|string|max:255',
            'end_odometer'   => 'nullable|integer',
            'fuel_consumed'  => 'nullable|numeric',
            'polyline'       => 'nullable|string',
        ]);

        $this->fleet->endTrip($trip, (float) $validated['lat'], (float) $validated['lng'], $validated);

        return response()->json(['trip' => $trip->fresh()]);
    }

    // =========================================================================
    // API — MAINTENANCE
    // =========================================================================

    /**
     * GET /fleet/vehicles/{id}/maintenance
     */
    public function maintenanceSchedule(int $id): JsonResponse
    {
        $vehicle = $this->authorizeVehicle($id);
        $plan    = $this->fleet->predictMaintenance($vehicle);
        return response()->json(['maintenance' => $plan]);
    }

    /**
     * POST /fleet/maintenance-logs
     */
    public function storeMaintenanceLog(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id'       => 'required|integer',
            'maintenance_type' => 'required|in:vidange,pneus,freins,courroie,revision,ct,assurance,vignette',
            'done_date'        => 'required|date',
            'done_km'          => 'nullable|integer',
            'cost'             => 'nullable|numeric',
            'garage_name'      => 'nullable|string|max:255',
            'notes'            => 'nullable|string|max:1000',
        ]);

        $vehicle = $this->authorizeVehicle($validated['vehicle_id']);

        $log = VehicleMaintenanceLog::create([
            ...$validated,
            'organization_id' => $vehicle->organization_id,
            'created_by'      => auth()->id(),
        ]);

        // Met à jour le planning
        $schedule = VehicleMaintenanceSchedule::firstOrCreate(
            ['vehicle_id' => $vehicle->id, 'maintenance_type' => $validated['maintenance_type']],
            ['organization_id' => $vehicle->organization_id, 'is_active' => true]
        );

        $schedule->update([
            'last_done_km'   => $validated['done_km'] ?? $schedule->last_done_km,
            'last_done_date' => $validated['done_date'],
            'cost_last'      => $validated['cost'] ?? $schedule->cost_last,
            'next_due_km'    => $schedule->interval_km && $validated['done_km']
                ? $validated['done_km'] + $schedule->interval_km : $schedule->next_due_km,
            'next_due_date'  => $schedule->interval_days
                ? Carbon::parse($validated['done_date'])->addDays($schedule->interval_days)->toDateString()
                : $schedule->next_due_date,
        ]);

        return response()->json(['log' => $log], 201);
    }

    // =========================================================================
    // API — CARBURANT
    // =========================================================================

    /**
     * GET /fleet/vehicles/{id}/fuel
     */
    public function fuelHistory(int $id): JsonResponse
    {
        $vehicle = $this->authorizeVehicle($id);

        $start = request()->has('start')
            ? Carbon::parse(request('start'))
            : now()->subMonths(12);
        $end = request()->has('end')
            ? Carbon::parse(request('end'))
            : now();

        $data = $this->fleet->calculateFuelConsumption($vehicle, $start, $end);
        return response()->json($data);
    }

    /**
     * POST /fleet/fuel-logs
     */
    public function storeFuelLog(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id'     => 'required|integer',
            'fuel_date'      => 'required|date',
            'fuel_type'      => 'required|in:essence,diesel,hybride,electrique',
            'quantity_liters'=> 'required|numeric|min:0.1',
            'unit_price'     => 'required|numeric|min:0',
            'odometer_km'    => 'required|integer',
            'station_name'   => 'nullable|string|max:255',
            'full_tank'      => 'boolean',
        ]);

        $vehicle = $this->authorizeVehicle($validated['vehicle_id']);

        $log = VehicleFuelLog::create([
            ...$validated,
            'organization_id' => $vehicle->organization_id,
            'driver_user_id'  => auth()->id(),
            'created_by'      => auth()->id(),
        ]);

        // Mise à jour du kilométrage véhicule
        if ($validated['odometer_km'] > ($vehicle->odometer_km ?? 0)) {
            $vehicle->update(['odometer_km' => $validated['odometer_km']]);
        }

        return response()->json(['log' => $log], 201);
    }

    // =========================================================================
    // API — RAPPORT
    // =========================================================================

    /**
     * GET /fleet/report
     */
    public function report(Request $request): JsonResponse
    {
        $org    = auth()->user()->organization;
        $month  = $request->has('month')
            ? Carbon::parse($request->month)
            : now();

        $report = $this->fleet->generateFleetReport($org, $month);
        return response()->json($report);
    }

    // =========================================================================
    // API — GÉOFENCES
    // =========================================================================

    public function geofences(): JsonResponse
    {
        $org = auth()->user()->organization;
        return response()->json(
            VehicleGeofence::where('organization_id', $org->id)->get()
        );
    }

    public function storeGeofence(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'type'             => 'required|in:circle,polygon',
            'center_lat'       => 'nullable|numeric',
            'center_lng'       => 'nullable|numeric',
            'radius_meters'    => 'nullable|integer|min:50',
            'polygon_coords'   => 'nullable|array',
            'alert_on_enter'   => 'boolean',
            'alert_on_exit'    => 'boolean',
            'notify_user_ids'  => 'nullable|array',
        ]);

        $zone = VehicleGeofence::create([
            ...$validated,
            'organization_id' => auth()->user()->organization_id,
            'is_active'       => true,
        ]);

        return response()->json(['geofence' => $zone], 201);
    }

    public function updateGeofence(Request $request, int $id): JsonResponse
    {
        $zone = VehicleGeofence::where('organization_id', auth()->user()->organization_id)
            ->findOrFail($id);

        $zone->update($request->only([
            'name', 'type', 'center_lat', 'center_lng', 'radius_meters',
            'polygon_coords', 'alert_on_enter', 'alert_on_exit',
            'is_active', 'notify_user_ids',
        ]));

        return response()->json(['geofence' => $zone]);
    }

    public function destroyGeofence(int $id): JsonResponse
    {
        VehicleGeofence::where('organization_id', auth()->user()->organization_id)
            ->findOrFail($id)
            ->delete();

        return response()->json(['message' => 'Zone supprimée']);
    }

    // =========================================================================
    // API — AFFECTATIONS
    // =========================================================================

    public function assignments(): JsonResponse
    {
        $org = auth()->user()->organization;

        $assignments = VehicleAssignment::where('organization_id', $org->id)
            ->with(['vehicle:id,plate_number,brand,model', 'user:id,name,email', 'approver:id,name'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($assignments);
    }

    public function storeAssignment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id'      => 'required|integer',
            'user_id'         => 'required|integer|exists:users,id',
            'assignment_type' => 'required|in:permanent,mission,journalier',
            'start_date'      => 'required|date',
            'end_date'        => 'nullable|date|after:start_date',
            'purpose'         => 'nullable|string|max:500',
        ]);

        $vehicle    = $this->authorizeVehicle($validated['vehicle_id']);
        $assignment = VehicleAssignment::create([
            ...$validated,
            'organization_id' => $vehicle->organization_id,
            'approved_by'     => auth()->id(),
            'status'          => 'active',
        ]);

        return response()->json(['assignment' => $assignment->load(['vehicle', 'user'])], 201);
    }

    // =========================================================================
    // HELPERS PRIVÉS
    // =========================================================================

    private function authorizeVehicle(int $id): Vehicle
    {
        return Vehicle::where('organization_id', auth()->user()->organization_id)
            ->findOrFail($id);
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    // =========================================================================
    // VÉHICULES — CRUD
    // =========================================================================

    public function index(): Response
    {
        $orgId    = auth()->user()->organization_id;
        $vehicles = Vehicle::where('organization_id', $orgId)
            ->orderBy('brand')
            ->get();

        $stats = [
            'total'       => $vehicles->count(),
            'available'   => $vehicles->where('status', 'available')->count(),
            'in_use'      => $vehicles->where('status', 'in_use')->count(),
            'maintenance' => $vehicles->where('status', 'maintenance')->count(),
        ];

        return Inertia::render('Fleet/Index', [
            'vehicles' => $vehicles,
            'stats'    => $stats,
        ]);
    }

    public function storeVehicle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plate_number'         => ['required', 'string', 'max:20'],
            'brand'                => ['required', 'string', 'max:100'],
            'model'                => ['required', 'string', 'max:100'],
            'year'                 => ['nullable', 'integer', 'min:1990', 'max:' . (date('Y') + 1)],
            'type'                 => ['nullable', 'string', 'max:50'],
            'fuel_type'            => ['nullable', 'in:essence,diesel,hybride,electrique,gpl'],
            'color'                => ['nullable', 'string', 'max:50'],
            'mileage'              => ['nullable', 'integer', 'min:0'],
            'status'               => ['nullable', 'in:available,in_use,maintenance,retired'],
            'insurance_expires_at' => ['nullable', 'date'],
            'technical_visit_at'   => ['nullable', 'date'],
            'notes'                => ['nullable', 'string', 'max:2000'],
        ]);

        $orgId = auth()->user()->organization_id;

        $vehicle = Vehicle::create(array_merge($validated, [
            'organization_id' => $orgId,
            'status'          => $validated['status'] ?? 'available',
        ]));

        return response()->json([
            'message' => 'Véhicule ajouté au parc.',
            'vehicle' => $vehicle,
        ], 201);
    }

    public function updateVehicle(Request $request, int $id): JsonResponse
    {
        $vehicle = Vehicle::where('organization_id', auth()->user()->organization_id)->findOrFail($id);

        $validated = $request->validate([
            'plate_number'         => ['sometimes', 'string', 'max:20'],
            'brand'                => ['sometimes', 'string', 'max:100'],
            'model'                => ['sometimes', 'string', 'max:100'],
            'year'                 => ['nullable', 'integer'],
            'type'                 => ['nullable', 'string', 'max:50'],
            'fuel_type'            => ['nullable', 'in:essence,diesel,hybride,electrique,gpl'],
            'color'                => ['nullable', 'string', 'max:50'],
            'mileage'              => ['nullable', 'integer', 'min:0'],
            'status'               => ['sometimes', 'in:available,in_use,maintenance,retired'],
            'insurance_expires_at' => ['nullable', 'date'],
            'technical_visit_at'   => ['nullable', 'date'],
            'notes'                => ['nullable', 'string'],
        ]);

        $vehicle->update($validated);

        return response()->json(['message' => 'Véhicule mis à jour.', 'vehicle' => $vehicle]);
    }

    public function destroyVehicle(int $id): JsonResponse
    {
        $vehicle = Vehicle::where('organization_id', auth()->user()->organization_id)->findOrFail($id);

        if ($vehicle->status === 'in_use') {
            return response()->json(['message' => 'Impossible de supprimer un véhicule en cours d\'utilisation.'], 422);
        }

        $vehicle->delete();

        return response()->json(['message' => 'Véhicule retiré du parc.']);
    }

    // =========================================================================
    // ALIAS API — délèguent vers les vraies méthodes JSON (routes api.php)
    // =========================================================================

    /** GET /fleet/vehicles/{id}/trips → trips() */
    public function vehicleTrips(int $id): JsonResponse
    {
        return $this->trips($id);
    }

    /** GET /fleet/vehicles/{id}/position → getMapData() (positions temps réel du parc) */
    public function vehiclePosition(int $id): JsonResponse
    {
        return $this->getMapData();
    }

    /** GET /fleet/map → getMapData() */
    public function liveMap(): JsonResponse
    {
        return $this->getMapData();
    }

    /** POST /fleet/maintenance → storeMaintenanceLog() (vehicle_id dans le body) */
    public function storeMaintenance(Request $request): JsonResponse
    {
        return $this->storeMaintenanceLog($request);
    }

    /** POST /fleet/vehicles/{id}/assign → storeAssignment() (vehicle_id dans le body) */
    public function assignDriver(Request $request, int $id): JsonResponse
    {
        return $this->storeAssignment($request);
    }

    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
