<?php

namespace App\Http\Controllers;

use App\Models\Equipment;
use App\Models\Room;
use App\Models\RoomReservation;
use App\Models\Supply;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\ResourceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ResourceController — Contrôleur unifié MODULE 7 Ressources & Stocks
 *
 * Regroupe la gestion des salles, du matériel, des fournitures et des véhicules.
 * Chaque section est préfixée dans les noms de méthodes pour la lisibilité.
 */
class ResourceController extends Controller
{
    public function __construct(protected ResourceService $resourceService) {}

    // =========================================================================
    // SALLES
    // =========================================================================

    /**
     * GET /resources/salles
     * Inertia : grille des salles avec statut temps réel.
     */
    public function roomsIndex(Request $request): Response
    {
        $orgId = $request->user()->organization_id;

        $rooms = Room::forOrganization($orgId)
            ->active()
            ->withCount(['reservations as active_reservations' => function ($q) {
                $q->whereIn('status', ['pending', 'approved'])
                  ->where('start_at', '<=', now())
                  ->where('end_at', '>=', now());
            }])
            ->get()
            ->map(function (Room $room) {
                return array_merge($room->toArray(), [
                    'realtime_status' => $room->active_reservations > 0 ? 'occupied' : 'free',
                ]);
            });

        return Inertia::render('Ressources/Salles/Index', [
            'rooms' => $rooms,
        ]);
    }

    /**
     * POST /resources/salles
     * Crée une nouvelle salle.
     */
    public function roomsStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'      => 'required|string|max:100',
            'location'  => 'nullable|string|max:100',
            'capacity'  => 'required|integer|min:1',
            'equipment' => 'nullable|array',
            'photos'    => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $room = Room::create(array_merge($validated, [
            'organization_id' => $request->user()->organization_id,
        ]));

        return response()->json($room, 201);
    }

    /**
     * GET /resources/salles/{room}
     */
    public function roomsShow(Request $request, Room $room): JsonResponse
    {
        $this->authorizeOrg($request, $room->organization_id);

        return response()->json($room->load('reservations.user'));
    }

    /**
     * PUT /resources/salles/{room}
     */
    public function roomsUpdate(Request $request, Room $room): JsonResponse
    {
        $this->authorizeOrg($request, $room->organization_id);

        $validated = $request->validate([
            'name'      => 'sometimes|string|max:100',
            'location'  => 'nullable|string|max:100',
            'capacity'  => 'sometimes|integer|min:1',
            'equipment' => 'nullable|array',
            'photos'    => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $room->update($validated);

        return response()->json($room);
    }

    /**
     * DELETE /resources/salles/{room}
     * Désactive la salle (soft delete logique).
     */
    public function roomsDestroy(Request $request, Room $room): JsonResponse
    {
        $this->authorizeOrg($request, $room->organization_id);
        $room->update(['is_active' => false]);

        return response()->json(['message' => 'Salle désactivée.']);
    }

    /**
     * GET /resources/salles/{room}/availability?start_at=...&end_at=...
     * Vérifie la disponibilité d'une salle pour un créneau.
     */
    public function checkAvailability(Request $request, Room $room): JsonResponse
    {
        $request->validate([
            'start_at'   => 'required|date',
            'end_at'     => 'required|date|after:start_at',
            'exclude_id' => 'nullable|integer',
        ]);

        $start   = Carbon::parse($request->start_at);
        $end     = Carbon::parse($request->end_at);
        $exclude = $request->exclude_id;

        $available  = $room->isAvailableFor($start, $end, $exclude);
        $conflicts  = $this->resourceService->checkRoomConflicts($room->id, $start, $end);

        return response()->json([
            'available' => $available,
            'conflicts' => $conflicts,
        ]);
    }

    /**
     * GET /resources/salles/{room}/schedule?week_start=YYYY-MM-DD
     * Planning hebdomadaire d'une salle.
     */
    public function getSchedule(Request $request, Room $room): JsonResponse
    {
        $this->authorizeOrg($request, $room->organization_id);

        $weekStart = $request->week_start
            ? Carbon::parse($request->week_start)->startOfDay()
            : now()->startOfWeek();

        $schedule = $this->resourceService->getRoomSchedule($room, $weekStart);

        return response()->json($schedule);
    }

    // =========================================================================
    // MATÉRIEL
    // =========================================================================

    /**
     * GET /resources/materiel
     */
    public function equipmentIndex(Request $request): Response
    {
        $orgId = $request->user()->organization_id;

        $equipment = Equipment::forOrganization($orgId)
            ->with('assignedUser:id,name,avatar')
            ->latest()
            ->paginate(25);

        $warrantyAlerts = Equipment::forOrganization($orgId)
            ->warrantyExpiringSoon()
            ->count();

        return Inertia::render('Ressources/Materiel/Index', [
            'equipment'      => $equipment,
            'warrantyAlerts' => $warrantyAlerts,
            'filters'        => $request->only(['category', 'status', 'assigned']),
        ]);
    }

    /**
     * POST /resources/materiel
     */
    public function equipmentStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:150',
            'serial_number'  => 'required|string|max:100|unique:equipment,serial_number',
            'category'       => 'required|in:informatique,mobilier,audiovisuel,autre',
            'brand'          => 'nullable|string|max:100',
            'model'          => 'nullable|string|max:100',
            'purchase_date'  => 'nullable|date',
            'warranty_end'   => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'notes'          => 'nullable|string|max:500',
        ]);

        $item = Equipment::create(array_merge($validated, [
            'organization_id' => $request->user()->organization_id,
            'status'          => 'available',
        ]));

        return response()->json($item, 201);
    }

    /**
     * GET /resources/materiel/{equipment}
     */
    public function equipmentShow(Request $request, Equipment $equipment): JsonResponse
    {
        $this->authorizeOrg($request, $equipment->organization_id);

        return response()->json($equipment->load(['assignedUser:id,name,avatar', 'maintenanceLogs.requestedBy:id,name']));
    }

    /**
     * PUT /resources/materiel/{equipment}
     */
    public function equipmentUpdate(Request $request, Equipment $equipment): JsonResponse
    {
        $this->authorizeOrg($request, $equipment->organization_id);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:150',
            'category'       => 'sometimes|in:informatique,mobilier,audiovisuel,autre',
            'brand'          => 'nullable|string|max:100',
            'model'          => 'nullable|string|max:100',
            'purchase_date'  => 'nullable|date',
            'warranty_end'   => 'nullable|date',
            'purchase_price' => 'nullable|numeric|min:0',
            'notes'          => 'nullable|string|max:500',
            'status'         => 'sometimes|in:available,assigned,maintenance,retired',
        ]);

        $equipment->update($validated);

        return response()->json($equipment);
    }

    /**
     * POST /resources/materiel/{equipment}/assign
     * Assigner un équipement à un utilisateur.
     */
    public function assignEquipment(Request $request, Equipment $equipment): JsonResponse
    {
        $this->authorizeOrg($request, $equipment->organization_id);

        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $user = User::findOrFail($request->user_id);

        $this->resourceService->assignEquipment($equipment, $user);

        return response()->json([
            'message'  => "Équipement assigné à {$user->name}.",
            'equipment' => $equipment->fresh('assignedUser'),
        ]);
    }

    /**
     * POST /resources/materiel/{equipment}/maintenance
     * Demande de maintenance.
     */
    public function requestMaintenance(Request $request, Equipment $equipment): JsonResponse
    {
        $this->authorizeOrg($request, $equipment->organization_id);

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $log = $equipment->maintenanceLogs()->create([
            'requested_by' => $request->user()->id,
            'reason'       => $request->reason,
            'status'       => 'pending',
        ]);

        $equipment->update(['status' => 'maintenance']);

        return response()->json(['message' => 'Demande de maintenance créée.', 'log' => $log], 201);
    }

    // =========================================================================
    // FOURNITURES
    // =========================================================================

    /**
     * GET /resources/fournitures
     */
    public function suppliesIndex(Request $request): Response
    {
        $orgId = $request->user()->organization_id;

        $supplies    = Supply::forOrganization($orgId)->latest()->paginate(30);
        $lowStock    = Supply::forOrganization($orgId)->lowStock()->get(['id', 'name', 'quantity', 'min_quantity']);

        return Inertia::render('Ressources/Fournitures/Index', [
            'supplies' => $supplies,
            'lowStock' => $lowStock,
        ]);
    }

    /**
     * POST /resources/fournitures
     */
    public function suppliesStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'         => 'required|string|max:150',
            'unit'         => 'required|in:pièce,rame,boîte,carton,litre,kg,autre',
            'quantity'     => 'required|integer|min:0',
            'min_quantity' => 'required|integer|min:0',
            'unit_price'   => 'nullable|numeric|min:0',
            'supplier'     => 'nullable|string|max:150',
            'reference'    => 'nullable|string|max:100',
            'location'     => 'nullable|string|max:100',
        ]);

        $supply = Supply::create(array_merge($validated, [
            'organization_id' => $request->user()->organization_id,
        ]));

        return response()->json($supply, 201);
    }

    /**
     * GET /resources/fournitures/{supply}
     */
    public function suppliesShow(Request $request, Supply $supply): JsonResponse
    {
        $this->authorizeOrg($request, $supply->organization_id);

        return response()->json($supply->load('movements.user:id,name'));
    }

    /**
     * PUT /resources/fournitures/{supply}
     */
    public function suppliesUpdate(Request $request, Supply $supply): JsonResponse
    {
        $this->authorizeOrg($request, $supply->organization_id);

        $validated = $request->validate([
            'name'         => 'sometimes|string|max:150',
            'unit'         => 'sometimes|in:pièce,rame,boîte,carton,litre,kg,autre',
            'min_quantity' => 'sometimes|integer|min:0',
            'unit_price'   => 'nullable|numeric|min:0',
            'supplier'     => 'nullable|string|max:150',
            'reference'    => 'nullable|string|max:100',
            'location'     => 'nullable|string|max:100',
        ]);

        $supply->update($validated);

        return response()->json($supply);
    }

    /**
     * POST /resources/fournitures/{supply}/movement
     * Ajouter un mouvement de stock (entrée ou sortie).
     */
    public function addMovement(Request $request, Supply $supply): JsonResponse
    {
        $this->authorizeOrg($request, $supply->organization_id);

        $request->validate([
            'type'     => 'required|in:in,out',
            'quantity' => 'required|integer|min:1',
            'reason'   => 'required|string|max:300',
        ]);

        $this->resourceService->processSupplyMovement(
            $supply,
            $request->type,
            $request->quantity,
            $request->reason,
            $request->user()
        );

        return response()->json([
            'message' => 'Mouvement enregistré.',
            'supply'  => $supply->fresh(),
        ]);
    }

    /**
     * GET /resources/fournitures/low-stock
     */
    public function getLowStockAlert(Request $request): JsonResponse
    {
        $org      = $request->user()->organization;
        $supplies = $this->resourceService->getLowStockSupplies($org);

        return response()->json($supplies);
    }

    // =========================================================================
    // VÉHICULES
    // =========================================================================

    /**
     * GET /resources/vehicules
     */
    public function vehiclesIndex(Request $request): Response
    {
        $orgId = $request->user()->organization_id;

        $vehicles = Vehicle::forOrganization($orgId)
            ->withCount(['requests as pending_requests' => fn ($q) => $q->where('status', 'pending')])
            ->latest()
            ->get()
            ->map(fn (Vehicle $v) => array_merge($v->toArray(), ['alerts' => $v->alertsNeeded()]));

        $alerts = $this->resourceService->getVehicleAlerts($request->user()->organization);

        return Inertia::render('Ressources/Vehicules/Index', [
            'vehicles' => $vehicles,
            'alerts'   => $alerts,
        ]);
    }

    /**
     * POST /resources/vehicules
     */
    public function vehiclesStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plate_number'   => 'required|string|max:20',
            'brand'          => 'required|string|max:100',
            'model'          => 'required|string|max:100',
            'year'           => 'required|integer|min:1990|max:' . (date('Y') + 1),
            'fuel_type'      => 'nullable|in:essence,diesel,electrique,hybride',
            'insurance_end'  => 'nullable|date',
            'control_end'    => 'nullable|date',
            'next_service'   => 'nullable|date',
            'mileage'        => 'nullable|integer|min:0',
            'photo'          => 'nullable|string',
        ]);

        $vehicle = Vehicle::create(array_merge($validated, [
            'organization_id' => $request->user()->organization_id,
            'status'          => 'available',
        ]));

        return response()->json($vehicle, 201);
    }

    /**
     * GET /resources/vehicules/{vehicle}
     */
    public function vehiclesShow(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOrg($request, $vehicle->organization_id);

        return response()->json($vehicle->load([
            'logs' => fn ($q) => $q->latest()->limit(20)->with('user:id,name'),
            'requests' => fn ($q) => $q->latest()->limit(10)->with('requestedBy:id,name'),
        ]));
    }

    /**
     * PUT /resources/vehicules/{vehicle}
     */
    public function vehiclesUpdate(Request $request, Vehicle $vehicle): JsonResponse
    {
        $this->authorizeOrg($request, $vehicle->organization_id);

        $validated = $request->validate([
            'plate_number'   => 'sometimes|string|max:20',
            'brand'          => 'sometimes|string|max:100',
            'model'          => 'sometimes|string|max:100',
            'year'           => 'sometimes|integer|min:1990',
            'status'         => 'sometimes|in:available,in_use,maintenance,retired',
            'current_driver' => 'nullable|string|max:150',
            'insurance_end'  => 'nullable|date',
            'control_end'    => 'nullable|date',
            'next_service'   => 'nullable|date',
            'mileage'        => 'nullable|integer|min:0',
            'photo'          => 'nullable|string',
        ]);

        $vehicle->update($validated);

        return response()->json($vehicle);
    }

    /**
     * GET /resources/vehicules/alerts
     */
    public function getVehicleAlerts(Request $request): JsonResponse
    {
        $alerts = $this->resourceService->getVehicleAlerts($request->user()->organization);

        return response()->json($alerts);
    }

    /**
     * POST /resources/vehicules/request
     * Demande de mise à disposition (redirige vers VehicleRequestController).
     */
    public function requestVehicle(Request $request): JsonResponse
    {
        $request->validate([
            'start_at'    => 'required|date|after:now',
            'end_at'      => 'required|date|after:start_at',
            'destination' => 'required|string|max:200',
            'purpose'     => 'required|string|max:300',
        ]);

        $vehicleRequest = \App\Models\VehicleRequest::create([
            'organization_id' => $request->user()->organization_id,
            'requested_by'    => $request->user()->id,
            'status'          => 'pending',
            'start_at'        => $request->start_at,
            'end_at'          => $request->end_at,
            'destination'     => $request->destination,
            'purpose'         => $request->purpose,
        ]);

        return response()->json(['message' => 'Demande envoyée.', 'request' => $vehicleRequest], 201);
    }

    // =========================================================================
    // Dashboard synthèse
    // =========================================================================

    /**
     * GET /resources
     * Dashboard principal des ressources.
     */
    public function dashboard(Request $request): Response
    {
        $org   = $request->user()->organization;
        $orgId = $org->id;

        // KPIs salles : taux occupation aujourd'hui
        $totalRooms    = Room::forOrganization($orgId)->active()->count();
        $occupiedNow   = Room::forOrganization($orgId)->active()
            ->whereHas('reservations', fn ($q) => $q
                ->whereIn('status', ['approved'])
                ->where('start_at', '<=', now())
                ->where('end_at', '>=', now())
            )->count();

        // KPIs matériel
        $inMaintenance = Equipment::forOrganization($orgId)->underMaintenance()->count();
        $warrantyAlerts = Equipment::forOrganization($orgId)->warrantyExpiringSoon()->count();

        // KPIs fournitures
        $lowStockCount = Supply::forOrganization($orgId)->lowStock()->count();

        // KPIs véhicules
        $availableVehicles = Vehicle::forOrganization($orgId)->available()->count();

        // Planning du jour : salles réservées
        $todayReservations = RoomReservation::with('room:id,name', 'user:id,name')
            ->whereHas('room', fn ($q) => $q->where('organization_id', $orgId))
            ->whereDate('start_at', today())
            ->whereIn('status', ['pending', 'approved'])
            ->orderBy('start_at')
            ->get();

        // Véhicules sortis aujourd'hui
        $vehiclesOut = \App\Models\VehicleLog::with('vehicle:id,plate_number,brand,model', 'user:id,name')
            ->whereHas('vehicle', fn ($q) => $q->where('organization_id', $orgId))
            ->whereDate('departed_at', today())
            ->whereNull('returned_at')
            ->get();

        // Alertes véhicules
        $vehicleAlerts = $this->resourceService->getVehicleAlerts($org);

        return Inertia::render('Ressources/Dashboard', [
            'kpis' => [
                'rooms'     => ['total' => $totalRooms, 'occupied' => $occupiedNow],
                'equipment' => ['in_maintenance' => $inMaintenance, 'warranty_alerts' => $warrantyAlerts],
                'supplies'  => ['low_stock' => $lowStockCount],
                'vehicles'  => ['available' => $availableVehicles],
            ],
            'todayReservations' => $todayReservations,
            'vehiclesOut'       => $vehiclesOut,
            'vehicleAlerts'     => $vehicleAlerts,
            'lowStockAlerts'    => Supply::forOrganization($orgId)->lowStock()->get(['id', 'name', 'quantity', 'min_quantity']),
        ]);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    protected function authorizeOrg(Request $request, int $organizationId): void
    {
        if (! $request->user()->isSuperAdmin() && $request->user()->organization_id !== $organizationId) {
            abort(403, 'Accès non autorisé.');
        }
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
