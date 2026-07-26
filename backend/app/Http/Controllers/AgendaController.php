<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEventRequest;
use App\Models\Calendar;
use App\Models\Event;
use App\Services\AgendaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * AgendaController — Gestion des événements SECRETIS ERP
 *
 * Routes :
 *  GET    /agenda                 → index()
 *  POST   /agenda/events          → store()
 *  GET    /agenda/events/{event}  → show()
 *  PUT    /agenda/events/{event}  → update()
 *  DELETE /agenda/events/{event}  → destroy()
 *  GET    /agenda/calendar        → getCalendarEvents()
 *  POST   /agenda/availability    → checkAvailability()
 */
class AgendaController extends Controller
{
    public function __construct(private AgendaService $agendaService)
    {
    }

    // -------------------------------------------------------------------------
    // Page principale (Inertia)
    // -------------------------------------------------------------------------

    /**
     * Affiche la page principale de l'agenda avec les données initiales.
     * La liste complète des événements est chargée via l'API JS (getCalendarEvents).
     */
    public function index(Request $request): InertiaResponse
    {
        try {
        $user = $request->user();

        // Calendriers de l'utilisateur pour la sidebar
        $calendars = Calendar::forOrganization($user->organization_id)
            ->accessibleBy($user->id)
            ->get(['id', 'name', 'color', 'type', 'is_default']);

        // Prochains événements (pour la sidebar "Aujourd'hui")
        $todayEvents = Event::forOrganization($user->organization_id)
            ->inDateRange(
                Carbon::today($user->organization?->timezone ?? 'UTC'),
                Carbon::today($user->organization?->timezone ?? 'UTC')->endOfDay()
            )
            ->with('participants:id,name,avatar')
            ->orderBy('start_at')
            ->limit(10)
            ->get()
            ->map(fn(Event $e) => $e->toCalendarFormat());

        // Utilisateurs de l'organisation pour le sélecteur de participants
        $orgUsers = $user->organization
            ? $user->organization->users()
                ->active()
                ->select(['id', 'name', 'email', 'avatar', 'department_id'])
                ->orderBy('name')
                ->get()
            : collect();

        return Inertia::render('Agenda/Index', [
            'calendars'   => $calendars,
            'todayEvents' => $todayEvents,
            'orgUsers'    => $orgUsers,
            'timezone'    => $user->organization?->timezone ?? 'UTC',
        ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('AgendaController::index: ' . $e->getMessage());
            return Inertia::render('Agenda/Index', [
                'calendars'   => [],
                'todayEvents' => [],
                'orgUsers'    => [],
                'timezone'    => 'UTC',
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // API JSON
    // -------------------------------------------------------------------------

    /**
     * Liste les événements avec filtres et pagination (format liste/tableau).
     *
     * Paramètres GET :
     *  - start       : date début (Y-m-d)
     *  - end         : date fin (Y-m-d)
     *  - calendar_id : UUID du calendrier
     *  - type        : event|meeting|task|reminder
     *  - per_page    : défaut 25
     */
    public function list(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'start'       => 'nullable|date',
            'end'         => 'nullable|date|after_or_equal:start',
            'calendar_id' => 'nullable|uuid',
            'type'        => 'nullable|in:event,meeting,task,reminder',
            'per_page'    => 'nullable|integer|min:1|max:100',
        ]);

        $query = Event::forOrganization($user->organization_id)
            ->with(['participants:id,name,avatar', 'creator:id,name', 'roomReservation.room:id,name'])
            ->orderBy('start_at');

        if ($request->filled('start') && $request->filled('end')) {
            $query->inDateRange(
                Carbon::parse($request->start),
                Carbon::parse($request->end)
            );
        }

        if ($request->filled('calendar_id')) {
            $query->byCalendar($request->calendar_id);
        }

        if ($request->filled('type')) {
            $query->ofType($request->type);
        }

        $events = $query->paginate($request->input('per_page', 25));

        return response()->json($events);
    }

    /**
     * Crée un nouvel événement.
     */
    public function store(StoreEventRequest $request): JsonResponse
    {
        try {
            $event = $this->agendaService->createEvent(
                $request->validated(),
                $request->user()
            );

            return response()->json([
                'message' => 'Événement créé avec succès.',
                'event'   => $event->toCalendarFormat(),
            ], 201);
        } catch (\RuntimeException $e) {
            // Conflit de salle ou autre erreur métier
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Retourne le détail d'un événement.
     */
    public function show(Request $request, Event $event): JsonResponse
    {
        // Sécurité : vérifier que l'événement appartient à l'organisation de l'utilisateur
        abort_if($event->organization_id !== $request->user()->organization_id, 403);

        $event->load([
            'participants:id,name,email,avatar',
            'creator:id,name,email,avatar',
            'calendar:id,name,color',
            'roomReservation.room:id,name,location,capacity,equipment',
        ]);

        return response()->json([
            'event' => $event->append([]),
            'calendar_format' => $event->toCalendarFormat(),
        ]);
    }

    /**
     * Met à jour un événement existant.
     */
    public function update(Request $request, Event $event): JsonResponse
    {
        abort_if($event->organization_id !== $request->user()->organization_id, 403);

        // Permission : seul le créateur ou un admin peut modifier
        if ($event->creator_id !== $request->user()->id
            && ! $request->user()->isAdmin()) {
            abort(403, 'Vous ne pouvez modifier que vos propres événements.');
        }

        $request->validate([
            'title'            => 'sometimes|required|string|max:255',
            'description'      => 'nullable|string|max:5000',
            'location'         => 'nullable|string|max:500',
            'start_at'         => 'sometimes|required|date',
            'end_at'           => 'sometimes|required|date|after_or_equal:start_at',
            'is_all_day'       => 'boolean',
            'recurrence_rule'  => 'nullable|string|max:500',
            'color'            => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'type'             => 'nullable|in:event,meeting,task,reminder',
            'meet_link'        => 'nullable|url',
            'participants'     => 'nullable|array',
            'participants.*'   => 'uuid',
            'room_id'          => 'nullable|uuid',
            'reminders'        => 'nullable|array|max:5',
            'reminders.*.minutes' => 'required_with:reminders|integer|min:0|max:10080',
            'reminders.*.channel' => 'required_with:reminders|in:app,email,sms,whatsapp',
            'calendar_id'      => 'nullable|uuid',
        ]);

        try {
            $event = $this->agendaService->updateEvent($event, $request->all());

            return response()->json([
                'message' => 'Événement mis à jour avec succès.',
                'event'   => $event->toCalendarFormat(),
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Supprime un événement.
     */
    public function destroy(Request $request, Event $event): JsonResponse
    {
        abort_if($event->organization_id !== $request->user()->organization_id, 403);

        if ($event->creator_id !== $request->user()->id && ! $request->user()->isAdmin()) {
            abort(403, 'Vous ne pouvez supprimer que vos propres événements.');
        }

        $this->agendaService->deleteEvent($event);

        return response()->json(['message' => 'Événement supprimé avec succès.']);
    }

    /**
     * Retourne les événements au format FullCalendar JSON.
     *
     * FullCalendar interroge cette route avec les paramètres start et end
     * lors de la navigation (changement de vue, mois suivant, etc.).
     *
     * Format de réponse : [{id, title, start, end, allDay, color, extendedProps}]
     */
    public function getCalendarEvents(Request $request): JsonResponse
    {
        $request->validate([
            'start' => 'required|date',
            'end'   => 'required|date|after:start',
        ]);

        $user   = $request->user();
        $start  = Carbon::parse($request->start);
        $end    = Carbon::parse($request->end);

        $events = $this->agendaService->getEventsForCalendar(
            $user->organization,
            $start,
            $end
        );

        // Transformer pour FullCalendar (les récurrents sont déjà dans le bon format)
        $formatted = $events->map(function ($event) {
            if ($event instanceof Event) {
                return $event->toCalendarFormat();
            }
            // Les occurrences récurrentes sont déjà des tableaux
            return $event;
        });

        return response()->json($formatted->values());
    }

    /**
     * Vérifie les conflits de créneau pour un utilisateur.
     *
     * Utilisé avant de valider un formulaire de création pour alerter
     * l'utilisateur d'un potentiel conflit.
     *
     * @body {user_id?, start_at, end_at, exclude_event_id?}
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        $request->validate([
            'start_at'         => 'required|date',
            'end_at'           => 'required|date|after:start_at',
            'user_id'          => 'nullable|uuid',
            'exclude_event_id' => 'nullable|uuid',
        ]);

        $userId   = $request->input('user_id', $request->user()->id);
        $start    = Carbon::parse($request->start_at);
        $end      = Carbon::parse($request->end_at);
        $exclude  = $request->input('exclude_event_id');

        // Sécurité : un utilisateur ne peut vérifier que sa propre dispo
        // sauf si c'est un admin qui planifie pour d'autres
        if ($userId !== $request->user()->id && ! $request->user()->isAdmin()) {
            $userId = $request->user()->id;
        }

        $hasConflict = $this->agendaService->checkConflicts($userId, $start, $end, $exclude);

        return response()->json([
            'has_conflict' => $hasConflict,
            'available'    => ! $hasConflict,
            'checked_for'  => $userId,
            'period' => [
                'start' => $start->toIso8601String(),
                'end'   => $end->toIso8601String(),
            ],
        ]);
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
