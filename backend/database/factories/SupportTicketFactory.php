<?php

namespace Database\Factories;

use App\Models\SupportTicket;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * SupportTicketFactory — Factory de tickets de support SECRETIS ERP
 *
 * Fournit des états prédéfinis pour faciliter la création de fixtures de test.
 */
class SupportTicketFactory extends Factory
{
    protected $model = SupportTicket::class;

    public function definition(): array
    {
        return [
            'organization_id'      => 1,
            'user_id'              => 1,
            'ticket_number'        => SupportTicket::generateTicketNumber(),
            'subject'              => $this->faker->sentence(6),
            'status'               => $this->faker->randomElement(['open', 'in_progress', 'resolved', 'closed']),
            'priority'             => $this->faker->randomElement(['low', 'medium', 'high', 'urgent']),
            'category'             => $this->faker->randomElement(['technical', 'billing', 'feature_request', 'training', 'other']),
            'assigned_to'          => null,
            'first_response_at'    => null,
            'resolved_at'          => null,
            'closed_at'            => null,
            'satisfaction_rating'  => null,
            'satisfaction_comment' => null,
            'metadata'             => [],
        ];
    }

    // -------------------------------------------------------------------------
    // États prédéfinis
    // -------------------------------------------------------------------------

    /**
     * Ticket ouvert (non assigné, sans première réponse).
     */
    public function open(): static
    {
        return $this->state([
            'status'            => 'open',
            'assigned_to'       => null,
            'first_response_at' => null,
            'resolved_at'       => null,
            'closed_at'         => null,
        ]);
    }

    /**
     * Ticket en cours de traitement.
     */
    public function inProgress(): static
    {
        return $this->state([
            'status'            => 'in_progress',
            'first_response_at' => now()->subHours(2),
        ]);
    }

    /**
     * Ticket résolu (prêt pour évaluation).
     */
    public function resolved(): static
    {
        return $this->state([
            'status'      => 'resolved',
            'resolved_at' => now()->subHour(),
        ]);
    }

    /**
     * Ticket fermé avec évaluation.
     */
    public function closed(): static
    {
        return $this->state([
            'status'               => 'closed',
            'resolved_at'          => now()->subDays(2),
            'closed_at'            => now()->subDay(),
            'satisfaction_rating'  => $this->faker->numberBetween(1, 5),
            'satisfaction_comment' => $this->faker->optional(0.6)->sentence(),
        ]);
    }

    /**
     * Ticket en attente de réponse client.
     */
    public function waitingClient(): static
    {
        return $this->state([
            'status'            => 'waiting_client',
            'first_response_at' => now()->subHours(4),
        ]);
    }

    /**
     * Priorité urgente.
     */
    public function urgent(): static
    {
        return $this->state([
            'priority' => 'urgent',
        ]);
    }

    /**
     * Priorité haute.
     */
    public function high(): static
    {
        return $this->state([
            'priority' => 'high',
        ]);
    }

    /**
     * Ticket technique.
     */
    public function technical(): static
    {
        return $this->state([
            'category' => 'technical',
            'subject'  => $this->faker->randomElement([
                'Erreur 500 sur le module comptabilité',
                'Impossible de générer un rapport PDF',
                'Synchronisation calendrier défaillante',
                'Signature électronique échoue systématiquement',
                'Import CSV bloqué à 50%',
            ]),
        ]);
    }

    /**
     * Ticket de facturation.
     */
    public function billing(): static
    {
        return $this->state([
            'category' => 'billing',
            'subject'  => $this->faker->randomElement([
                'Facture incorrecte pour le mois de ' . now()->format('F Y'),
                'Demande de reçu de paiement',
                'Changement de plan tarifaire',
                'Remboursement suite à doublon de facturation',
            ]),
        ]);
    }

    /**
     * Ticket en retard (ouvert depuis plus de 48h sans première réponse).
     */
    public function overdue(): static
    {
        return $this->state([
            'status'            => 'open',
            'first_response_at' => null,
            'created_at'        => now()->subHours(72),
        ]);
    }

    /**
     * Ticket assigné à un agent.
     */
    public function assignedTo(int $agentId): static
    {
        return $this->state([
            'assigned_to' => $agentId,
            'status'      => 'in_progress',
        ]);
    }

    /**
     * Ticket appartenant à une organisation donnée.
     */
    public function forOrganization(int $orgId): static
    {
        return $this->state([
            'organization_id' => $orgId,
        ]);
    }

    /**
     * Ticket appartenant à un utilisateur donné.
     */
    public function forUser(int $userId): static
    {
        return $this->state([
            'user_id' => $userId,
        ]);
    }

    /**
     * Ticket avec métadonnées personnalisées.
     */
    public function withMetadata(array $metadata): static
    {
        return $this->state([
            'metadata' => $metadata,
        ]);
    }
}
