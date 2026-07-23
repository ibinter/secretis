<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

/**
 * E2ESeeder
 *
 * Crée une organisation de test isolée (id=999) et les 10 utilisateurs
 * correspondant aux 10 rôles de la matrice SECRETIS, plus quelques
 * données de contexte par module.
 *
 * Usage :
 *   php artisan db:seed --class=E2ESeeder --env=testing
 *
 * Ce seeder est IDEMPOTENT : il peut être relancé sans créer de doublons.
 * Toutes les entités créées sont marquées is_test_data=true pour faciliter
 * le nettoyage via CleanE2EData.
 *
 * IMPORTANT : Ne doit s'exécuter qu'en environnement testing/staging.
 */
class E2ESeeder extends Seeder
{
    /** ID fixe de l'organisation E2E — ne doit pas changer entre les runs */
    private const E2E_ORG_ID = 999;
    private const E2E_ORG_SLUG = 'e2e-secretis-demo';

    /** Données des 10 utilisateurs de test */
    private array $testUsers = [
        [
            'email'        => 'superadmin@ibigsoft.com',
            'name'         => 'Super Admin IBIG',
            'role'         => 'superadmin_ibig',
            'password'     => 'Password123!',
            'is_superadmin' => true,
        ],
        [
            'email'    => 'admin@demo-secretis.ci',
            'name'     => 'Administrateur Demo',
            'role'     => 'admin_org',
            'password' => 'Password123!',
        ],
        [
            'email'    => 'dirigeant@demo-secretis.ci',
            'name'     => 'Directeur Général Demo',
            'role'     => 'director',
            'password' => 'Password123!',
        ],
        [
            'email'    => 'secretaire@demo-secretis.ci',
            'name'     => 'Secrétaire Demo',
            'role'     => 'secretary',
            'password' => 'Password123!',
        ],
        [
            'email'    => 'auditeur@demo-secretis.ci',
            'name'     => 'Auditeur Interne Demo',
            'role'     => 'auditor',
            'password' => 'Password123!',
        ],
        [
            'email'    => 'rh@demo-secretis.ci',
            'name'     => 'Responsable RH Demo',
            'role'     => 'admin_responsible',
            'password' => 'Password123!',
        ],
        [
            'email'    => 'comptable@demo-secretis.ci',
            'name'     => 'Comptable Demo',
            'role'     => 'comptable',
            'password' => 'Password123!',
        ],
        [
            'email'    => 'chef_projet@demo-secretis.ci',
            'name'     => 'Chef de Projet Demo',
            'role'     => 'chef_projet',
            'password' => 'Password123!',
        ],
        [
            'email'    => 'qualite@demo-secretis.ci',
            'name'     => 'Technicien Qualité Demo',
            'role'     => 'technicien_qualite',
            'password' => 'Password123!',
        ],
        [
            'email'    => 'visiteur@demo-secretis.ci',
            'name'     => 'Visiteur Externe Demo',
            'role'     => 'visiteur_externe',
            'password' => 'Password123!',
        ],
    ];

    // -------------------------------------------------------------------------
    // Point d'entrée
    // -------------------------------------------------------------------------

    public function run(): void
    {
        $this->ensureTestEnvironment();

        $this->command->info('[E2ESeeder] Démarrage du seeder E2E...');

        DB::transaction(function () {
            $org = $this->createOrganization();
            $users = $this->createUsers($org);
            $this->createCalendarEvents($org, $users);
            $this->createTasks($org, $users);
            $this->createCourrier($org);
            $this->createVisitors($org);
            $this->createMeetings($org, $users);
            $this->createDocuments($org);
            $this->createNotifications($org, $users);
        });

        $this->command->info('[E2ESeeder] Seeder E2E terminé avec succès.');
    }

    // -------------------------------------------------------------------------
    // Garde-fou : uniquement en environnement de test
    // -------------------------------------------------------------------------

    private function ensureTestEnvironment(): void
    {
        $env = app()->environment();
        if (! in_array($env, ['testing', 'test', 'staging', 'local'], true)) {
            $this->command->error(
                "[E2ESeeder] REFUSÉ : Environnement '{$env}' non autorisé. " .
                'Ce seeder ne doit s\'exécuter qu\'en testing/staging/local.'
            );
            exit(1);
        }
    }

    // -------------------------------------------------------------------------
    // Organisation
    // -------------------------------------------------------------------------

    private function createOrganization(): Organization
    {
        $this->command->info('[E2ESeeder] Création de l\'organisation E2E...');

        $org = Organization::withoutEvents(function () {
            return Organization::updateOrCreate(
                ['id' => self::E2E_ORG_ID],
                [
                    'name'         => 'SECRETIS Demo E2E',
                    'slug'         => self::E2E_ORG_SLUG,
                    'country'      => 'CI',
                    'timezone'     => 'Africa/Abidjan',
                    'currency'     => 'XOF',
                    'language'     => 'fr',
                    'status'       => 'active',
                    'plan'         => 'enterprise',
                    'is_test_data' => true,
                    'license_expires_at' => Carbon::now()->addYear(),
                    'settings'     => json_encode([
                        'modules' => [
                            'agenda', 'courrier', 'ged', 'taches', 'reunions',
                            'visiteurs', 'rh', 'comptabilite', 'projets',
                            'qualite', 'sara', 'academie', 'bi',
                        ],
                        'max_users'      => 50,
                        'max_storage_gb' => 100,
                    ]),
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]
            );
        });

        $this->command->info("[E2ESeeder] Organisation créée : {$org->name} (id={$org->id})");

        return $org;
    }

    // -------------------------------------------------------------------------
    // Utilisateurs — 10 rôles
    // -------------------------------------------------------------------------

    private function createUsers(Organization $org): array
    {
        $this->command->info('[E2ESeeder] Création des 10 utilisateurs de test...');
        $users = [];

        foreach ($this->testUsers as $userData) {
            $isSuperadmin = $userData['is_superadmin'] ?? false;

            $user = User::withoutEvents(function () use ($userData, $org, $isSuperadmin) {
                return User::updateOrCreate(
                    ['email' => $userData['email']],
                    [
                        'name'            => $userData['name'],
                        'password'        => Hash::make($userData['password']),
                        'organization_id' => $isSuperadmin ? null : $org->id,
                        'status'          => 'active',
                        'is_test_data'    => true,
                        'email_verified_at' => Carbon::now(),
                        'created_at'      => Carbon::now(),
                        'updated_at'      => Carbon::now(),
                    ]
                );
            });

            // Assigner le rôle Spatie (créer s'il n'existe pas)
            $roleName = $userData['role'];
            $role = Role::firstOrCreate(
                ['name' => $roleName, 'guard_name' => 'web']
            );
            $user->syncRoles([$roleName]);

            $this->command->info("  - {$user->email} → rôle {$roleName}");
            $users[$roleName] = $user;
        }

        return $users;
    }

    // -------------------------------------------------------------------------
    // Événements d'agenda
    // -------------------------------------------------------------------------

    private function createCalendarEvents(Organization $org, array $users): void
    {
        $this->command->info('[E2ESeeder] Création des événements de test...');

        $secretary = $users['secretary'] ?? collect($users)->first();
        $baseDate = Carbon::now()->addDays(1);

        $events = [
            ['title' => 'Réunion de direction mensuelle', 'days' => 1, 'start' => '09:00', 'end' => '10:30'],
            ['title' => 'Formation SYSCOHADA', 'days' => 2, 'start' => '14:00', 'end' => '16:00'],
            ['title' => 'Revue de projet Q3', 'days' => 3, 'start' => '10:00', 'end' => '11:30'],
            ['title' => 'Comité qualité mensuel', 'days' => 5, 'start' => '08:30', 'end' => '09:30'],
            ['title' => 'Point hebdomadaire équipe', 'days' => 7, 'start' => '11:00', 'end' => '12:00'],
        ];

        foreach ($events as $eventData) {
            DB::table('events')->updateOrInsert(
                [
                    'title'           => $eventData['title'],
                    'organization_id' => $org->id,
                ],
                [
                    'organization_id' => $org->id,
                    'calendar_id'     => 1,
                    'title'           => $eventData['title'],
                    'start'           => Carbon::parse($baseDate->copy()->addDays($eventData['days'])->format('Y-m-d') . ' ' . $eventData['start']),
                    'end'             => Carbon::parse($baseDate->copy()->addDays($eventData['days'])->format('Y-m-d') . ' ' . $eventData['end']),
                    'created_by'      => $secretary?->id ?? 1,
                    'status'          => 'confirmed',
                    'is_test_data'    => true,
                    'created_at'      => Carbon::now(),
                    'updated_at'      => Carbon::now(),
                ]
            );
        }
    }

    // -------------------------------------------------------------------------
    // Tâches
    // -------------------------------------------------------------------------

    private function createTasks(Organization $org, array $users): void
    {
        $this->command->info('[E2ESeeder] Création des tâches de test...');

        $secretary = $users['secretary'] ?? collect($users)->first();
        $admin = $users['admin_org'] ?? collect($users)->first();

        $tasks = [
            ['title' => 'Préparer le rapport mensuel', 'status' => 'todo', 'priority' => 'high'],
            ['title' => 'Archiver le courrier de juin', 'status' => 'in_progress', 'priority' => 'medium'],
            ['title' => 'Mettre à jour les fiches de poste', 'status' => 'todo', 'priority' => 'low'],
            ['title' => 'Réservation salle de conférence', 'status' => 'done', 'priority' => 'medium'],
            ['title' => 'Révision procédures ISO 9001', 'status' => 'todo', 'priority' => 'high'],
        ];

        foreach ($tasks as $taskData) {
            DB::table('tasks')->updateOrInsert(
                [
                    'title'           => $taskData['title'],
                    'organization_id' => $org->id,
                ],
                array_merge($taskData, [
                    'organization_id' => $org->id,
                    'created_by'      => $admin?->id ?? 1,
                    'assigned_to'     => $secretary?->id ?? null,
                    'is_test_data'    => true,
                    'due_date'        => Carbon::now()->addDays(rand(3, 14)),
                    'created_at'      => Carbon::now(),
                    'updated_at'      => Carbon::now(),
                ])
            );
        }
    }

    // -------------------------------------------------------------------------
    // Courrier
    // -------------------------------------------------------------------------

    private function createCourrier(Organization $org): void
    {
        $this->command->info('[E2ESeeder] Création du courrier de test...');

        $letters = [
            [
                'subject'  => 'Demande de partenariat commercial',
                'type'     => 'incoming',
                'sender'   => 'SOTRA Abidjan',
                'status'   => 'pending',
                'priority' => 'high',
            ],
            [
                'subject'  => 'Renouvellement contrat maintenance',
                'type'     => 'outgoing',
                'recipient' => 'Prestataire Informatique CI',
                'status'   => 'processed',
                'priority' => 'normal',
            ],
            [
                'subject'  => 'Convocation assemblée générale',
                'type'     => 'internal',
                'status'   => 'in_progress',
                'priority' => 'high',
            ],
            [
                'subject'  => 'Note de service — congés annuels',
                'type'     => 'internal',
                'status'   => 'processed',
                'priority' => 'normal',
            ],
        ];

        foreach ($letters as $i => $letterData) {
            DB::table('mail_registry')->updateOrInsert(
                [
                    'subject'         => $letterData['subject'],
                    'organization_id' => $org->id,
                ],
                array_merge($letterData, [
                    'organization_id' => $org->id,
                    'reference'       => 'E2E-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                    'received_at'     => Carbon::now()->subDays(rand(1, 30)),
                    'is_test_data'    => true,
                    'created_at'      => Carbon::now(),
                    'updated_at'      => Carbon::now(),
                ])
            );
        }
    }

    // -------------------------------------------------------------------------
    // Visiteurs
    // -------------------------------------------------------------------------

    private function createVisitors(Organization $org): void
    {
        $this->command->info('[E2ESeeder] Création des visiteurs de test...');

        $visitors = [
            ['name' => 'Konan Yao Rodrigue', 'company' => 'BICICI', 'status' => 'checked_out'],
            ['name' => 'Adjoua Marie-France', 'company' => 'Ministère du Commerce', 'status' => 'checked_in'],
            ['name' => 'Traoré Ibrahim', 'company' => 'Orange CI', 'status' => 'scheduled'],
        ];

        foreach ($visitors as $visitorData) {
            DB::table('visitors')->updateOrInsert(
                [
                    'name'            => $visitorData['name'],
                    'organization_id' => $org->id,
                ],
                array_merge($visitorData, [
                    'organization_id' => $org->id,
                    'phone'           => '+225 01 23 45 67 89',
                    'host'            => 'Directeur Général Demo',
                    'reason'          => 'Réunion d\'affaires',
                    'check_in_at'     => Carbon::now()->subHours(rand(1, 5)),
                    'qr_token'        => \Illuminate\Support\Str::uuid(),
                    'is_test_data'    => true,
                    'created_at'      => Carbon::now(),
                    'updated_at'      => Carbon::now(),
                ])
            );
        }
    }

    // -------------------------------------------------------------------------
    // Réunions
    // -------------------------------------------------------------------------

    private function createMeetings(Organization $org, array $users): void
    {
        $this->command->info('[E2ESeeder] Création des réunions de test...');

        $admin = $users['admin_org'] ?? collect($users)->first();

        $meetings = [
            ['title' => 'Comité de direction Q3 2026', 'date' => Carbon::now()->addDays(7)],
            ['title' => 'Réunion équipe IT', 'date' => Carbon::now()->addDays(3)],
        ];

        foreach ($meetings as $meetingData) {
            DB::table('meetings')->updateOrInsert(
                [
                    'title'           => $meetingData['title'],
                    'organization_id' => $org->id,
                ],
                [
                    'organization_id' => $org->id,
                    'title'           => $meetingData['title'],
                    'scheduled_at'    => $meetingData['date'],
                    'duration_minutes' => 60,
                    'organizer_id'    => $admin?->id ?? 1,
                    'status'          => 'scheduled',
                    'location'        => 'Salle de conférence A',
                    'is_test_data'    => true,
                    'created_at'      => Carbon::now(),
                    'updated_at'      => Carbon::now(),
                ]
            );
        }
    }

    // -------------------------------------------------------------------------
    // Documents GED
    // -------------------------------------------------------------------------

    private function createDocuments(Organization $org): void
    {
        $this->command->info('[E2ESeeder] Création des documents de test...');

        $docs = [
            ['name' => 'Procédure qualité ISO 9001 v2.3', 'type' => 'pdf'],
            ['name' => 'Rapport financier S1 2026', 'type' => 'xlsx'],
            ['name' => 'Manuel d\'utilisation SECRETIS', 'type' => 'pdf'],
        ];

        foreach ($docs as $docData) {
            DB::table('documents')->updateOrInsert(
                [
                    'name'            => $docData['name'],
                    'organization_id' => $org->id,
                ],
                [
                    'organization_id' => $org->id,
                    'name'            => $docData['name'],
                    'type'            => $docData['type'],
                    'size'            => rand(10000, 500000),
                    'path'            => 'e2e-test-docs/' . \Illuminate\Support\Str::slug($docData['name']) . '.' . $docData['type'],
                    'status'          => 'active',
                    'is_test_data'    => true,
                    'created_at'      => Carbon::now(),
                    'updated_at'      => Carbon::now(),
                ]
            );
        }
    }

    // -------------------------------------------------------------------------
    // Notifications
    // -------------------------------------------------------------------------

    private function createNotifications(Organization $org, array $users): void
    {
        $this->command->info('[E2ESeeder] Création des notifications de test...');

        $admin = $users['admin_org'] ?? collect($users)->first();
        if (! $admin) return;

        $notifications = [
            ['title' => 'Nouveau courrier reçu', 'type' => 'info', 'read' => false],
            ['title' => 'Réunion dans 30 minutes', 'type' => 'warning', 'read' => false],
            ['title' => 'Tâche assignée par le directeur', 'type' => 'info', 'read' => true],
        ];

        foreach ($notifications as $notifData) {
            DB::table('notifications')->updateOrInsert(
                [
                    'title'     => $notifData['title'],
                    'notifiable_id' => $admin->id,
                    'notifiable_type' => User::class,
                ],
                [
                    'id'              => \Illuminate\Support\Str::uuid(),
                    'type'            => 'App\\Notifications\\E2ETestNotification',
                    'notifiable_id'   => $admin->id,
                    'notifiable_type' => User::class,
                    'data'            => json_encode([
                        'title'        => $notifData['title'],
                        'type'         => $notifData['type'],
                        'is_test_data' => true,
                    ]),
                    'read_at' => $notifData['read'] ? Carbon::now() : null,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]
            );
        }
    }
}
