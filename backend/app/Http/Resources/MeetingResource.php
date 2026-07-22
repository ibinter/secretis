<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * MeetingResource — Transformation API des réunions
 *
 * Ne expose pas le contenu du compte rendu (minutes_content) en mode liste
 * pour éviter des payloads massifs dans les tableaux de bord.
 */
class MeetingResource extends JsonResource
{
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
        $base = [
            'id'               => $this->id,
            'title'            => $this->title,
            'meeting_type'     => $this->meeting_type,
            'status'           => $this->status,
            'location'         => $this->location,
            'scheduled_at'     => $this->scheduled_at->toIso8601String(),
            'duration_minutes' => $this->duration_minutes,

            // Indicateurs calculés
            'is_late'             => $this->is_late,
            'minutes_approved'    => $this->minutes_approved,
            'decisions_count'     => $this->decisions_count,
            'actual_duration_min' => $this->actual_duration_minutes,

            // Organisateur (résumé)
            'organizer' => $this->whenLoaded('organizer', fn() => [
                'id'     => $this->organizer->id,
                'name'   => $this->organizer->name,
                'avatar' => $this->organizer->avatar,
            ]),

            // Nombre de participants
            'participants_count' => $this->whenLoaded('participants', fn() => $this->participants->count()),

            // Tâches générées depuis les décisions
            'tasks_count' => $this->whenLoaded('tasks', fn() => $this->tasks->count()),

            'created_at' => $this->created_at->toIso8601String(),
        ];

        if (! $this->detailed) {
            return $base;
        }

        return array_merge($base, [
            'description'        => $this->description,
            'started_at'         => $this->started_at?->toIso8601String(),
            'ended_at'           => $this->ended_at?->toIso8601String(),
            'minutes_content'    => $this->minutes_content,   // HTML TipTap
            'minutes_pdf_url'    => $this->minutes_pdf_path
                ? route('meetings.minutes.pdf', $this->id)
                : null,
            'minutes_approved_at' => $this->minutes_approved_at?->toIso8601String(),
            'agenda_items'        => $this->resource->getSortedAgendaItems(),
            'decisions'           => $this->decisions ?? [],

            // Président de séance
            'president' => $this->whenLoaded('president', fn() =>
                $this->president ? [
                    'id'   => $this->president->id,
                    'name' => $this->president->name,
                ] : null
            ),

            // Participants avec rôle et statut invitation
            'participants' => $this->whenLoaded('participants', fn() =>
                $this->participants->map(fn($p) => [
                    'id'                => $p->id,
                    'name'              => $p->name,
                    'avatar'            => $p->avatar,
                    'role'              => $p->pivot->role,
                    'invitation_status' => $p->pivot->invitation_status,
                ])->values()
            ),

            // Tâches issues des décisions
            'tasks' => $this->whenLoaded('tasks', fn() =>
                $this->tasks->map(fn($t) => [
                    'id'       => $t->id,
                    'title'    => $t->title,
                    'status'   => $t->status,
                    'due_date' => $t->due_date?->toDateString(),
                ])->values()
            ),

            // Capacités selon statut
            'can' => [
                'start'           => $this->resource->canStart(),
                'end'             => $this->resource->canEnd(),
                'approve_minutes' => $this->resource->canApproveMinutes(),
            ],
        ]);
    }
}
