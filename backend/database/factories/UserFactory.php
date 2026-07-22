<?php

namespace Database\Factories;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    private static string $password = 'password';

    public function definition(): array
    {
        $firstNames = ['Konan', 'Aya', 'Séraphine', 'Adjoua', 'Mariam', 'Ibrahim', 'Fatou',
                       'Koffi', 'Akossiwa', 'Christophe', 'Romaric', 'Nathalie', 'Patrice',
                       'Amina', 'Jean-Paul', 'Cécile', 'Kouamé', 'Aminata', 'Serge'];
        $lastNames  = ['Yao', 'Kouassi', 'Bamba', 'N\'Goran', 'Coulibaly', 'Diallo', 'Traoré',
                       'Assouman', 'Mensah', 'Aka', 'Ouattara', 'Bogui', 'Djobo', 'Sanogo',
                       'Koffi', 'Kouamé', 'N\'Guessan', 'Touré'];

        $firstName = $this->faker->randomElement($firstNames);
        $lastName  = $this->faker->randomElement($lastNames);

        return [
            'organization_id'   => Organization::factory(),
            'department_id'     => null,
            'first_name'        => $firstName,
            'last_name'         => $lastName,
            'email'             => Str::lower($firstName . '.' . $lastName . $this->faker->unique()->numberBetween(1, 9999)) . '@exemple.ci',
            'phone'             => '+225 07 ' . $this->faker->numerify('## ## ## ##'),
            'role'              => 'employee',
            'job_title'         => $this->faker->jobTitle(),
            'locale'            => 'fr',
            'timezone'          => 'Africa/Abidjan',
            'is_active'         => true,
            'email_verified_at' => now(),
            'password'          => Hash::make(static::$password),
            'remember_token'    => Str::random(10),
            'last_login_at'     => $this->faker->dateTimeBetween('-30 days', 'now'),
        ];
    }

    /** Administrateur organisation */
    public function admin(): static
    {
        return $this->state(fn (array $attr) => [
            'role'      => 'admin',
            'job_title' => 'Administrateur',
        ]);
    }

    /** Manager / responsable */
    public function manager(): static
    {
        return $this->state(fn (array $attr) => [
            'role'      => 'manager',
            'job_title' => $this->faker->randomElement(['Responsable département', 'Chef de service', 'Directeur adjoint']),
        ]);
    }

    /** Superadmin SECRETIS (plateforme) */
    public function superadmin(): static
    {
        return $this->state(fn (array $attr) => [
            'organization_id' => null,
            'role'            => 'superadmin',
            'email'           => 'superadmin@secretis.app',
            'first_name'      => 'Super',
            'last_name'       => 'Admin',
        ]);
    }

    /** Compte non vérifié */
    public function unverified(): static
    {
        return $this->state(fn (array $attr) => [
            'email_verified_at' => null,
        ]);
    }

    /** Compte inactif / désactivé */
    public function inactive(): static
    {
        return $this->state(fn (array $attr) => [
            'is_active' => false,
        ]);
    }

    /** Rattaché à une organisation existante */
    public function forOrganization(int $organizationId): static
    {
        return $this->state(fn (array $attr) => [
            'organization_id' => $organizationId,
        ]);
    }
}
