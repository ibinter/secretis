<?php

namespace Database\Factories;

use App\Models\Calendar;
use App\Models\Event;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    protected $model = Event::class;

    public function definition(): array
    {
        $organization = Organization::factory()->create();
        $creator      = User::factory()->forOrganization($organization->id)->create();

        $startsAt = $this->faker->dateTimeBetween('-7 days', '+14 days');
        $endsAt   = (clone $startsAt)->modify('+' . $this->faker->numberBetween(30, 180) . ' minutes');

        $titles = [
            'Réunion hebdomadaire',
            'Point équipe commerciale',
            'CODIR mensuel',
            'Revue de projet',
            'Entretien client',
            'Formation interne',
            'Présentation partenaire',
            'Atelier planification',
            'Séance de travail',
            'Réunion de crise',
        ];

        return [
            'organization_id' => $organization->id,
            'calendar_id'     => Calendar::firstOrCreate(
                ['organization_id' => $organization->id],
                [
                    'name'       => 'Agenda Principal',
                    'color'      => '#6366f1',
                    'is_default' => true,
                    'created_by' => $creator->id,
                ]
            )->id,
            'created_by'      => $creator->id,
            'title'           => $this->faker->randomElement($titles),
            'description'     => $this->faker->optional(0.6)->sentence(),
            'location'        => $this->faker->optional(0.5)->randomElement(['Salle Présidence', 'Salle Innovation', 'Bureau DG', 'Online/Teams']),
            'color'           => $this->faker->randomElement(['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444']),
            'type'            => $this->faker->randomElement(['meeting', 'meeting', 'meeting', 'reminder', 'other']),
            'starts_at'       => $startsAt,
            'ends_at'         => $endsAt,
            'all_day'         => false,
            'is_cancelled'    => false,
            'room_id'         => null,
        ];
    }

    /** Événement passé */
    public function past(): static
    {
        return $this->state(function (array $attr) {
            $startsAt = $this->faker->dateTimeBetween('-30 days', '-1 day');
            return [
                'starts_at' => $startsAt,
                'ends_at'   => (clone $startsAt)->modify('+90 minutes'),
            ];
        });
    }

    /** Événement futur */
    public function future(): static
    {
        return $this->state(function (array $attr) {
            $startsAt = $this->faker->dateTimeBetween('+1 day', '+30 days');
            return [
                'starts_at' => $startsAt,
                'ends_at'   => (clone $startsAt)->modify('+60 minutes'),
            ];
        });
    }

    /** Événement journée entière */
    public function allDay(): static
    {
        return $this->state(fn (array $attr) => [
            'all_day' => true,
            'type'    => 'holiday',
        ]);
    }

    /** Réunion */
    public function meeting(): static
    {
        return $this->state(fn (array $attr) => [
            'type'  => 'meeting',
            'title' => 'Réunion ' . $this->faker->words(2, true),
        ]);
    }

    /** Événement annulé */
    public function cancelled(): static
    {
        return $this->state(fn (array $attr) => [
            'is_cancelled' => true,
        ]);
    }
}
