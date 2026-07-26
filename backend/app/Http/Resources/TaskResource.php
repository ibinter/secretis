<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * TaskResource — Transformation API des tâches
 *
 * Sous-tâches imbriquées jusqu'à 2 niveaux maximum.
 * Au-delà, seul le compte est fourni pour éviter les payloads massifs.
 *
 * Modes :
 *  - mode liste (Kanban/Liste) : champs essentiels + assignees résumés
 *  - mode détail : champs complets + sous-tâches + historique
 */
class TaskResource extends JsonResource
{
    private bool $detailed    = false;
    private int  $nestingLevel = 0;

    /** Activer le mode détail */
    public function withDetail(): self
    {
        $this->detailed = true;
        return $this;
    }

    /** Constructeur interne pour la récursion des sous-tâches */
    private static function forNesting(mixed $resource, int $level): self
    {
        $instance = new self($resource);
        $instance->nestingLevel = $level;
        $instance->detailed     = true;
        return $instance;
    }

    /**
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // ── Champs communs (liste + détail) ──────────────────────────────
        $base = [
            'id'         => $this->id,
            'title'      => $this->title,
            'status'     => $this->status,
            'priority'   => $this->priority,
            'due_date'   => $this->due_date?->toDateString(),
            'is_overdue' => $this->is_overdue,
            'position'   => $this->position,
            'project_id' => $this->project_id,

            // Assignees résumés pour les cartes Kanban
            'assignees'  => $this->whenLoaded('assignees', fn() =>
                $this->assignees->map(fn($u) => [
                    'id'     => $u->id,
                    'name'   => $u->name,
                    'avatar' => $u->avatar,
                ])->values()
            ),

            // Indicateurs de sous-tâches (sans les charger)
            'subtasks_count'    => $this->whenLoaded('subtasks', fn() => $this->subtasks->count()),
            'subtasks_done'     => $this->whenLoaded('subtasks', fn() => $this->subtasks->where('status', 'done')->count()),
            'subtasks_progress' => $this->whenLoaded('subtasks', fn() => $this->subtasks_progress),
        ];

        if (! $this->detailed) {
            return $base;
        }

        // ── Mode détail : champs complets ─────────────────────────────────
        return array_merge($base, [
            'description'      => $this->description,
            'meeting_id'       => $this->meeting_id,
            'parent_id'        => $this->parent_id,
            'completed_at'     => $this->completed_at?->toIso8601String(),
            'days_overdue'     => $this->days_overdue,
            'attachments'      => $this->attachments ?? [],
            'settings'         => $this->settings ?? [],
            'allowed_transitions' => $this->resource->allowedTransitions(),

            // Sous-tâches imbriquées (max 2 niveaux)
            'subtasks'  => $this->nestingLevel < 2
                ? $this->whenLoaded('subtasks', fn() =>
                    $this->subtasks->map(fn($sub) =>
                        self::forNesting($sub, $this->nestingLevel + 1)->toArray($request)
                    )->values()
                )
                : $this->whenLoaded('subtasks', fn() => $this->subtasks->count()),

            // Observateurs
            'observers' => $this->whenLoaded('observers', fn() =>
                $this->observers->map(fn($u) => ['id' => $u->id, 'name' => $u->name])->values()
            ),

            // Créateur
            'creator' => $this->whenLoaded('creator', fn() => [
                'id'     => $this->creator->id,
                'name'   => $this->creator->name,
                'avatar' => $this->creator->avatar,
            ]),

            // Commentaires (résumé : count + 3 derniers)
            'comments_count' => $this->whenLoaded('comments', fn() => $this->comments->count()),
            'latest_comments' => $this->whenLoaded('comments', fn() =>
                $this->comments->sortByDesc('created_at')->take(3)->map(fn($c) => [
                    'id'         => $c->id,
                    'content'    => $c->content,
                    'created_at' => $c->created_at->toIso8601String(),
                    'author'     => ['id' => $c->user_id, 'name' => $c->user?->name],
                ])->values()
            ),

            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ]);
    }
}
