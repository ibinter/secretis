<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * RolesAndPermissionsSeeder
 *
 * Crée la matrice complète rôles × permissions pour SECRETIS ERP.
 * Ce seeder est IDEMPOTENT : il peut être relancé sans créer de doublons
 * (firstOrCreate est utilisé partout).
 *
 * Modules couverts :
 *   agenda, courrier, taches, contacts, reunions,
 *   documents, rh, communication, rapports, administration
 *
 * Rôles :
 *   superadmin_ibig, admin_org, director, secretary, assistant,
 *   admin_responsible, receptionist, communication_officer, auditor, operator
 */
class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Tous les modules et leurs actions disponibles.
     */
    private array $modules = [
        'agenda'         => ['view', 'create', 'edit', 'delete', 'export', 'share'],
        'courrier'       => ['view', 'create', 'edit', 'delete', 'export', 'archive', 'assign'],
        'taches'         => ['view', 'create', 'edit', 'delete', 'assign', 'complete', 'export'],
        'contacts'       => ['view', 'create', 'edit', 'delete', 'export', 'import'],
        'reunions'       => ['view', 'create', 'edit', 'delete', 'invite', 'export'],
        'documents'      => ['view', 'create', 'edit', 'delete', 'download', 'share', 'archive'],
        'rh'             => ['view', 'create', 'edit', 'delete', 'export', 'manage_leave'],
        'communication'  => ['view', 'create', 'edit', 'delete', 'publish', 'broadcast'],
        'rapports'       => ['view', 'create', 'export', 'schedule'],
        'administration' => ['view', 'manage_users', 'manage_roles', 'manage_settings', 'manage_billing', 'view_audit'],
    ];

    /**
     * Définition des permissions par rôle.
     * Format : 'role' => ['module.action', ...]
     */
    private array $rolePermissions = [
        // -----------------------------------------------------------------------
        // superadmin_ibig — Accès total plateforme (employés IBIG uniquement)
        // Géré via isSuperAdmin() dans le code, pas besoin d'assigner toutes les perms
        // -----------------------------------------------------------------------
        'superadmin_ibig' => ['*'], // wildcard symbolique — géré dans le code

        // -----------------------------------------------------------------------
        // admin_org — Administrateur de l'organisation cliente
        // Accès complet à tous les modules de son organisation
        // -----------------------------------------------------------------------
        'admin_org' => [
            'agenda.*', 'courrier.*', 'taches.*', 'contacts.*', 'reunions.*',
            'documents.*', 'rh.*', 'communication.*', 'rapports.*', 'administration.*',
        ],

        // -----------------------------------------------------------------------
        // director — Directeur : vue globale + validation
        // -----------------------------------------------------------------------
        'director' => [
            'agenda.view', 'agenda.create', 'agenda.edit', 'agenda.delete', 'agenda.export', 'agenda.share',
            'courrier.view', 'courrier.create', 'courrier.edit', 'courrier.delete', 'courrier.export', 'courrier.archive', 'courrier.assign',
            'taches.view', 'taches.create', 'taches.edit', 'taches.delete', 'taches.assign', 'taches.complete', 'taches.export',
            'contacts.view', 'contacts.create', 'contacts.edit', 'contacts.delete', 'contacts.export',
            'reunions.view', 'reunions.create', 'reunions.edit', 'reunions.delete', 'reunions.invite', 'reunions.export',
            'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.download', 'documents.share', 'documents.archive',
            'rh.view', 'rh.export', 'rh.manage_leave',
            'communication.view', 'communication.create', 'communication.publish', 'communication.broadcast',
            'rapports.view', 'rapports.create', 'rapports.export', 'rapports.schedule',
            'administration.view', 'administration.view_audit',
        ],

        // -----------------------------------------------------------------------
        // secretary — Secrétaire : gestion opérationnelle complète
        // -----------------------------------------------------------------------
        'secretary' => [
            'agenda.view', 'agenda.create', 'agenda.edit', 'agenda.delete', 'agenda.share',
            'courrier.view', 'courrier.create', 'courrier.edit', 'courrier.archive', 'courrier.assign',
            'taches.view', 'taches.create', 'taches.edit', 'taches.complete', 'taches.assign',
            'contacts.view', 'contacts.create', 'contacts.edit',
            'reunions.view', 'reunions.create', 'reunions.edit', 'reunions.invite',
            'documents.view', 'documents.create', 'documents.edit', 'documents.download', 'documents.share',
            'communication.view', 'communication.create',
            'rapports.view',
        ],

        // -----------------------------------------------------------------------
        // assistant — Assistant de secrétariat : opérations de base
        // -----------------------------------------------------------------------
        'assistant' => [
            'agenda.view', 'agenda.create', 'agenda.edit',
            'courrier.view', 'courrier.create',
            'taches.view', 'taches.create', 'taches.complete',
            'contacts.view', 'contacts.create',
            'reunions.view', 'reunions.create', 'reunions.invite',
            'documents.view', 'documents.download',
            'communication.view',
            'rapports.view',
        ],

        // -----------------------------------------------------------------------
        // admin_responsible — Responsable administratif
        // -----------------------------------------------------------------------
        'admin_responsible' => [
            'agenda.view', 'agenda.create', 'agenda.edit', 'agenda.export',
            'courrier.view', 'courrier.create', 'courrier.edit', 'courrier.export', 'courrier.assign',
            'taches.view', 'taches.create', 'taches.edit', 'taches.assign', 'taches.export',
            'contacts.view', 'contacts.create', 'contacts.edit', 'contacts.export', 'contacts.import',
            'reunions.view', 'reunions.create', 'reunions.edit', 'reunions.invite', 'reunions.export',
            'documents.view', 'documents.create', 'documents.edit', 'documents.download', 'documents.archive',
            'rh.view', 'rh.manage_leave',
            'communication.view', 'communication.create',
            'rapports.view', 'rapports.create', 'rapports.export',
            'administration.view',
        ],

        // -----------------------------------------------------------------------
        // receptionist — Réceptionniste : accueil et agenda
        // -----------------------------------------------------------------------
        'receptionist' => [
            'agenda.view', 'agenda.create', 'agenda.edit',
            'contacts.view', 'contacts.create',
            'courrier.view', 'courrier.create',
            'reunions.view',
            'documents.view', 'documents.download',
            'communication.view',
        ],

        // -----------------------------------------------------------------------
        // communication_officer — Chargé de communication
        // -----------------------------------------------------------------------
        'communication_officer' => [
            'agenda.view',
            'contacts.view', 'contacts.create', 'contacts.edit', 'contacts.export',
            'documents.view', 'documents.create', 'documents.download', 'documents.share',
            'communication.view', 'communication.create', 'communication.edit', 'communication.publish', 'communication.broadcast',
            'rapports.view',
        ],

        // -----------------------------------------------------------------------
        // auditor — Auditeur interne : lecture seule + exports + audit
        // -----------------------------------------------------------------------
        'auditor' => [
            'agenda.view', 'agenda.export',
            'courrier.view', 'courrier.export',
            'taches.view', 'taches.export',
            'contacts.view', 'contacts.export',
            'reunions.view', 'reunions.export',
            'documents.view', 'documents.download',
            'rh.view', 'rh.export',
            'communication.view',
            'rapports.view', 'rapports.create', 'rapports.export',
            'administration.view', 'administration.view_audit',
        ],

        // -----------------------------------------------------------------------
        // operator — Opérateur de saisie : accès minimal en saisie
        // -----------------------------------------------------------------------
        'operator' => [
            'agenda.view',
            'courrier.view', 'courrier.create',
            'taches.view', 'taches.complete',
            'contacts.view',
            'documents.view', 'documents.download',
        ],
    ];

    public function run(): void
    {
        // Vider le cache des permissions Spatie
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Créer toutes les permissions
        $this->createAllPermissions();

        // 2. Créer les rôles et assigner leurs permissions
        $this->createRolesWithPermissions();

        $this->command->info('Rôles et permissions SECRETIS créés avec succès.');
    }

    private function createAllPermissions(): void
    {
        $this->command->info('Création des permissions...');

        foreach ($this->modules as $module => $actions) {
            foreach ($actions as $action) {
                $name = "{$module}.{$action}";
                Permission::firstOrCreate(
                    ['name' => $name, 'guard_name' => 'web'],
                    ['description' => "Module {$module} : {$action}"]
                );
            }
        }

        $this->command->info('Permissions créées : ' . Permission::count());
    }

    private function createRolesWithPermissions(): void
    {
        $this->command->info('Création des rôles...');

        foreach ($this->rolePermissions as $roleName => $permissionPatterns) {
            $role = Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'web'],
                ['description' => $this->getRoleDescription($roleName)]
            );

            // superadmin_ibig : pas de permissions Spatie, géré dans le code
            if ($roleName === 'superadmin_ibig') {
                $this->command->line("  Rôle {$roleName} créé (accès total via code)");
                continue;
            }

            // Résoudre les wildcards (ex: "agenda.*")
            $resolvedPermissions = $this->resolvePermissions($permissionPatterns);

            $role->syncPermissions($resolvedPermissions);

            $this->command->line("  Rôle {$roleName} : " . count($resolvedPermissions) . ' permissions');
        }
    }

    /**
     * Résout les patterns de permissions (inclut les wildcards module.*).
     *
     * @param  string[]  $patterns
     * @return string[]
     */
    private function resolvePermissions(array $patterns): array
    {
        $resolved = [];

        foreach ($patterns as $pattern) {
            if (str_ends_with($pattern, '.*')) {
                $module = str_replace('.*', '', $pattern);

                if (isset($this->modules[$module])) {
                    foreach ($this->modules[$module] as $action) {
                        $resolved[] = "{$module}.{$action}";
                    }
                }
            } else {
                $resolved[] = $pattern;
            }
        }

        return array_unique($resolved);
    }

    private function getRoleDescription(string $role): string
    {
        return match ($role) {
            'superadmin_ibig'        => 'Super-administrateur IBIG — Accès total plateforme',
            'admin_org'              => 'Administrateur organisation — Accès complet au tenant',
            'director'               => 'Directeur — Vue globale et validation',
            'secretary'              => 'Secrétaire — Gestion opérationnelle complète',
            'assistant'              => 'Assistant de secrétariat — Opérations de base',
            'admin_responsible'      => 'Responsable administratif — Gestion avancée',
            'receptionist'           => 'Réceptionniste — Accueil et agenda',
            'communication_officer'  => 'Chargé de communication — Communication externe',
            'auditor'                => 'Auditeur interne — Lecture seule et audit',
            'operator'               => 'Opérateur de saisie — Accès minimal',
            default                  => $role,
        };
    }
}
