<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

/**
 * SECRETIS ERP — DemoDataSeeder
 *
 * Peuple l'environnement de démonstration avec des données fictives réalistes
 * pour "Groupe IBIG Côte d'Ivoire (DÉMO)".
 *
 * Données créées :
 *   - 1 organisation démo
 *   - 8 utilisateurs avec rôles variés (Demo@2026)
 *   - Agenda : 15 événements, 3 salles, 5 invitations
 *   - GED : 4 dossiers, 12 documents, 2 workflows
 *   - Réunions : 5 passées + CR, 2 à venir, 8 tâches
 *   - Tâches & Projets : 1 projet, 15 tâches Kanban + Gantt
 *   - Visiteurs : 20 ce mois, 3 invitations QR, 2 actifs, 1 blacklist
 *   - RH : 12 employés, 3 congés, 5 notes de frais
 *   - Comptabilité : exercice 2025, 30 écritures SYSCOHADA
 *   - Achats : 3 fournisseurs, 2 DA, 1 AO + 3 offres
 *   - Flotte : 4 véhicules, 30 trajets, 2 maintenances
 *   - Qualité : 3 non-conformités, 2 audits, 5 indicateurs
 */
class DemoDataSeeder extends Seeder
{
    private int $orgId;
    private array $userIds = [];
    private Carbon $now;

    public function run(): void
    {
        $this->now = Carbon::now();

        $this->command->info('   → Génération des données de démonstration...');

        DB::transaction(function () {
            $this->seedOrganization();
            $this->seedUsers();
            $this->seedAgenda();
            $this->seedGed();
            $this->seedReunions();
            $this->seedTachesEtProjets();
            $this->seedVisiteurs();
            $this->seedRh();
            $this->seedComptabilite();
            $this->seedAchats();
            $this->seedFlotte();
            $this->seedQualite();
        });

        $this->command->info('   ✓ Données de démonstration générées.');
        $this->command->info('   → Accès : admin@demo-secretis.com / Demo@2026');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Organisation
    // ──────────────────────────────────────────────────────────────────────────

    private function seedOrganization(): void
    {
        $this->orgId = DB::table('organizations')->insertGetId([
            'name'         => 'Groupe IBIG Côte d\'Ivoire (DÉMO)',
            'slug'         => 'demo-groupe-ibig-ci',
            'country'      => 'CI',
            'sector'       => 'Services administratifs et conseils',
            'size'         => '10-50',
            'email'        => 'contact@demo-secretis.com',
            'phone'        => '+225 27 22 00 00 00',
            'address'      => 'Abidjan, Cocody – Côte d\'Ivoire',
            'website'      => 'https://demo.ibig-ci.com',
            'fiscal_year'  => '2025-2026',
            'currency'     => 'XOF',
            'is_demo'      => true,
            'timezone'     => 'Africa/Abidjan',
            'language'     => 'fr',
            'created_at'   => $this->now,
            'updated_at'   => $this->now,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Utilisateurs démo
    // ──────────────────────────────────────────────────────────────────────────

    private function seedUsers(): void
    {
        $users = [
            ['admin@demo-secretis.com',      'Kouassi',    'Aimé',       'admin_organisation',      'Administrateur système'],
            ['dg@demo-secretis.com',         'N\'Guessan', 'Brou',       'dirigeant',               'Directeur Général'],
            ['secretaire@demo-secretis.com', 'Koné',       'Fatoumata',  'secretaire_direction',    'Secrétaire de Direction'],
            ['assistante@demo-secretis.com', 'Diabaté',    'Aminata',    'assistante_direction',    'Assistante de Direction'],
            ['accueil@demo-secretis.com',    'Coulibaly',  'Drissa',     'agent_accueil',           'Agent d\'Accueil'],
            ['rh@demo-secretis.com',         'Touré',      'Marie-Paule','responsable_admin',       'Responsable RH & Admin'],
            ['auditeur@demo-secretis.com',   'Yao',        'Clément',    'auditeur',                'Auditeur Interne'],
            ['agent@demo-secretis.com',      'Bamba',      'Ibrahim',    'agent_operationnel',      'Agent Opérationnel'],
        ];

        foreach ($users as [$email, $last, $first, $role, $title]) {
            $userId = DB::table('users')->insertGetId([
                'organization_id' => $this->orgId,
                'email'           => $email,
                'last_name'       => $last,
                'first_name'      => $first,
                'job_title'       => $title,
                'password'        => Hash::make('Demo@2026'),
                'role'            => $role,
                'is_active'       => true,
                'locale'          => 'fr',
                'timezone'        => 'Africa/Abidjan',
                'email_verified_at' => $this->now,
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
            $this->userIds[$role] = $userId;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Agenda
    // ──────────────────────────────────────────────────────────────────────────

    private function seedAgenda(): void
    {
        // 3 salles de réunion
        $salles = [
            ['Salle Présidence',  12, 'Niveau 5 — Tour A', '#1E40AF'],
            ['Salle Innovation',  8,  'Niveau 3 — Aile Est', '#065F46'],
            ['Salle Formation',   25, 'Rez-de-chaussée — Bât. B', '#92400E'],
        ];
        $salleIds = [];
        foreach ($salles as [$name, $cap, $loc, $color]) {
            $salleIds[] = DB::table('rooms')->insertGetId([
                'organization_id' => $this->orgId,
                'name'            => $name,
                'capacity'        => $cap,
                'location'        => $loc,
                'color'           => $color,
                'is_active'       => true,
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }

        // 15 événements sur le mois courant
        $baseDate = $this->now->copy()->startOfMonth();
        $events = [
            ['Comité de Direction — Juillet 2025',       $baseDate->copy()->addDays(1)->setHour(9),  $baseDate->copy()->addDays(1)->setHour(11), 'meeting'],
            ['Formation SECRETIS — Prise en main GED',    $baseDate->copy()->addDays(2)->setHour(14), $baseDate->copy()->addDays(2)->setHour(17), 'training'],
            ['Réunion projet Digitalisation',             $baseDate->copy()->addDays(3)->setHour(10), $baseDate->copy()->addDays(3)->setHour(11), 'meeting'],
            ['Déplacement Yamoussoukro — DG',             $baseDate->copy()->addDays(5)->setHour(7),  $baseDate->copy()->addDays(5)->setHour(18), 'travel'],
            ['Échéance déclaration TVA — Juillet',        $baseDate->copy()->addDays(10)->setHour(0), $baseDate->copy()->addDays(10)->setHour(23), 'deadline'],
            ['Réunion fournisseurs — Appel d\'offres',    $baseDate->copy()->addDays(7)->setHour(14), $baseDate->copy()->addDays(7)->setHour(16), 'meeting'],
            ['Audit qualité interne — Module RH',         $baseDate->copy()->addDays(8)->setHour(9),  $baseDate->copy()->addDays(8)->setHour(12), 'audit'],
            ['Point hebdomadaire équipe admin',           $baseDate->copy()->addDays(6)->setHour(8),  $baseDate->copy()->addDays(6)->setHour(8)->addMinutes(30), 'meeting'],
            ['Entretien annuel — Coulibaly Drissa',       $baseDate->copy()->addDays(12)->setHour(10),$baseDate->copy()->addDays(12)->setHour(11), 'hr'],
            ['Signature contrat — Partenaire SOTRA',      $baseDate->copy()->addDays(14)->setHour(15),$baseDate->copy()->addDays(14)->setHour(16), 'meeting'],
            ['Formation sécurité incendie',               $baseDate->copy()->addDays(15)->setHour(9), $baseDate->copy()->addDays(15)->setHour(12), 'training'],
            ['Conseil d\'Administration — T3 2025',       $baseDate->copy()->addDays(18)->setHour(14),$baseDate->copy()->addDays(18)->setHour(17), 'board'],
            ['Réunion bilan mensuel — Directions',        $baseDate->copy()->addDays(20)->setHour(9), $baseDate->copy()->addDays(20)->setHour(11), 'meeting'],
            ['Échéance loyers — Bâtiment B',              $baseDate->copy()->addDays(25)->setHour(0), $baseDate->copy()->addDays(25)->setHour(23), 'deadline'],
            ['Séminaire stratégique 2026 — Préparation',  $baseDate->copy()->addDays(28)->setHour(9), $baseDate->copy()->addDays(29)->setHour(17), 'seminar'],
        ];

        foreach ($events as [$title, $start, $end, $type]) {
            DB::table('events')->insert([
                'organization_id'  => $this->orgId,
                'created_by'       => $this->userIds['secretaire_direction'],
                'title'            => $title,
                'type'             => $type,
                'start_at'         => $start,
                'end_at'           => $end,
                'room_id'          => $salleIds[array_rand($salleIds)],
                'status'           => 'confirmed',
                'created_at'       => $this->now,
                'updated_at'       => $this->now,
            ]);
        }

        // 5 invitations en attente
        for ($i = 1; $i <= 5; $i++) {
            DB::table('event_participants')->insert([
                'event_id'    => $i,
                'user_id'     => $this->userIds['agent_operationnel'],
                'status'      => 'pending',
                'created_at'  => $this->now,
                'updated_at'  => $this->now,
            ]);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GED
    // ──────────────────────────────────────────────────────────────────────────

    private function seedGed(): void
    {
        // 4 dossiers principaux
        $folders = ['Contrats', 'Courriers 2025', 'Ressources Humaines', 'Finances'];
        $folderIds = [];
        foreach ($folders as $name) {
            $folderIds[] = DB::table('document_folders')->insertGetId([
                'organization_id' => $this->orgId,
                'name'            => $name,
                'created_by'      => $this->userIds['admin_organisation'],
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }

        // 12 documents fictifs
        $docs = [
            ['Contrat de prestation — SOTRA CI',         'pdf',  $folderIds[0], 1250000],
            ['Contrat de bail — Bâtiment B 2025-2026',   'pdf',  $folderIds[0], 890000],
            ['Contrat fournisseur — SYSCOM SARL',        'docx', $folderIds[0], 340000],
            ['Courrier DG — Invitation partenaires T3',  'pdf',  $folderIds[1], 45000],
            ['Note circulaire — Procédures congés',      'pdf',  $folderIds[1], 28000],
            ['Lettre de mission — Audit interne',        'docx', $folderIds[1], 67000],
            ['Règlement intérieur 2025',                 'pdf',  $folderIds[2], 230000],
            ['Fiches de poste — Services Admin',         'docx', $folderIds[2], 145000],
            ['Rapport formation SECRETIS — Juin 2025',   'pdf',  $folderIds[2], 88000],
            ['Budget prévisionnel 2026',                 'xlsx', $folderIds[3], 340000],
            ['États financiers 2024 — Provisoires',      'pdf',  $folderIds[3], 520000],
            ['Déclaration TVA — Juin 2025',              'pdf',  $folderIds[3], 67000],
        ];

        foreach ($docs as [$title, $type, $folderId, $size]) {
            DB::table('documents')->insert([
                'organization_id' => $this->orgId,
                'folder_id'       => $folderId,
                'title'           => $title,
                'file_type'       => $type,
                'file_size'       => $size,
                'created_by'      => $this->userIds['secretaire_direction'],
                'status'          => 'published',
                'created_at'      => $this->now->copy()->subDays(rand(1, 60)),
                'updated_at'      => $this->now,
            ]);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Réunions
    // ──────────────────────────────────────────────────────────────────────────

    private function seedReunions(): void
    {
        $meetings = [
            // Passées avec CR
            ['Comité de Direction — Juin 2025',          $this->now->copy()->subDays(30), 'closed', 'Bilan mensuel et feuille de route T3'],
            ['Revue de projet Digitalisation — Sprint 1',$this->now->copy()->subDays(21), 'closed', 'État d\'avancement et blocages identifiés'],
            ['Réunion fournisseurs — Sélection AO 2025', $this->now->copy()->subDays(14), 'closed', 'Analyse des offres reçues et décision'],
            ['Point qualité — Non-conformités Juin',     $this->now->copy()->subDays(10), 'closed', 'Revue des actions correctives'],
            ['Séance de travail — Budget 2026',          $this->now->copy()->subDays(5),  'closed', 'Arbitrages budgétaires par département'],
            // À venir
            ['Comité de Direction — Juillet 2025',       $this->now->copy()->addDays(5),  'scheduled', null],
            ['Conseil d\'Administration — T3 2025',      $this->now->copy()->addDays(18), 'scheduled', null],
        ];

        $taskCount = 0;
        foreach ($meetings as [$title, $date, $status, $minutes]) {
            $meetingId = DB::table('meetings')->insertGetId([
                'organization_id' => $this->orgId,
                'title'           => $title,
                'scheduled_at'    => $date,
                'status'          => $status,
                'minutes'         => $minutes ? "<p><strong>Compte-rendu :</strong> {$minutes}</p>" : null,
                'created_by'      => $this->userIds['secretaire_direction'],
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);

            // 8 tâches issues des comptes-rendus (répartir sur les 5 premières réunions)
            if ($status === 'closed' && $taskCount < 8) {
                DB::table('tasks')->insert([
                    'organization_id' => $this->orgId,
                    'title'           => 'Action issue du CR — ' . $title,
                    'status'          => ['todo', 'in_progress', 'done'][rand(0, 2)],
                    'priority'        => ['low', 'medium', 'high'][rand(0, 2)],
                    'assigned_to'     => $this->userIds['agent_operationnel'],
                    'created_by'      => $this->userIds['secretaire_direction'],
                    'due_date'        => $this->now->copy()->addDays(rand(5, 30)),
                    'source'          => 'meeting',
                    'source_id'       => $meetingId,
                    'created_at'      => $this->now,
                    'updated_at'      => $this->now,
                ]);
                $taskCount++;
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Tâches & Projets
    // ──────────────────────────────────────────────────────────────────────────

    private function seedTachesEtProjets(): void
    {
        // 1 projet principal
        $projectId = DB::table('projects')->insertGetId([
            'organization_id' => $this->orgId,
            'name'            => 'Digitalisation Administrative 2025',
            'description'     => 'Migration et numérisation complète des processus administratifs du Groupe IBIG CI sur SECRETIS ERP.',
            'status'          => 'active',
            'start_date'      => $this->now->copy()->subMonths(3),
            'end_date'        => $this->now->copy()->addMonths(3),
            'created_by'      => $this->userIds['dirigeant'],
            'created_at'      => $this->now,
            'updated_at'      => $this->now,
        ]);

        // 15 tâches réparties sur le Kanban
        $tasks = [
            // À faire (5)
            ['Configurer les workflows de validation GED',     'todo',        'high',   30],
            ['Paramétrer le module achats — fournisseurs',     'todo',        'medium', 20],
            ['Créer les modèles de courrier officiels',        'todo',        'medium', 15],
            ['Former les agents accueil au module visiteurs',  'todo',        'low',    10],
            ['Intégrer le plan comptable SYSCOHADA',           'todo',        'high',   25],
            // En cours (4)
            ['Migration des données RH depuis Excel',          'in_progress', 'high',   5],
            ['Configuration SSO — Active Directory',           'in_progress', 'medium', 12],
            ['Paramétrage des notifications automatiques',     'in_progress', 'low',    18],
            ['Test de charge — 50 utilisateurs simultanés',   'in_progress', 'medium', 8],
            // Révision (2)
            ['Documentation procédures utilisateurs',          'review',      'medium', 3],
            ['Rapport bilan Phase 1 — Migration',              'review',      'high',   2],
            // Terminé (4)
            ['Installation et configuration SECRETIS',         'done',        'high',   -60],
            ['Formation administrateurs — 2 jours',           'done',        'high',   -45],
            ['Import plan de comptes SYSCOHADA Révisé 2',     'done',        'medium', -30],
            ['Paramétrage organisation et départements',       'done',        'medium', -20],
        ];

        foreach ($tasks as [$title, $status, $priority, $dayOffset]) {
            DB::table('tasks')->insert([
                'organization_id' => $this->orgId,
                'project_id'      => $projectId,
                'title'           => $title,
                'status'          => $status,
                'priority'        => $priority,
                'assigned_to'     => array_values($this->userIds)[rand(0, count($this->userIds) - 1)],
                'created_by'      => $this->userIds['dirigeant'],
                'due_date'        => $this->now->copy()->addDays($dayOffset > 0 ? $dayOffset : rand(5, 20)),
                'completed_at'    => $status === 'done' ? $this->now->copy()->subDays(abs($dayOffset)) : null,
                'source'          => 'project',
                'source_id'       => $projectId,
                'created_at'      => $this->now->copy()->subDays(abs($dayOffset) + 10),
                'updated_at'      => $this->now,
            ]);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Visiteurs
    // ──────────────────────────────────────────────────────────────────────────

    private function seedVisiteurs(): void
    {
        $visiteurs = [
            ['Koffi', 'Yannick',    'SOTRA CI',          'Signature contrat',          'checked_out', -5],
            ['Sylla', 'Mariam',     'Cabinet Audit Plus', 'Réunion audit',             'checked_out', -4],
            ['Boni',  'Théodore',   'SYSCOM SARL',        'Présentation produits',     'checked_out', -3],
            ['Atta',  'Abla',       'Ministère Commerce', 'Rencontre partenariale',    'checked_out', -3],
            ['Dje',   'Serge',      'BNI Côte d\'Ivoire', 'Rendez-vous DG',           'checked_out', -2],
            ['Ouédraogo', 'Aziz',  'BCEAO',              'Consultation documents',    'checked_out', -2],
            ['Yao',   'Émile',      'Groupe Bolloré',     'Offre commerciale',         'checked_out', -1],
            ['Kra',   'Jeanne',     'Freelance',          'Entretien recrutement',     'checked_out', -1],
            ['Aké',   'Marcel',     'Orange CI',          'Renouvellement contrat',    'checked_out', -1],
            ['Tano',  'Célestine',  'SIB',                'Visite commerciale',        'checked_out', 0],
            ['Bah',   'Mamadou',    'MTN CI',             'Réunion technique',         'checked_in',  0],
            ['Koné',  'Salimata',   'Visite privée',      'Rencontre avec RH',         'checked_in',  0],
            ['Traoré','Bakary',     'EDF Côte d\'Ivoire', 'Inspection électrique',    'expected',    1],
            ['N\'Da', 'Patricia',   'CIAPOL',             'Audit environnemental',     'expected',    1],
            ['Fofana','Hamidou',    'Banque Atlantique',  'Présentation services',     'expected',    2],
            ['Kouamé','Éric',       'Cabinet Juridique',  'Consultation contrats',     'expected',    2],
            ['Soro',  'Karim',      'CNPS',               'Contrôle cotisations',      'expected',    3],
            ['Dié',   'Cynthia',    'Partenaire IBIG',    'Réunion partenariat',       'expected',    3],
            ['Guiro', 'Fanta',      'Presse Ivoirienne',  'Interview DG',              'expected',    5],
            ['Coulibaly','Issa',    'ARTCI',              'Audit conformité numérique','expected',    7],
        ];

        foreach ($visiteurs as [$last, $first, $company, $purpose, $status, $dayOffset]) {
            DB::table('visitors')->insert([
                'organization_id' => $this->orgId,
                'last_name'       => $last,
                'first_name'      => $first,
                'company'         => $company,
                'purpose'         => $purpose,
                'status'          => $status,
                'host_user_id'    => $this->userIds['secretaire_direction'],
                'check_in_at'     => in_array($status, ['checked_in', 'checked_out']) ? $this->now->copy()->addDays($dayOffset)->setHour(9) : null,
                'check_out_at'    => $status === 'checked_out' ? $this->now->copy()->addDays($dayOffset)->setHour(rand(10, 16)) : null,
                'expected_at'     => $this->now->copy()->addDays($dayOffset)->setHour(9),
                'created_at'      => $this->now->copy()->addDays($dayOffset - 1),
                'updated_at'      => $this->now,
            ]);
        }

        // 3 invitations QR actives
        for ($i = 0; $i < 3; $i++) {
            DB::table('visitor_appointments')->insert([
                'organization_id' => $this->orgId,
                'visitor_name'    => 'Invité QR ' . ($i + 1),
                'visitor_email'   => "invite-qr-{$i}@exemple.com",
                'host_user_id'    => $this->userIds['secretaire_direction'],
                'appointment_at'  => $this->now->copy()->addDays($i + 1)->setHour(10),
                'qr_code'         => 'QR-DEMO-' . strtoupper(substr(md5($i . $this->now->timestamp), 0, 8)),
                'status'          => 'pending',
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }

        // 1 blacklist
        DB::table('visitors')->insert([
            'organization_id' => $this->orgId,
            'last_name'       => 'Inconnu',
            'first_name'      => 'Visiteur Indésirable',
            'company'         => 'Sans organisme',
            'purpose'         => 'Incident sécurité — Juillet 2025',
            'status'          => 'blacklisted',
            'blacklist_reason' => 'Comportement perturbateur lors de la visite du 05/07/2025. Accès refusé sur décision DG.',
            'host_user_id'    => $this->userIds['admin_organisation'],
            'created_at'      => $this->now->copy()->subDays(5),
            'updated_at'      => $this->now,
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RH
    // ──────────────────────────────────────────────────────────────────────────

    private function seedRh(): void
    {
        $employes = [
            ['N\'Guessan', 'Brou',        'Directeur Général',          'Direction',       8500000, 'CDI'],
            ['Kouassi',    'Aimé',        'Directeur Administratif',     'Administration',  4500000, 'CDI'],
            ['Koné',       'Fatoumata',   'Secrétaire de Direction',     'Direction',       2800000, 'CDI'],
            ['Diabaté',    'Aminata',     'Assistante de Direction',     'Direction',       2400000, 'CDI'],
            ['Coulibaly',  'Drissa',      'Agent d\'Accueil Principal',  'Accueil',         1800000, 'CDI'],
            ['Touré',      'Marie-Paule', 'Responsable RH',              'RH',              3200000, 'CDI'],
            ['Yao',        'Clément',     'Auditeur Interne',            'Finance',         3800000, 'CDI'],
            ['Bamba',      'Ibrahim',     'Agent Opérationnel',          'Opérations',      1950000, 'CDI'],
            ['Ouattara',   'Siaka',       'Comptable Principal',         'Finance',         2900000, 'CDI'],
            ['Gnangui',    'Rose',        'Gestionnaire Achats',         'Achats',          2600000, 'CDI'],
            ['Koffi',      'Rodrigue',    'Responsable Flotte',          'Logistique',      2700000, 'CDI'],
            ['Adou',       'Christiane',  'Chargée Qualité',             'Qualité',         2850000, 'CDD'],
        ];

        $employeeIds = [];
        foreach ($employes as [$last, $first, $title, $dept, $salary, $contract]) {
            $employeeIds[] = DB::table('employees')->insertGetId([
                'organization_id'   => $this->orgId,
                'last_name'         => $last,
                'first_name'        => $first,
                'job_title'         => $title,
                'department'        => $dept,
                'salary'            => $salary,
                'contract_type'     => $contract,
                'hire_date'         => $this->now->copy()->subMonths(rand(6, 48)),
                'status'            => 'active',
                'created_at'        => $this->now,
                'updated_at'        => $this->now,
            ]);
        }

        // 3 demandes de congé
        $conges = [
            [$employeeIds[2], 'Congé annuel',   $this->now->copy()->addDays(20), $this->now->copy()->addDays(34), 'approved',  'Congés été 2025'],
            [$employeeIds[4], 'Congé maladie',  $this->now->copy()->subDays(2),  $this->now->copy()->addDays(3),  'pending',   'Arrêt médical'],
            [$employeeIds[7], 'Congé personnel', $this->now->copy()->addDays(5), $this->now->copy()->addDays(6),  'rejected',  'Insuffisance du solde disponible'],
        ];

        foreach ($conges as [$empId, $type, $start, $end, $status, $comment]) {
            DB::table('leave_requests')->insert([
                'organization_id' => $this->orgId,
                'employee_id'     => $empId,
                'leave_type'      => $type,
                'start_date'      => $start,
                'end_date'        => $end,
                'status'          => $status,
                'comment'         => $comment,
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }

        // 5 notes de frais
        $frais = [
            [$employeeIds[0], 'Transport Abidjan–Yamoussoukro',  45000,  'travel',  'approved'],
            [$employeeIds[1], 'Repas réunion partenaires',       28500,  'meal',    'approved'],
            [$employeeIds[2], 'Fournitures de bureau',           12750,  'office',  'pending'],
            [$employeeIds[6], 'Formation SYSCOHADA externe',    185000,  'training','approved'],
            [$employeeIds[7], 'Carburant déplacement client',    35200,  'fuel',    'pending'],
        ];

        foreach ($frais as [$empId, $desc, $amount, $category, $status]) {
            DB::table('expense_reports')->insert([
                'organization_id' => $this->orgId,
                'employee_id'     => $empId,
                'description'     => $desc,
                'amount'          => $amount,
                'currency'        => 'XOF',
                'category'        => $category,
                'expense_date'    => $this->now->copy()->subDays(rand(1, 15)),
                'status'          => $status,
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Comptabilité
    // ──────────────────────────────────────────────────────────────────────────

    private function seedComptabilite(): void
    {
        // 30 écritures comptables SYSCOHADA
        $ecritures = [
            ['411100', '701100', 'Facture prestation — SOTRA CI N°FAC-2025-001',      1250000, 'janvier'],
            ['411100', '701100', 'Facture prestation — SIB N°FAC-2025-002',           890000,  'janvier'],
            ['606100', '401100', 'Achat fournitures de bureau — SYSCOM SARL',         145000,  'janvier'],
            ['411100', '701100', 'Facture consulting — Cabinet Audit N°FAC-2025-003', 750000,  'février'],
            ['622000', '401100', 'Facture loyer bureau — Bâtiment B — Fév 2025',      480000,  'février'],
            ['613100', '401100', 'Facture entretien véhicules — Garage Central',      320000,  'février'],
            ['512000', '411100', 'Règlement SOTRA CI — Chèque BNI N°12345',          1250000, 'février'],
            ['411100', '701100', 'Facture formation — Groupe Orange CI',              580000,  'mars'],
            ['641100', '421000', 'Salaires personnel — Mars 2025',                   8950000, 'mars'],
            ['431000', '421000', 'Cotisations CNPS — Mars 2025',                     1253000, 'mars'],
            ['512000', '411100', 'Règlement SIB — Virement bancaire',                890000,  'mars'],
            ['411100', '701100', 'Facture audit — CIAPOL N°FAC-2025-004',            420000,  'avril'],
            ['622000', '401100', 'Loyer bureau — Avril 2025',                        480000,  'avril'],
            ['606200', '401100', 'Achat équipements informatiques',                  1850000, 'avril'],
            ['641100', '421000', 'Salaires personnel — Avril 2025',                  8950000, 'avril'],
            ['431000', '421000', 'Cotisations CNPS — Avril 2025',                    1253000, 'avril'],
            ['512000', '411100', 'Règlement Groupe Orange CI',                        580000,  'avril'],
            ['411100', '701100', 'Facture conseil RH — N°FAC-2025-005',              320000,  'mai'],
            ['613200', '401100', 'Facture assurance véhicules — SUNU',               285000,  'mai'],
            ['622000', '401100', 'Loyer bureau — Mai 2025',                          480000,  'mai'],
            ['641100', '421000', 'Salaires personnel — Mai 2025',                    8950000, 'mai'],
            ['431000', '421000', 'Cotisations CNPS — Mai 2025',                      1253000, 'mai'],
            ['411100', '701100', 'Facture prestation — Bolloré N°FAC-2025-006',      1650000, 'juin'],
            ['625000', '401100', 'Déplacements mission Yamoussoukro',                 95000,  'juin'],
            ['622000', '401100', 'Loyer bureau — Juin 2025',                         480000,  'juin'],
            ['641100', '421000', 'Salaires personnel — Juin 2025',                   8950000, 'juin'],
            ['431000', '421000', 'Cotisations CNPS — Juin 2025',                     1253000, 'juin'],
            ['512000', '411100', 'Règlement Bolloré — Virement',                    1650000,  'juin'],
            ['411100', '701100', 'Facture prestation — MTN CI N°FAC-2025-007',       980000,  'juillet'],
            ['622000', '401100', 'Loyer bureau — Juillet 2025',                      480000,  'juillet'],
        ];

        $months = ['janvier'=>1,'février'=>2,'mars'=>3,'avril'=>4,'mai'=>5,'juin'=>6,'juillet'=>7];
        foreach ($ecritures as [$debit, $credit, $libelle, $montant, $mois]) {
            DB::table('accounting_entries')->insert([
                'organization_id' => $this->orgId,
                'fiscal_year'     => 2025,
                'entry_date'      => Carbon::create(2025, $months[$mois], rand(5, 25)),
                'debit_account'   => $debit,
                'credit_account'  => $credit,
                'label'           => $libelle,
                'amount'          => $montant,
                'currency'        => 'XOF',
                'created_by'      => $this->userIds['admin_organisation'],
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Achats
    // ──────────────────────────────────────────────────────────────────────────

    private function seedAchats(): void
    {
        // 3 fournisseurs
        $fournisseurs = [
            ['FOURN-2025-001', 'SYSCOM SARL',       'Fournitures de bureau et informatique',  'syscom@exemple.ci',     '+225 27 21 XX XX'],
            ['FOURN-2025-002', 'Garage Central CI', 'Entretien et réparation véhicules',       'garage@exemple.ci',    '+225 27 22 XX XX'],
            ['FOURN-2025-003', 'Clean Services CI', 'Nettoyage et entretien des locaux',       'clean@exemple.ci',     '+225 07 XX XX XX'],
        ];

        $fournisseurIds = [];
        foreach ($fournisseurs as [$ref, $name, $category, $email, $phone]) {
            $fournisseurIds[] = DB::table('suppliers')->insertGetId([
                'organization_id' => $this->orgId,
                'reference'       => $ref,
                'name'            => $name,
                'category'        => $category,
                'email'           => $email,
                'phone'           => $phone,
                'country'         => 'CI',
                'status'          => 'active',
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }

        // 2 demandes d'achat
        DB::table('purchase_requests')->insert([
            [
                'organization_id' => $this->orgId,
                'reference'       => 'DA-2025-001',
                'title'           => 'Achat équipements informatiques — 5 ordinateurs portables',
                'total_amount'    => 4750000,
                'currency'        => 'XOF',
                'status'          => 'approved',
                'requested_by'    => $this->userIds['admin_organisation'],
                'created_at'      => $this->now->copy()->subDays(15),
                'updated_at'      => $this->now,
            ],
            [
                'organization_id' => $this->orgId,
                'reference'       => 'DA-2025-002',
                'title'           => 'Fournitures de bureau — Stock trimestriel T3',
                'total_amount'    => 385000,
                'currency'        => 'XOF',
                'status'          => 'pending',
                'requested_by'    => $this->userIds['secretaire_direction'],
                'created_at'      => $this->now->copy()->subDays(3),
                'updated_at'      => $this->now,
            ],
        ]);

        // 1 appel d'offres avec 3 offres
        $aoId = DB::table('purchase_tenders')->insertGetId([
            'organization_id' => $this->orgId,
            'reference'       => 'AO-2025-001',
            'title'           => 'Appel d\'offres — Prestations de nettoyage 2025-2026',
            'description'     => 'Nettoyage quotidien des locaux du Groupe IBIG CI — Bâtiments A et B.',
            'status'          => 'evaluation',
            'deadline'        => $this->now->copy()->subDays(5),
            'created_by'      => $this->userIds['admin_organisation'],
            'created_at'      => $this->now->copy()->subDays(30),
            'updated_at'      => $this->now,
        ]);

        $offres = [
            ['Clean Services CI',      840000,  'Meilleure offre technique'],
            ['ProClean Abidjan',       780000,  'Offre économique — références limitées'],
            ['Excellence Services CI', 920000,  'Offre premium avec équipements fournis'],
        ];
        foreach ($offres as [$supplier, $amount, $comment]) {
            DB::table('tender_offers')->insert([
                'tender_id'   => $aoId,
                'supplier_name' => $supplier,
                'amount'      => $amount,
                'currency'    => 'XOF',
                'comment'     => $comment,
                'submitted_at'=> $this->now->copy()->subDays(rand(6, 10)),
                'created_at'  => $this->now,
                'updated_at'  => $this->now,
            ]);
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Flotte
    // ──────────────────────────────────────────────────────────────────────────

    private function seedFlotte(): void
    {
        $vehicules = [
            ['AB-1234-CI', 'Toyota', 'Camry',    2022, 'berline',    'active',  '#1E40AF'],
            ['AB-5678-CI', 'Toyota', 'Land Cruiser', 2021, 'suv',   'active',  '#065F46'],
            ['CD-2345-CI', 'Hyundai','Tucson',   2023, 'berline',    'active',  '#7C3AED'],
            ['EF-6789-CI', 'Renault','Kangoo',   2020, 'utilitaire', 'maintenance', '#92400E'],
        ];

        $vehicleIds = [];
        foreach ($vehicules as [$plate, $brand, $model, $year, $type, $status, $color]) {
            $vehicleIds[] = DB::table('vehicles')->insertGetId([
                'organization_id' => $this->orgId,
                'plate_number'    => $plate,
                'brand'           => $brand,
                'model'           => $model,
                'year'            => $year,
                'type'            => $type,
                'status'          => $status,
                'color'           => $color,
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }

        // 30 trajets historiques
        for ($i = 0; $i < 30; $i++) {
            DB::table('vehicle_trips')->insert([
                'organization_id' => $this->orgId,
                'vehicle_id'      => $vehicleIds[$i % 3], // exclure le véhicule en maintenance
                'driver_name'     => ['Koffi Rodrigue', 'Bamba Ibrahim', 'N\'Guessan Brou'][rand(0, 2)],
                'departure'       => ['Abidjan Plateau', 'Cocody Les 2 Plateaux', 'Marcory Zone 4'][rand(0, 2)],
                'destination'     => ['Yamoussoukro', 'Bouaké', 'Grand-Bassam', 'Assinie', 'Aéroport FHB'][rand(0, 4)],
                'km_start'        => 45000 + ($i * 120),
                'km_end'          => 45000 + ($i * 120) + rand(50, 350),
                'purpose'         => ['Mission client', 'Transport DG', 'Livraison documents', 'Déplacement formation'][rand(0, 3)],
                'trip_date'       => $this->now->copy()->subDays(30 - $i),
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }

        // 2 maintenances planifiées dans les 30 jours
        DB::table('vehicle_maintenances')->insert([
            [
                'organization_id' => $this->orgId,
                'vehicle_id'      => $vehicleIds[0],
                'type'            => 'oil_change',
                'description'     => 'Vidange + filtre à huile + filtre air — Toyota Camry',
                'scheduled_at'    => $this->now->copy()->addDays(10),
                'status'          => 'scheduled',
                'estimated_cost'  => 45000,
                'garage'          => 'Garage Central CI',
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ],
            [
                'organization_id' => $this->orgId,
                'vehicle_id'      => $vehicleIds[3],
                'type'            => 'repair',
                'description'     => 'Réparation boîte de vitesse — Renault Kangoo (en cours)',
                'scheduled_at'    => $this->now->copy()->addDays(5),
                'status'          => 'in_progress',
                'estimated_cost'  => 280000,
                'garage'          => 'Garage Renault Abidjan',
                'created_at'      => $this->now->copy()->subDays(3),
                'updated_at'      => $this->now,
            ],
        ]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Qualité
    // ──────────────────────────────────────────────────────────────────────────

    private function seedQualite(): void
    {
        // 3 non-conformités
        $nonconformites = [
            ['NC-2025-001', 'Retard de traitement courrier entrant', 'open',     'medium', 'Courrier entrant reçu le 05/07 non traité dans le délai de 48h prévu.'],
            ['NC-2025-002', 'Absence de validation GED — Contrats',  'in_action','high',   'Contrats signés archivés sans passage par le workflow de validation.'],
            ['NC-2025-003', 'Véhicule non contrôlé avant mission',   'closed',   'low',    'Fiche de contrôle pré-trajet non remplie pour mission du 01/06/2025.'],
        ];

        foreach ($nonconformites as [$ref, $title, $status, $severity, $description]) {
            DB::table('quality_nonconformities')->insert([
                'organization_id' => $this->orgId,
                'reference'       => $ref,
                'title'           => $title,
                'status'          => $status,
                'severity'        => $severity,
                'description'     => $description,
                'detected_by'     => $this->userIds['auditeur'],
                'detected_at'     => $this->now->copy()->subDays(rand(5, 30)),
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }

        // 2 audits planifiés
        DB::table('quality_audits')->insert([
            [
                'organization_id' => $this->orgId,
                'title'           => 'Audit interne processus RH — ISO 9001',
                'audit_date'      => $this->now->copy()->addDays(15),
                'scope'           => 'Gestion des congés, recrutement, formation',
                'auditor'         => 'Yao Clément (Auditeur Interne)',
                'status'          => 'planned',
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ],
            [
                'organization_id' => $this->orgId,
                'title'           => 'Audit processus GED et archivage',
                'audit_date'      => $this->now->copy()->addDays(25),
                'scope'           => 'Workflows de validation, archivage légal, accès documents',
                'auditor'         => 'Cabinet Audit Plus (Externe)',
                'status'          => 'planned',
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ],
        ]);

        // 5 indicateurs qualité
        $indicateurs = [
            ['Taux de traitement courrier dans les délais',   '82',  '%',   87,  'warning'],
            ['Délai moyen de validation des documents GED',   '3.2', 'j',   2.0, 'warning'],
            ['Taux de satisfaction visiteurs',                '94',  '%',   90,  'good'],
            ['Taux de résolution tickets support interne',   '96',  '%',   95,  'good'],
            ['Nombre de non-conformités ouvertes',            '2',   'NC',  0,   'warning'],
        ];

        foreach ($indicateurs as [$title, $value, $unit, $target, $status]) {
            DB::table('quality_indicators')->insert([
                'organization_id' => $this->orgId,
                'title'           => $title,
                'current_value'   => $value,
                'unit'            => $unit,
                'target_value'    => $target,
                'status'          => $status,
                'measured_at'     => $this->now->copy()->startOfMonth(),
                'created_at'      => $this->now,
                'updated_at'      => $this->now,
            ]);
        }
    }
}
