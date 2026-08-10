<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * EventResource — Transformation API des événements de l'agenda
 *
 * Mode liste  : champs minimaux pour afficher le calendrier (FullCalendar)
 * Mode détail : champs complets pour la modale d'événement
 *
 * Usage :
 *   EventResource::collection($events)           → mode liste par défaut
 *   (new EventResource($event))->withDetail()    → mode détail complet
 */
class EventResource extends JsonResource
{
    /** Active le mode détail (champs complets) */
    private bool $detailed = false;

    public function withDetail(): self
    {
        $this->detailed = true;
        return $this;
    }

    /**
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // ── Mode liste : optimisé pour FullCalendar (payload minimal) ──────
        $base = [
            'id'       => $this->id,
            'title'    => $this->title,
            'start'    => $this->is_all_day
                ? $this->start_at->toDateString()
                : $this->start_at->toIso8601String(),
            'end'      => $this->is_all_day
                ? $this->end_at->toDateString()
                : $this->end_at->toIso8601String(),
            'allDay'   => $this->is_all_day,
            'color'    => $this->color ?? $this->resource->getDefaultColorForType(),
            'type'     => $this->type,
            // Indicateurs rapides pour l'UI
            'has_room' => $this->whenLoaded('roomReservation', fn() => $this->roomReservation !== null, false),
            'participants_count' => $this->whenLoaded('participants', fn() => $this->participants->count(), 0),
        ];

        if (! $this->detailed) {
            return $base;
        }

        // ── Mode détail : champs complets pour la modale ──────────────────
        return array_merge($base, [
            'description'     => $this->description,
            'location'        => $this->location,
            'meet_link'       => $this->meet_link,
            'recurrence_rule' => $this->recurrence_rule,
            'reminders'       => $this->reminders ?? [],
            'calendar_id'     => $this->calendar_id,
            'calendar'        => $this->whenLoaded('calendar', fn() => [
                'id'    => $this->calendar->id,
                'name'  => $this->calendar->name,
                'color' => $this->calendar->color,
            ]),
            'creator' => $this->whenLoaded('creator', fn() => [
                'id'     => $this->creator->id,
                'name'   => $this->creator->name,
                'avatar' => $this->creator->avatar,
            ]),
            'participants' => $this->whenLoaded('participants', fn() =>
                $this->participants->map(fn($p) => [
                    'id'     => $p->id,
                    'name'   => $p->name,
                    'avatar' => $p->avatar,
                    'status' => $p->pivot->status,
                    'role'   => $p->pivot->role,
                ])
            ),
            'room_reservation' => $this->whenLoaded('roomReservation', fn() =>
                $this->roomReservation ? [
                    'id'      => $this->roomReservation->id,
                    'room_id' => $this->roomReservation->room_id,
                ] : null
            ),
            // Méta
            'duration_minutes' => $this->resource->getDurationInMinutes(),
            'is_recurring'     => $this->resource->isRecurring(),
            'created_at'       => $this->created_at->toIso8601String(),
            'updated_at'       => $this->updated_at->toIso8601String(),
        ]);
    }
}
