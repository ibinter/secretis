<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\Event;
use App\Services\AgendaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * EventApiController — API Agenda v1
 *
 * Endpoints :
 *  GET    /api/v1/events              → Liste (format FullCalendar)
 *  POST   /api/v1/events              → Créer
 *  GET    /api/v1/events/{id}         → Détail
 *  PUT    /api/v1/events/{id}         → Modifier
 *  DELETE /api/v1/events/{id}         → Supprimer
 *
 * Middlewares appliqués dans routes/api.php :
 *  auth:sanctum, tenant, ensureLicenseValid
 */
class EventApiController extends ApiController
{
    public function __construct(private readonly AgendaService $agenda) {}

    // -------------------------------------------------------------------------
    // GET /events
    // -------------------------------------------------------------------------

    /**
     * Retourne les événements dans la plage start→end, au format FullCalendar.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'start'       => ['required', 'date'],
            'end'         => ['required', 'date', 'after_or_equal:start'],
            'view'        => ['nullable', 'in:month,week,day,list'],
            'calendar_id' => ['nullable', 'uuid'],
            'type'        => ['nullable', 'in:event,meeting,task,reminder'],
        ]);

        $org   = $request->user()->organization_id;
        $start = Carbon::parse($request->input('start'))->startOfDay();
        $end   = Carbon::parse($request->input('end'))->endOfDay();

        $query = Event::forOrganization($org)
                      ->inDateRange($start, $end)
                      ->with(['creator', 'participants', 'roomReservation']);

        if ($request->filled('calendar_id')) {
            $query->byCalendar($request->input('calendar_id'));
        }
        if ($request->filled('type')) {
            $query->ofType($request->input('type'));
        }

        $events = $query->orderBy('start_at')->get();

        // Format FullCalendar
        $formatted = $events->map(fn(Event $e) => $e->toCalendarFormat());

        return $this->success($formatted, 'Événements récupérés.');
    }

    // -------------------------------------------------------------------------
    // POST /events
    // -------------------------------------------------------------------------

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'calendar_id'      => ['nullable', 'uuid', 'exists:calendars,id'],
            'title'            => ['required', 'string', 'max:255'],
            'description'      => ['nullable', 'string', 'max:5000'],
            'location'         => ['nullable', 'string', 'max:255'],
            'start_at'         => ['required', 'date'],
            'end_at'           => ['required', 'date', 'after:start_at'],
            'is_all_day'       => ['boolean'],
            'recurrence_rule'  => ['nullable', 'string', 'max:255'],
            'color'            => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'type'             => ['nullable', 'in:event,meeting,task,reminder'],
            'meet_link'        => ['nullable', 'url'],
            'participant_ids'  => ['nullable', 'array'],
            'participant_ids.*' => ['integer', 'exists:users,id'],
            'reminders'        => ['nullable', 'array'],
            'reminders.*.minutes' => ['integer', 'min:0'],
            'reminders.*.channel' => ['in:email,push,sms'],
        ]);

        $data['organization_id'] = $request->user()->organization_id;
        $data['creator_id']      = $request->user()->id;

        $event = $this->agenda->createEvent($data, $data['participant_ids'] ?? []);

        return $this->created($event->load(['creator', 'participants']), 'Événement créé avec succès.');
    }

    // -------------------------------------------------------------------------
    // GET /events/{id}
    // -------------------------------------------------------------------------

    public function show(string $id): JsonResponse
    {
        $event = Event::forOrganization(request()->user()->organization_id)
                      ->with(['creator', 'participants', 'roomReservation', 'calendar'])
                      ->find($id);

        if (! $event) {
            return $this->notFound('Événement');
        }

        return $this->success($event);
    }

    // -------------------------------------------------------------------------
    // PUT /events/{id}
    // -------------------------------------------------------------------------

    public function update(Request $request, string $id): JsonResponse
    {
        $event = Event::forOrganization($request->user()->organization_id)->find($id);

        if (! $event) {
            return $this->notFound('Événement');
        }

        $data = $request->validate([
            'title'           => ['sometimes', 'string', 'max:255'],
            'description'     => ['nullable', 'string', 'max:5000'],
            'location'        => ['nullable', 'string', 'max:255'],
            'start_at'        => ['sometimes', 'date'],
            'end_at'          => ['sometimes', 'date'],
            'is_all_day'      => ['sometimes', 'boolean'],
            'recurrence_rule' => ['nullable', 'string', 'max:255'],
            'color'           => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'meet_link'       => ['nullable', 'url'],
            'participant_ids' => ['nullable', 'array'],
            'participant_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $event = $this->agenda->updateEvent($event, $data, $data['participant_ids'] ?? null);

        return $this->success($event->load(['creator', 'participants']), 'Événement mis à jour.');
    }

    // -------------------------------------------------------------------------
    // DELETE /events/{id}
    // -------------------------------------------------------------------------

    public function destroy(Request $request, string $id): JsonResponse
    {
        $event = Event::forOrganization($request->user()->organization_id)->find($id);

        if (! $event) {
            return $this->notFound('Événement');
        }

        $event->delete();

        return $this->noContent('Événement supprimé.');
    }
}
