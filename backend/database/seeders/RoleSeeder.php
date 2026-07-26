<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('  > RoleSeeder : creation des 10 roles SECRETIS...');

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $guard = 'web';

        // ── Helpers ───────────────────────────────────────────────────────────

        /**
         * Retourne toutes les permissions dont le nom correspond aux patterns donnés.
         * Supporte le wildcard '*' en fin : ex. 'view.*' => toutes les permissions view.xxx
         */
        $perms = function (array $patterns) use ($guard): array {
            $all = Permission::where('guard_name', $guard)->pluck('name')->toArray();
            $matched = [];
            foreach ($patterns as $pattern) {
                if (str_ends_with($pattern, '.*')) {
                    $prefix = rtrim($pattern, '*');
                    foreach ($all as $p) {
                        if (str_starts_with($p, $prefix)) {
                            $matched[] = $p;
                        }
                    }
                } else {
                    if (in_array($pattern, $all)) {
                        $matched[] = $pattern;
                    }
                }
            }
            return array_unique($matched);
        };

        $allPerms = Permission::where('guard_name', $guard)->pluck('name')->toArray();

        // ── Définition des rôles ──────────────────────────────────────────────
        $roles = [

            // 1. Super Admin IBIG Soft — toutes les permissions
            [
                'name'  => 'superadmin_ibig',
                'label' => 'Super Administrateur IBIG Soft',
                'perms' => $allPerms,
            ],

            // 2. Admin Organisation — tout sauf superadmin et crm IBIG
            [
                'name'  => 'admin_organisation',
                'label' => 'Administrateur Organisation',
                'perms' => array_values(array_filter($allPerms, fn($p) =>
                    $p !== 'manage.superadmin' && $p !== 'manage.crm'
                )),
            ],

            // 3. Dirigeant — lecture sur tout + manage settings
            [
                'name'  => 'dirigeant',
                'label' => 'Dirigeant / Directeur Général',
                'perms' => $perms([
                    'view.*',
                    'export.*',
                    'manage.settings',
                    'manage.users',
                    'manage.roles',
                ]),
            ],

            // 4. Secrétaire de Direction — modules 1-6 + rapports
            [
                'name'  => 'secretaire_direction',
                'label' => 'Secrétaire de Direction',
                'perms' => $perms([
                    // Agenda
                    'view.events', 'create.events', 'edit.events', 'delete.events',
                    'view.rooms', 'view.reservations', 'create.reservations', 'edit.reservations',
                    // Courrier & Documents
                    'view.courriers', 'create.courriers', 'edit.courriers', 'delete.courriers', 'export.courriers',
                    'view.documents', 'create.documents', 'edit.documents', 'delete.documents', 'export.documents',
                    'view.folders', 'create.folders', 'edit.folders',
                    'view.templates', 'create.templates',
                    'validate.courriers', 'validate.documents',
                    // Réunions
                    'view.meetings', 'create.meetings', 'edit.meetings', 'delete.meetings',
                    'view.minutes', 'create.minutes', 'edit.minutes',
                    // Tâches
                    'view.tasks', 'create.tasks', 'edit.tasks',
                    'view.projects',
                    // Communication
                    'view.messages', 'create.messages', 'edit.messages',
                    'view.circulaires', 'create.circulaires',
                    'view.contacts', 'create.contacts', 'edit.contacts',
                    'view.announcements', 'create.announcements',
                    // Visiteurs
                    'view.visitors', 'create.visitors', 'edit.visitors',
                    'view.invitations', 'create.invitations',
                    // Rapports
                    'view.reports', 'view.dashboards',
                ]),
            ],

            // 5. Assistante de Direction — agenda, tâches, courrier, communication, documents (view + create)
            [
                'name'  => 'assistante_direction',
                'label' => 'Assistante de Direction',
                'perms' => $perms([
                    'view.events', 'create.events', 'edit.events',
                    'view.reservations', 'create.reservations',
                    'view.rooms',
                    'view.courriers', 'create.courriers', 'edit.courriers',
                    'view.documents', 'create.documents', 'edit.documents',
                    'view.folders', 'create.folders',
                    'view.meetings', 'create.meetings',
                    'view.minutes', 'create.minutes',
                    'view.tasks', 'create.tasks', 'edit.tasks',
                    'view.messages', 'create.messages',
                    'view.contacts',
                    'view.announcements',
                    'view.reports', 'view.dashboards',
                ]),
            ],

            // 6. Responsable Administratif — tous modules + export + validate
            [
                'name'  => 'responsable_admin',
                'label' => 'Responsable Administratif',
                'perms' => $perms([
                    'view.*', 'create.*', 'edit.*', 'delete.*',
                    'validate.*', 'export.*', 'import.*',
                ]),
            ],

            // 7. Agent d'Accueil — visiteurs + annuaire contacts
            [
                'name'  => 'agent_accueil',
                'label' => "Agent d'Accueil",
                'perms' => $perms([
                    'view.visitors', 'create.visitors', 'edit.visitors',
                    'view.invitations', 'create.invitations', 'edit.invitations',
                    'view.contacts',
                    'view.announcements',
                ]),
            ],

            // 8. Chargé de Communication — messages, circulaires, annonces
            [
                'name'  => 'charge_communication',
                'label' => 'Chargé de Communication',
                'perms' => $perms([
                    'view.messages', 'create.messages', 'edit.messages', 'delete.messages',
                    'view.circulaires', 'create.circulaires', 'edit.circulaires', 'delete.circulaires',
                    'view.announcements', 'create.announcements', 'edit.announcements', 'delete.announcements',
                    'view.contacts', 'create.contacts', 'edit.contacts',
                    'view.documents',
                    'view.reports',
                ]),
            ],

            // 9. Auditeur — lecture seule sur TOUT
            [
                'name'  => 'auditeur',
                'label' => 'Auditeur (lecture seule)',
                'perms' => $perms(['view.*', 'export.*']),
            ],

            // 10. Agent Opérationnel — tâches, messages, documents (view + create)
            [
                'name'  => 'agent_operationnel',
                'label' => 'Agent Opérationnel',
                'perms' => $perms([
                    'view.tasks', 'create.tasks', 'edit.tasks',
                    'view.projects',
                    'view.messages', 'create.messages',
                    'view.documents', 'create.documents',
                    'view.folders',
                    'view.announcements',
                    'view.contacts',
                    'view.timesheets', 'create.timesheets',
                ]),
            ],
        ];

        // ── Création et assignation des permissions ───────────────────────────
        foreach ($roles as $def) {
            $role = Role::firstOrCreate(
                ['name' => $def['name'], 'guard_name' => $guard],
                ['name' => $def['name'], 'guard_name' => $guard]
            );

            // Synchroniser les permissions (remplace les anciennes)
            $role->syncPermissions($def['perms']);

            $count = count($def['perms']);
            $this->command->info("    OK : role [{$def['name']}] — {$count} permissions.");
        }

        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $this->command->info('    OK : 10 roles crees et configures.');
    }
}
