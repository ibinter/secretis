<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Models\VehicleLog;
use App\Models\VehicleRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * VehicleRequestController — Gestion des demandes de véhicule
 *
 * Workflow : pending → approved (véhicule réservé) | rejected
 *            approved → completed (retour véhicule + log carnet de bord)
 */
class VehicleRequestController extends Controller
{
    /**
     * GET /resources/vehicules/requests
     * Liste des demandes (filtrage par statut, véhicule, demandeur).
     */
    public function index(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $query = VehicleRequest::with([
            'requestedBy:id,name,avatar',
            'approvedBy:id,name',
            'vehicle:id,plate_number,brand,model',
        ])->where('organization_id', $orgId);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        // Non-admins voient uniquement leurs propres demandes
        if (! $request->user()->isAdmin()) {
            $query->where('requested_by', $request->user()->id);
        }

        $requests = $query->latest()->paginate(20);

        return response()->json($requests);
    }

    /**
     * POST /resources/vehicules/requests
     * Nouvelle demande de véhicule.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_at'    => 'required|date|after:now',
            'end_at'      => 'required|date|after:start_at',
            'destination' => 'required|string|max:200',
            'purpose'     => 'required|string|max:300',
            'vehicle_id'  => 'nullable|integer|exists:vehicles,id',
        ]);

        // Si véhicule spécifié, vérifier disponibilité
        if (! empty($validated['vehicle_id'])) {
            $vehicle   = Vehicle::findOrFail($validated['vehicle_id']);
            $start     = Carbon::parse($validated['start_at']);
            $end       = Carbon::parse($validated['end_at']);

            $conflict = VehicleRequest::where('vehicle_id', $vehicle->id)
                ->whereIn('status', ['approved'])
                ->where('start_at', '<', $end)
                ->where('end_at', '>', $start)
                ->exists();

            if ($conflict) {
                return response()->json([
                    'message' => 'Ce véhicule est déjà réservé sur ce créneau.',
                ], 422);
            }
        }

        $vehicleRequest = VehicleRequest::create([
            'organization_id' => $request->user()->organization_id,
            'requested_by'    => $request->user()->id,
            'status'          => 'pending',
            ...$validated,
        ]);

        return response()->json($vehicleRequest->load('requestedBy:id,name'), 201);
    }

    /**
     * POST /resources/vehicules/requests/{vehicleRequest}/approve
     * Approuver une demande et assigner un véhicule.
     */
    public function approve(Request $request, VehicleRequest $vehicleRequest): JsonResponse
    {
        $this->authorizeAdmin($request);

        if ($vehicleRequest->status !== 'pending') {
            return response()->json(['message' => 'La demande n\'est pas en attente.'], 422);
        }

        $request->validate([
            'vehicle_id' => 'required|integer|exists:vehicles,id',
        ]);

        $vehicle = Vehicle::findOrFail($request->vehicle_id);

        // Vérifier que le véhicule est disponible sur ce créneau
        $conflict = VehicleRequest::where('vehicle_id', $vehicle->id)
            ->where('id', '!=', $vehicleRequest->id)
            ->whereIn('status', ['approved'])
            ->where('start_at', '<', $vehicleRequest->end_at)
            ->where('end_at', '>', $vehicleRequest->start_at)
            ->exists();

        if ($conflict) {
            return response()->json([
                'message' => 'Ce véhicule est déjà réservé sur ce créneau.',
            ], 422);
        }

        $vehicleRequest->update([
            'status'      => 'approved',
            'vehicle_id'  => $vehicle->id,
            'approved_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Demande approuvée.',
            'request' => $vehicleRequest->load(['vehicle', 'requestedBy:id,name']),
        ]);
    }

    /**
     * POST /resources/vehicules/requests/{vehicleRequest}/reject
     * Refuser une demande avec motif.
     */
    public function reject(Request $request, VehicleRequest $vehicleRequest): JsonResponse
    {
        $this->authorizeAdmin($request);

        if ($vehicleRequest->status !== 'pending') {
            return response()->json(['message' => 'La demande n\'est pas en attente.'], 422);
        }

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $vehicleRequest->update([
            'status'           => 'rejected',
            'approved_by'      => $request->user()->id,
            'rejection_reason' => $request->reason,
        ]);

        return response()->json(['message' => 'Demande refusée.', 'request' => $vehicleRequest]);
    }

    /**
     * POST /resources/vehicules/requests/{vehicleRequest}/log
     * Ajouter une entrée carnet de bord.
     */
    public function addLog(Request $request, VehicleRequest $vehicleRequest): JsonResponse
    {
        if ($vehicleRequest->status !== 'approved') {
            return response()->json(['message' => 'La demande doit être approuvée.'], 422);
        }

        $validated = $request->validate([
            'mileage_start' => 'required|integer|min:0',
            'mileage_end'   => 'required|integer|gte:mileage_start',
            'fuel_added'    => 'nullable|numeric|min:0',
            'destination'   => 'nullable|string|max:200',
            'purpose'       => 'nullable|string|max:300',
            'departed_at'   => 'required|date',
            'returned_at'   => 'nullable|date|after:departed_at',
        ]);

        $log = VehicleLog::create([
            'vehicle_id'         => $vehicleRequest->vehicle_id,
            'user_id'            => $request->user()->id,
            'vehicle_request_id' => $vehicleRequest->id,
            ...$validated,
        ]);

        // Mettre à jour le kilométrage du véhicule
        if ($vehicleRequest->vehicle_id) {
            Vehicle::where('id', $vehicleRequest->vehicle_id)
                ->update(['mileage' => $validated['mileage_end']]);
        }

        // Si retour enregistré → passer la demande à completed
        if (! empty($validated['returned_at'])) {
            $vehicleRequest->update(['status' => 'completed']);
        }

        return response()->json(['message' => 'Entrée carnet de bord ajoutée.', 'log' => $log], 201);
    }

    // -------------------------------------------------------------------------

    protected function authorizeAdmin(Request $request): void
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Seuls les administrateurs peuvent approuver/refuser des demandes.');
        }
    }
}
