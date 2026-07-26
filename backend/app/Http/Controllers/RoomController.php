<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\RoomReservation;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RoomController — Gestion des salles et de leurs réservations
 *
 * Routes :
 *  GET    /rooms                              → index()
 *  POST   /rooms                              → store()
 *  GET    /rooms/{room}                       → show()
 *  PUT    /rooms/{room}                       → update()
 *  DELETE /rooms/{room}                       → destroy()
 *  GET    /rooms/{room}/availability          → checkAvailability()
 *  GET    /rooms/{room}/schedule              → getSchedule()
 */
class RoomController extends Controller
{
    /**
     * Liste les salles de l'organisation avec filtres optionnels.
     *
     * Paramètres GET :
     *  - capacity_min : capacité minimum requise
     *  - active_only  : boolean (défaut true)
     *  - start_at + end_at : retourner les salles disponibles sur ce créneau
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'capacity_min' => 'nullable|integer|min:1',
            'active_only'  => 'nullable|boolean',
            'start_at'     => 'nullable|date|required_with:end_at',
            'end_at'       => 'nullable|date|after:start_at|required_with:start_at',
        ]);

        $organizationId = $request->user()->organization_id;

        $rooms = Room::forOrganization($organizationId)
            ->when($request->boolean('active_only', true), fn($q) => $q->active())
            ->when(
                $request->filled('capacity_min'),
                fn($q) => $q->where('capacity', '>=', $request->integer('capacity_min'))
            )
            ->orderBy('name')
            ->get();

        // Enrichir avec la disponibilité si un créneau est fourni
        if ($request->filled('start_at') && $request->filled('end_at')) {
            $start = Carbon::parse($request->start_at);
            $end   = Carbon::parse($request->end_at);

            $rooms = $rooms->map(function (Room $room) use ($start, $end) {
                $data              = $room->toArray();
                $data['available'] = $room->isAvailableFor($start, $end);
                return $data;
            });
        }

        return response()->json(['data' => $rooms]);
    }

    /**
     * Crée une nouvelle salle.
     * Réservé aux administrateurs de l'organisation.
     */
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403, 'Seul un administrateur peut créer des salles.');

        $validated = $request->validate([
            'name'      => 'required|string|max:255',
            'location'  => 'nullable|string|max:500',
            'capacity'  => 'required|integer|min:1|max:10000',
            'equipment' => 'nullable|array',
            'equipment.*.name'     => 'required_with:equipment|string|max:100',
            'equipment.*.quantity' => 'required_with:equipment|integer|min:1',
            'photos'    => 'nullable|array',
            'photos.*'  => 'url',
            'is_active' => 'boolean',
        ]);

        $room = Room::create([
            ...$validated,
            'organization_id' => $request->user()->organization_id,
            'equipment'       => $validated['equipment'] ?? [],
            'photos'          => $validated['photos'] ?? [],
            'is_active'       => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Salle créée avec succès.',
            'room'    => $room,
        ], 201);
    }

    /**
     * Détail d'une salle avec ses prochaines réservations.
     */
    public function show(Request $request, Room $room): JsonResponse
    {
        abort_if($room->organization_id !== $request->user()->organization_id, 403);

        $room->load([
            'reservations' => fn($q) => $q
                ->where('start_at', '>=', now())
                ->where('status', '!=', 'rejected')
                ->with('user:id,name,avatar', 'event:id,title')
                ->orderBy('start_at')
                ->limit(10),
        ]);

        return response()->json(['room' => $room]);
    }

    /**
     * Met à jour une salle.
     */
    public function update(Request $request, Room $room): JsonResponse
    {
        abort_if($room->organization_id !== $request->user()->organization_id, 403);
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'name'      => 'sometimes|required|string|max:255',
            'location'  => 'nullable|string|max:500',
            'capacity'  => 'sometimes|required|integer|min:1',
            'equipment' => 'nullable|array',
            'equipment.*.name'     => 'required_with:equipment|string|max:100',
            'equipment.*.quantity' => 'required_with:equipment|integer|min:1',
            'photos'    => 'nullable|array',
            'photos.*'  => 'url',
            'is_active' => 'boolean',
        ]);

        $room->update($validated);

        return response()->json([
            'message' => 'Salle mise à jour avec succès.',
            'room'    => $room->fresh(),
        ]);
    }

    /**
     * Supprime (désactive) une salle.
     * Soft-delete via is_active pour préserver l'historique des réservations.
     */
    public function destroy(Request $request, Room $room): JsonResponse
    {
        abort_if($room->organization_id !== $request->user()->organization_id, 403);
        abort_unless($request->user()->isAdmin(), 403);

        // Vérifier qu'il n'y a pas de réservations futures confirmées
        $futureReservations = $room->reservations()
            ->where('start_at', '>', now())
            ->where('status', 'approved')
            ->count();

        if ($futureReservations > 0) {
            return response()->json([
                'message' => "Impossible de supprimer la salle : {$futureReservations} réservation(s) future(s) confirmée(s).",
            ], 422);
        }

        // Désactiver plutôt que supprimer physiquement
        $room->update(['is_active' => false]);

        return response()->json(['message' => 'Salle désactivée avec succès.']);
    }

    // -------------------------------------------------------------------------
    // Méthodes spéciales
    // -------------------------------------------------------------------------

    /**
     * Vérifie la disponibilité d'une salle pour un créneau.
     *
     * Paramètres GET :
     *  - start_at           : datetime ISO 8601
     *  - end_at             : datetime ISO 8601
     *  - exclude_reservation_id : UUID (pour l'édition)
     *
     * Retourne :
     *  - available  : boolean
     *  - conflicts  : liste des réservations en conflit (si pas disponible)
     */
    public function checkAvailability(Request $request, Room $room): JsonResponse
    {
        abort_if($room->organization_id !== $request->user()->organization_id, 403);

        $request->validate([
            'start_at'               => 'required|date',
            'end_at'                 => 'required|date|after:start_at',
            'exclude_reservation_id' => 'nullable|uuid',
        ]);

        $start   = Carbon::parse($request->start_at);
        $end     = Carbon::parse($request->end_at);
        $exclude = $request->input('exclude_reservation_id');

        $available = $room->isAvailableFor($start, $end, $exclude);

        $conflicts = [];
        if (! $available) {
            // Retourner les réservations en conflit pour informer l'utilisateur
            $conflictQuery = $room->reservations()
                ->where('status', '!=', 'rejected')
                ->where('start_at', '<', $end)
                ->where('end_at', '>', $start)
                ->with('user:id,name', 'event:id,title');

            if ($exclude) {
                $conflictQuery->where('id', '!=', $exclude);
            }

            $conflicts = $conflictQuery->get()->map(fn($r) => [
                'id'        => $r->id,
                'start_at'  => $r->start_at->toIso8601String(),
                'end_at'    => $r->end_at->toIso8601String(),
                'user'      => $r->user?->name,
                'event'     => $r->event?->title,
            ]);
        }

        return response()->json([
            'room_id'   => $room->id,
            'room_name' => $room->name,
            'available' => $available,
            'period'    => [
                'start' => $start->toIso8601String(),
                'end'   => $end->toIso8601String(),
            ],
            'conflicts' => $conflicts,
        ]);
    }

    /**
     * Retourne le planning hebdomadaire d'une salle.
     *
     * Paramètre GET :
     *  - week_start : date du lundi de la semaine (défaut : lundi courant)
     *
     * Retourne les réservations de la semaine groupées par jour.
     */
    public function getSchedule(Request $request, Room $room): JsonResponse
    {
        abort_if($room->organization_id !== $request->user()->organization_id, 403);

        $request->validate([
            'week_start' => 'nullable|date',
        ]);

        $weekStart = $request->filled('week_start')
            ? Carbon::parse($request->week_start)->startOfDay()
            : Carbon::now()->startOfWeek();

        $weekEnd = $weekStart->copy()->endOfWeek()->endOfDay();

        $reservations = $room->reservations()
            ->where('start_at', '>=', $weekStart)
            ->where('end_at', '<=', $weekEnd)
            ->where('status', '!=', 'rejected')
            ->with('user:id,name,avatar', 'event:id,title,color,type')
            ->orderBy('start_at')
            ->get();

        // Grouper par jour de la semaine
        $schedule = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $weekStart->copy()->addDays($i);
            $schedule[$day->toDateString()] = $reservations
                ->filter(fn($r) => $r->start_at->isSameDay($day))
                ->values()
                ->map(fn($r) => [
                    'id'        => $r->id,
                    'start_at'  => $r->start_at->toIso8601String(),
                    'end_at'    => $r->end_at->toIso8601String(),
                    'title'     => $r->event?->title ?? 'Réservation',
                    'color'     => $r->event?->color ?? '#3B82F6',
                    'user'      => ['id' => $r->user?->id, 'name' => $r->user?->name],
                    'status'    => $r->status,
                ]);
        }

        return response()->json([
            'room'       => $room->only(['id', 'name', 'location', 'capacity']),
            'week_start' => $weekStart->toDateString(),
            'week_end'   => $weekEnd->toDateString(),
            'schedule'   => $schedule,
        ]);
    }
}
