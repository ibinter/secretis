<?php

namespace Database\Factories;

use App\Models\MailRegistry;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\DB;

/**
 * @extends Factory<MailRegistry>
 */
class MailRegistryFactory extends Factory
{
    protected $model = MailRegistry::class;

    private static array $counters = ['incoming' => 0, 'outgoing' => 0, 'internal' => 0];

    public function definition(): array
    {
        $organization = Organization::factory()->create();
        $registrar    = User::factory()->forOrganization($organization->id)->create();

        $type    = $this->faker->randomElement(['incoming', 'outgoing', 'incoming', 'incoming']);
        $urgency = $this->faker->randomElement(['low', 'normal', 'normal', 'high', 'urgent']);

        static::$counters[$type]++;
        $year   = now()->year;
        $month  = now()->format('m');
        $prefix = ['incoming' => 'CI', 'outgoing' => 'CO', 'internal' => 'IN'][$type];
        $ref    = sprintf('%s-%s%s-%04d', $prefix, $year, $month, static::$counters[$type]);

        $incomingSubjects = [
            'Demande de partenariat commercial',
            'Relance facture impayée',
            'Convocation réunion interministérielle',
            'Rapport d\'audit trimestriel',
            'Réponse appel d\'offres N°AO-' . $year,
            'Demande de renseignements',
            'Notification inspection du travail',
            'Invitation forum d\'affaires',
        ];

        $outgoingSubjects = [
            'Offre de services conseil stratégique',
            'Confirmation de réunion du ' . $this->faker->date('d/m/Y'),
            'Envoi rapport mensuel',
            'Accusé de réception courrier du ' . $this->faker->date('d/m/Y'),
            'Lettre de recommandation',
            'Bon de commande N°BC-' . $year . '-' . $this->faker->numberBetween(100, 999),
        ];

        $subjects = $type === 'outgoing' ? $outgoingSubjects : $incomingSubjects;

        $receivedAt = $type === 'incoming' ? $this->faker->dateTimeBetween('-60 days', 'now') : null;
        $sentAt     = $type === 'outgoing' ? $this->faker->dateTimeBetween('-60 days', 'now') : null;

        return [
            'organization_id'     => $organization->id,
            'reference'           => $ref . '-' . $organization->id,
            'type'                => $type,
            'urgency'             => $urgency,
            'status'              => $this->faker->randomElement(['received', 'registered', 'assigned', 'in_progress', 'replied', 'archived']),
            'subject'             => $this->faker->randomElement($subjects),
            'body'                => $this->faker->optional(0.4)->paragraphs(2, true),
            'sender_name'         => $type === 'incoming' ? $this->faker->name() : 'Cabinet Conseil',
            'sender_email'        => $type === 'incoming' ? $this->faker->companyEmail() : 'contact@cabinet.ci',
            'sender_organization' => $type === 'incoming' ? $this->faker->company() : 'Cabinet Conseil SARL',
            'recipient_name'      => $type === 'outgoing' ? $this->faker->name() : null,
            'recipient_email'     => $type === 'outgoing' ? $this->faker->companyEmail() : null,
            'received_at'         => $receivedAt,
            'sent_at'             => $sentAt,
            'due_date'            => $urgency === 'urgent' ? $this->faker->dateTimeBetween('now', '+3 days') : null,
            'assigned_to'         => $this->faker->optional(0.7)->passthrough($registrar->id),
            'registered_by'       => $registrar->id,
            'notes'               => $this->faker->optional(0.3)->sentence(),
            'tags'                => json_encode([$type, $urgency]),
        ];
    }

    /** Courrier entrant */
    public function incoming(): static
    {
        return $this->state(fn (array $attr) => [
            'type'        => 'incoming',
            'received_at' => $this->faker->dateTimeBetween('-30 days', 'now'),
            'sent_at'     => null,
        ]);
    }

    /** Courrier sortant */
    public function outgoing(): static
    {
        return $this->state(fn (array $attr) => [
            'type'     => 'outgoing',
            'sent_at'  => $this->faker->dateTimeBetween('-30 days', 'now'),
            'received_at' => null,
        ]);
    }

    /** Courrier urgent */
    public function urgent(): static
    {
        return $this->state(fn (array $attr) => [
            'urgency'  => 'urgent',
            'status'   => $this->faker->randomElement(['received', 'registered', 'assigned']),
            'due_date' => $this->faker->dateTimeBetween('now', '+3 days'),
        ]);
    }

    /** Courrier archivé */
    public function archived(): static
    {
        return $this->state(fn (array $attr) => [
            'status' => 'archived',
        ]);
    }

    /** Courrier en cours de traitement */
    public function inProgress(): static
    {
        return $this->state(fn (array $attr) => [
            'status' => 'in_progress',
        ]);
    }
}
