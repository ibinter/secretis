<?php

namespace Tests;

use App\Models\License;
use App\Models\Organization;
use App\Models\Plan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * TestCase de base SECRETIS ERP
 *
 * Fournit des helpers pour créer des fixtures cohérentes et des traits
 * pour la gestion multi-tenant dans les tests.
 */
abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    use Traits\TenantHelper;
    use Traits\DatabaseSeeder;

    // -------------------------------------------------------------------------
    // Helpers de création de fixtures
    // -------------------------------------------------------------------------

    /**
     * Crée une organisation de test avec des settings par défaut.
     *
     * @param array $overrides Champs à écraser
     * @param string $status   Status de l'organisation (trial|active|suspended)
     */
    protected function createOrganization(array $overrides = [], string $status = 'trial'): Organization
    {
        $slug = $overrides['slug'] ?? 'org-' . uniqid();

        return Organization::create(array_merge([
            'name'          => 'Organisation Test ' . strtoupper($slug),
            'slug'          => $slug,
            'email'         => "contact@{$slug}.test",
            'country'       => 'CI',
            'timezone'      => 'Africa/Abidjan',
            'status'        => $status,
            'trial_ends_at' => $status === 'trial' ? Carbon::now()->addDays(14) : null,
            'settings'      => [
                'enabled_modules' => ['agenda', 'courrier', 'taches', 'contacts', 'reunions', 'documents'],
                'language'        => 'fr',
            ],
        ], $overrides));
    }

    /**
     * Crée un utilisateur avec un rôle spécifique lié à une organisation.
     *
     * @param Organization $organization L'organisation à laquelle rattacher l'utilisateur
     * @param string       $role         Rôle Spatie (admin_org|gestionnaire|agent|viewer)
     * @param array        $overrides    Champs User à écraser
     */
    protected function createUserWithRole(
        Organization $organization,
        string $role = 'agent',
        array $overrides = []
    ): User {
        $uid = uniqid();

        $user = User::create(array_merge([
            'organization_id' => $organization->id,
            'name'            => "User {$uid}",
            'email'           => "user-{$uid}@test.test",
            'password'        => bcrypt('SecretTest@1234!'),
            'status'          => 'active',
        ], $overrides));

        // Garantir que le rôle existe avant de l'assigner
        $this->ensureRoleExists($role);
        $user->assignRole($role);

        return $user;
    }

    /**
     * Crée une licence active pour une organisation.
     *
     * @param Organization $organization
     * @param int          $durationMonths Durée en mois
     * @param int|null     $paymentId      Optionnel : lier à un paiement fictif
     */
    protected function createActiveLicense(
        Organization $organization,
        int $durationMonths = 1,
        ?int $paymentId = null
    ): License {
        $plan = $this->getOrCreateDefaultPlan();

        $startsAt  = Carbon::now()->subDay(); // Déjà commencée
        $expiresAt = $startsAt->copy()->addMonths($durationMonths)->endOfDay();

        $license = License::create([
            'organization_id' => $organization->id,
            'plan_id'         => $plan->id,
            'payment_id'      => $paymentId ?? random_int(1000, 9999),
            'status'          => 'active',
            'starts_at'       => $startsAt,
            'expires_at'      => $expiresAt,
            'grace_ends_at'   => $expiresAt->copy()->addDays(7),
        ]);

        // Mettre à jour le statut de l'organisation
        $organization->update(['status' => 'active', 'plan_id' => $plan->id]);

        return $license;
    }

    /**
     * Crée une licence expirée avec une période de grâce encore valide.
     */
    protected function createGraceLicense(Organization $organization): License
    {
        $plan = $this->getOrCreateDefaultPlan();

        $expiresAt = Carbon::now()->subDays(3); // Expirée il y a 3 jours

        $license = License::create([
            'organization_id' => $organization->id,
            'plan_id'         => $plan->id,
            'payment_id'      => random_int(1000, 9999),
            'status'          => 'active',
            'starts_at'       => $expiresAt->copy()->subMonth(),
            'expires_at'      => $expiresAt,
            'grace_ends_at'   => $expiresAt->copy()->addDays(7), // Grace de 7 jours → encore valide
        ]);

        return $license;
    }

    /**
     * Crée une licence complètement expirée (hors période de grâce).
     */
    protected function createExpiredLicense(Organization $organization): License
    {
        $plan = $this->getOrCreateDefaultPlan();

        $expiresAt = Carbon::now()->subDays(30);

        $license = License::create([
            'organization_id' => $organization->id,
            'plan_id'         => $plan->id,
            'payment_id'      => random_int(1000, 9999),
            'status'          => 'active',
            'starts_at'       => $expiresAt->copy()->subMonth(),
            'expires_at'      => $expiresAt,
            'grace_ends_at'   => $expiresAt->copy()->addDays(7), // Grace aussi expirée
        ]);

        $organization->update(['status' => 'expired']);

        return $license;
    }

    /**
     * Récupère ou crée le plan tarifaire par défaut pour les tests.
     */
    protected function getOrCreateDefaultPlan(): Plan
    {
        return Plan::firstOrCreate(
            ['slug' => 'starter'],
            [
                'name'          => 'Starter',
                'price'         => 15000,
                'currency'      => 'XOF',
                'billing_cycle' => 'monthly',
                'features'      => ['agenda', 'courrier', 'taches'],
                'max_users'     => 10,
                'is_active'     => true,
            ]
        );
    }

    /**
     * S'assure qu'un rôle Spatie existe, le crée si nécessaire.
     */
    protected function ensureRoleExists(string $roleName): Role
    {
        return Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
    }

    /**
     * Crée un superadmin IBIG avec accès à toutes les organisations.
     */
    protected function createSuperAdmin(): User
    {
        // L'organisation IBIG est l'organisation interne
        $ibigOrg = Organization::firstOrCreate(
            ['slug' => 'ibig-internal'],
            [
                'name'     => 'IBIG Technologies',
                'email'    => 'admin@ibig.tech',
                'country'  => 'CI',
                'timezone' => 'Africa/Abidjan',
                'status'   => 'active',
            ]
        );

        return $this->createUserWithRole($ibigOrg, 'superadmin_ibig', [
            'name'  => 'SuperAdmin IBIG',
            'email' => 'superadmin-' . uniqid() . '@ibig.tech',
        ]);
    }
}
