<?php

namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Organization>
 */
class OrganizationFactory extends Factory
{
    protected $model = Organization::class;

    public function definition(): array
    {
        $name = $this->faker->company() . ' ' . $this->faker->companySuffix();
        $slug = Str::slug($name) . '-' . $this->faker->unique()->numberBetween(100, 999);

        return [
            'name'            => $name,
            'slug'            => $slug,
            'domain'          => $slug . '.secretis.app',
            'email'           => $this->faker->unique()->companyEmail(),
            'phone'           => '+225 27 ' . $this->faker->numerify('## ## ## ##'),
            'address'         => $this->faker->streetAddress(),
            'city'            => $this->faker->randomElement(['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro']),
            'country'         => 'CI',
            'timezone'        => 'Africa/Abidjan',
            'locale'          => 'fr',
            'tax_number'      => 'CI-' . now()->year . '-TF-' . $this->faker->numerify('########'),
            'settings'        => json_encode([
                'working_hours' => ['start' => '08:00', 'end' => '17:30'],
                'working_days'  => ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
                'currency'      => 'XOF',
            ]),
            'modules_enabled' => json_encode(['agenda', 'courrier', 'documents']),
            'is_active'       => true,
            'trial_ends_at'   => now()->addDays(14),
        ];
    }

    /** Organisation avec plan Pro actif */
    public function pro(): static
    {
        return $this->state(fn (array $attr) => [
            'modules_enabled' => json_encode(['agenda', 'courrier', 'documents', 'projets', 'rh', 'visiteurs']),
            'trial_ends_at'   => null,
        ]);
    }

    /** Organisation Enterprise */
    public function enterprise(): static
    {
        return $this->state(fn (array $attr) => [
            'modules_enabled' => json_encode(['agenda', 'courrier', 'documents', 'projets', 'rh', 'visiteurs', 'audit', 'api']),
            'trial_ends_at'   => null,
        ]);
    }

    /** Organisation inactive / suspendue */
    public function inactive(): static
    {
        return $this->state(fn (array $attr) => [
            'is_active' => false,
        ]);
    }

    /** Organisation en période d'essai */
    public function onTrial(): static
    {
        return $this->state(fn (array $attr) => [
            'trial_ends_at' => now()->addDays($this->faker->numberBetween(1, 14)),
        ]);
    }
}
