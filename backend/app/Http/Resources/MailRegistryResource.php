<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * MailRegistryResource — Transformation API du registre courrier
 *
 * Expose les données du courrier entrant/sortant avec :
 *  - Calcul de l'état de retard (isOverdue) côté serveur
 *  - Couleurs de statut/urgence prêtes pour l'UI
 *  - Attachements résumés (sans le contenu binaire)
 */
class MailRegistryResource extends JsonResource
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
            'id'            => $this->id,
            'reference'     => $this->reference,
            'type'          => $this->type,      // incoming | outgoing
            'subject'       => $this->subject,
            'urgency'       => $this->urgency,
            'urgency_color' => $this->resource->getUrgencyColor(),
            'status'        => $this->status,
            'status_color'  => $this->resource->getStatusColor(),
            'is_overdue'    => $this->resource->isOverdue(),
            'received_at'   => $this->received_at?->toDateString(),
            'sent_at'       => $this->sent_at?->toDateString(),
            'created_at'    => $this->created_at->toIso8601String(),

            // Résumé expéditeur/destinataire
            'sender'    => [
                'name' => $this->sender_name,
                'org'  => $this->sender_org,
            ],
            'recipient' => [
                'name' => $this->recipient_name,
                'org'  => $this->recipient_org,
            ],

            // Assigné (résumé)
            'assignee' => $this->whenLoaded('assignee', fn() =>
                $this->assignee ? [
                    'id'     => $this->assignee->id,
                    'name'   => $this->assignee->name,
                    'avatar' => $this->assignee->avatar,
                ] : null
            ),

            // Département assigné
            'department' => $this->whenLoaded('department', fn() =>
                $this->department ? [
                    'id'   => $this->department->id,
                    'name' => $this->department->name,
                ] : null
            ),

            // Nombre de pièces jointes (sans les charger en liste)
            'attachments_count' => $this->whenLoaded('attachments', fn() => $this->attachments->count()),
        ];

        if (! $this->detailed) {
            return $base;
        }

        return array_merge($base, [
            'notes'                  => $this->notes,
            'processing_delay_days'  => $this->processing_delay_days,
            'department_id'          => $this->department_id,

            // Pièces jointes (liste complète en mode détail)
            'attachments' => $this->whenLoaded('attachments', fn() =>
                $this->attachments->map(fn($a) => [
                    'id'       => $a->id,
                    'name'     => $a->file_name,
                    'size'     => $a->file_size,
                    'mime'     => $a->mime_type,
                    'url'      => $a->download_url, // URL signée ou route protégée
                ])->values()
            ),

            // Historique de traitement
            'tracking_history' => $this->whenLoaded('trackingHistory', fn() =>
                $this->trackingHistory->map(fn($t) => [
                    'id'         => $t->id,
                    'action'     => $t->action,
                    'notes'      => $t->notes,
                    'created_at' => $t->created_at->toIso8601String(),
                    'user'       => ['id' => $t->user_id, 'name' => $t->user?->name],
                ])->values()
            ),

            'created_by' => $this->whenLoaded('createdBy', fn() => [
                'id'   => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ]),
            'updated_at' => $this->updated_at->toIso8601String(),
        ]);
    }
}
