<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionSeeder extends Seeder
{
    /**
     * Crée toutes les permissions SECRETIS au format {action}.{resource}
     * via Spatie Laravel Permission.
     */
    public function run(): void
    {
        $this->command->info('  > PermissionSeeder : creation des permissions RBAC...');

        // Vider le cache Spatie avant
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $guard = 'web';

        // ── Actions standard ──────────────────────────────────────────────────
        $actions = ['view', 'create', 'edit', 'delete', 'validate', 'export', 'import', 'manage'];

        // ── Resources par module ──────────────────────────────────────────────
        $resources = [
            // Module 1 — Agenda & Réservations
            'events', 'rooms', 'reservations',

            // Module 2 — Courrier & Documents
            'courriers', 'documents', 'folders', 'templates', 'workflows',

            // Module 3 — Réunions & Comptes-rendus
            'meetings', 'minutes',

            // Module 4 — Tâches & Projets
            'tasks', 'projects', 'timesheets',

            // Module 5 — Communication interne
            'messages', 'circulaires', 'contacts', 'announcements',

            // Module 6 — Visiteurs & Accueil
            'visitors', 'invitations', 'geofences',

            // Module 7 — Patrimoine & Flotte
            'rooms_config', 'inventory', 'vehicles', 'fleet',

            // Module 8 — Ressources Humaines
            'employees', 'leaves', 'expenses', 'schedules',

            // Module 9 — Rapports & BI
            'reports', 'dashboards', 'bi',

            // Module 10 — Paramètres & Administration
            'settings', 'users', 'roles', 'integrations', 'api_keys',

            // Comptabilité générale
            'accounting', 'invoices', 'expenses_accounting', 'quotes',

            // SYSCOHADA & Fiscal
            'syscohada', 'fiscal_years', 'tax_declarations',

            // Budget
            'budgets', 'budget_lines',

            // Achats & Fournisseurs
            'suppliers', 'purchase_orders', 'rfqs',

            // Module Qualité ISO 9001
            'nonconformities', 'audits', 'quality_indicators',

            // Module Formation e-learning
            'training_courses', 'live_sessions', 'scorm',

            // Modules transversaux
            'sara',           // SARA IA agentique
            'signatures',     // Signatures électroniques
            'automations',    // Automatisations
            'gdpr_data',      // RGPD — données personnelles
            'licenses',       // Gestion des licences (SuperAdmin)
        ];

        // ── Permissions spéciales (non {action}.{resource}) ───────────────────
        $specialPermissions = [
            'manage.superadmin',  // Accès total SuperAdmin IBIG Soft
            'manage.crm',         // CRM SuperAdmin (prospects, clients, deals)
        ];

        $count = 0;

        // Génération croisée actions × resources
        foreach ($actions as $action) {
            foreach ($resources as $resource) {
                $name = "{$action}.{$resource}";
                Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
                $count++;
            }
        }

        // Permissions spéciales
        foreach ($specialPermissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
            $count++;
        }

        $this->command->info("    OK : {$count} permissions creees (guard={$guard}).");
    }
}
