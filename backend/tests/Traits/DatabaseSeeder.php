<?php

namespace Tests\Traits;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * DatabaseSeeder — Seed minimal pour les tests
 *
 * Ce trait initialise les données de référence indispensables (plans, rôles,
 * permissions) avant chaque suite de tests. Cela évite de dépendre du seeder
 * complet qui peut être lent.
 */
trait DatabaseSeeder
{
    /**
     * Initialise le seed minimal pour les tests.
     * À appeler dans setUp() ou au début du test en cas de besoin.
     */
    protected function seedForTests(): void
    {
        $this->seedRoles();
        $this->seedPermissions();
        $this->seedPlans();
    }

    /**
     * Crée les rôles SECRETIS.
     */
    protected function seedRoles(): void
    {
        $roles = [
            'superadmin_ibig', // Admin plateforme IBIG (accès toutes orgs)
            'admin_org',       // Administrateur d'une organisation
            'gestionnaire',    // Gestionnaire (droits élargis)
            'agent',           // Agent (droits standard)
            'viewer',          // Lecteur seul
        ];

        foreach ($roles as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }
    }

    /**
     * Crée les permissions SECRETIS par module.
     */
    protected function seedPermissions(): void
    {
        $modules = ['agenda', 'courrier', 'taches', 'contacts', 'reunions', 'documents', 'billing', 'users'];
        $actions = ['view', 'create', 'update', 'delete', 'export', 'manage'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate([
                    'name'       => "{$module}.{$action}",
                    'guard_name' => 'web',
                ]);
            }
        }

        // Assigner toutes les permissions à superadmin_ibig et admin_org
        $allPermissions = Permission::all();

        $superadminRole = Role::where('name', 'superadmin_ibig')->first();
        $adminOrgRole   = Role::where('name', 'admin_org')->first();
        $gestionnaireRole = Role::where('name', 'gestionnaire')->first();

        $superadminRole?->syncPermissions($allPermissions);
        $adminOrgRole?->syncPermissions($allPermissions);

        // Gestionnaire : tout sauf billing et users.manage
        $gestionnairePermissions = $allPermissions->reject(
            fn($p) => in_array($p->name, ['billing.manage', 'users.manage', 'users.delete'])
        );
        $gestionnaireRole?->syncPermissions($gestionnairePermissions);

        // Agent : view et create sur modules opérationnels
        $agentRole = Role::where('name', 'agent')->first();
        $agentPermissions = $allPermissions->filter(
            fn($p) => in_array(explode('.', $p->name)[1] ?? '', ['view', 'create', 'update'])
                   && !str_starts_with($p->name, 'billing')
                   && !str_starts_with($p->name, 'users')
        );
        $agentRole?->syncPermissions($agentPermissions);

        // Viewer : uniquement view
        $viewerRole = Role::where('name', 'viewer')->first();
        $viewerPermissions = $allPermissions->filter(
            fn($p) => str_ends_with($p->name, '.view')
        );
        $viewerRole?->syncPermissions($viewerPermissions);
    }

    /**
     * Crée les plans tarifaires de référence.
     */
    protected function seedPlans(): void
    {
        $plans = [
            [
                'name'          => 'Starter',
                'slug'          => 'starter',
                'price'         => 15000,
                'currency'      => 'XOF',
                'billing_cycle' => 'monthly',
                'max_users'     => 10,
                'features'      => ['agenda', 'courrier', 'taches'],
                'is_active'     => true,
            ],
            [
                'name'          => 'Professional',
                'slug'          => 'professional',
                'price'         => 35000,
                'currency'      => 'XOF',
                'billing_cycle' => 'monthly',
                'max_users'     => 50,
                'features'      => ['agenda', 'courrier', 'taches', 'reunions', 'documents', 'contacts'],
                'is_active'     => true,
            ],
            [
                'name'          => 'Enterprise',
                'slug'          => 'enterprise',
                'price'         => 75000,
                'currency'      => 'XOF',
                'billing_cycle' => 'monthly',
                'max_users'     => 999,
                'features'      => ['agenda', 'courrier', 'taches', 'reunions', 'documents', 'contacts', 'projets', 'api'],
                'is_active'     => true,
            ],
        ];

        foreach ($plans as $planData) {
            \App\Models\Plan::firstOrCreate(
                ['slug' => $planData['slug']],
                $planData
            );
        }
    }
}
