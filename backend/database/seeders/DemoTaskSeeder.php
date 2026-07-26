<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DemoTaskSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('✅ Création des projets et tâches...');

        $org = DB::table('organizations')->where('slug', 'cabinet-conseil-demo')->first();
        if (! $org) {
            $this->command->error('Organisation démo introuvable.');
            return;
        }
        $orgId = $org->id;
        $users = DB::table('users')->where('organization_id', $orgId)->pluck('id')->toArray();

        $now = Carbon::now();

        // ── 3 Projets actifs ─────────────────────────────────────────────────
        $projects = [
            [
                'name'        => 'Digitalisation processus RH',
                'code'        => 'PRJ-RH-2024',
                'description' => 'Dématérialisation complète des processus de gestion des ressources humaines : congés, notes de frais, fiches employés, planning.',
                'color'       => '#10b981',
                'status'      => 'active',
                'priority'    => 'high',
                'start_date'  => $now->copy()->subMonths(2),
                'end_date'    => $now->copy()->addMonths(2),
                'budget'      => 8500000,
                'progress'    => 45,
                'manager_idx' => 5,  // Ibrahim Diallo RH
            ],
            [
                'name'        => 'Refonte site web institutionnel',
                'code'        => 'PRJ-COM-2024',
                'description' => 'Refonte complète du site web du cabinet : nouvelle identité visuelle, SEO optimisé, intégration CRM, version mobile first.',
                'color'       => '#0ea5e9',
                'status'      => 'active',
                'priority'    => 'medium',
                'start_date'  => $now->copy()->subMonth(),
                'end_date'    => $now->copy()->addMonths(3),
                'budget'      => 5200000,
                'progress'    => 30,
                'manager_idx' => 8,  // Akossiwa Marketing
            ],
            [
                'name'        => 'Migration infrastructure IT',
                'code'        => 'PRJ-IT-2024',
                'description' => 'Migration de l\'infrastructure on-premise vers le cloud hybride AWS/Azure. Sécurisation des accès, sauvegarde automatique, VPN employés.',
                'color'       => '#ef4444',
                'status'      => 'active',
                'priority'    => 'critical',
                'start_date'  => $now->copy()->subWeeks(3),
                'end_date'    => $now->copy()->addMonths(4),
                'budget'      => 15000000,
                'progress'    => 20,
                'manager_idx' => 10, // Christophe IT
            ],
        ];

        $projectIds = [];
        foreach ($projects as $p) {
            $managerId = $users[$p['manager_idx'] % count($users)];
            $projectIds[] = DB::table('projects')->insertGetId([
                'organization_id' => $orgId,
                'created_by'      => $users[0],
                'manager_id'      => $managerId,
                'name'            => $p['name'],
                'code'            => $p['code'],
                'description'     => $p['description'],
                'color'           => $p['color'],
                'status'          => $p['status'],
                'priority'        => $p['priority'],
                'start_date'      => $p['start_date'],
                'end_date'        => $p['end_date'],
                'budget'          => $p['budget'],
                'progress'        => $p['progress'],
                'members'         => json_encode(array_slice($users, 0, 5)),
                'created_at'      => $now->copy()->subMonths(2),
                'updated_at'      => now(),
            ]);
        }

        [$projRH, $projCOM, $projIT] = $projectIds;

        // ── Tâches Projet RH ─────────────────────────────────────────────────
        $tasksRH = [
            ['Analyse des besoins et cartographie processus',       'done',        'urgent', -45, -35, 0, 5],
            ['Rédaction cahier des charges fonctionnel',            'done',        'high',   -35, -25, 0, 5],
            ['Sélection outil SIRH',                                'done',        'high',   -25, -18, 1, 5],
            ['Paramétrage module congés',                           'done',        'medium', -18, -10, 1, 6],
            ['Paramétrage module notes de frais',                   'in_progress', 'medium', -10, 5,   1, 6],
            ['Migration données employés existants',               'in_progress', 'high',   -8,  7,   2, 5],
            ['Tests utilisateurs module congés',                    'review',      'medium', -5,  2,   3, 5],
            ['Formation responsables RH sur le nouvel outil',      'todo',        'high',   3,   10,  4, 5],
            ['Formation ensemble du personnel',                     'todo',        'medium', 10,  20,  4, 5],
            ['Mise en production et go-live',                      'backlog',     'urgent', 20,  30,  0, 5],
            ['Bilan post-déploiement 30 jours',                    'backlog',     'low',    35,  45,  0, 5],
            // TÂCHE EN RETARD
            ['Rapport DPAAS conformité RGPD - URGENT',             'in_progress', 'urgent', -15, -3,  3, 5],
        ];

        $taskRHIds = [];
        foreach ($tasksRH as $i => $t) {
            $assignedUser = $users[$t[6] % count($users)];
            $creator      = $users[$t[5] % count($users)];
            $dueDate      = $now->copy()->addDays($t[4]);
            $startDate    = $now->copy()->addDays($t[3]);
            $completedAt  = $t[1] === 'done' ? $now->copy()->addDays($t[4] - 1) : null;

            $taskRHIds[] = DB::table('tasks')->insertGetId([
                'organization_id' => $orgId,
                'project_id'      => $projRH,
                'created_by'      => $creator,
                'assigned_to'     => $assignedUser,
                'title'           => $t[0],
                'status'          => $t[1],
                'priority'        => $t[2],
                'position'        => $i,
                'starts_at'       => $startDate,
                'due_date'        => $dueDate,
                'completed_at'    => $completedAt,
                'estimated_hours' => rand(4, 40),
                'logged_hours'    => $t[1] === 'done' ? rand(4, 40) : rand(0, 20),
                'labels'          => json_encode(['rh', 'sirh']),
                'created_at'      => $now->copy()->subDays(45),
                'updated_at'      => now(),
            ]);
        }

        // Sous-tâches de la tâche "Migration données"
        $parentId = $taskRHIds[5];
        $subTasks = [
            'Export données depuis ancien système',
            'Nettoyage et normalisation données',
            'Import et validation données employés',
        ];
        foreach ($subTasks as $j => $subTitle) {
            DB::table('tasks')->insert([
                'organization_id' => $orgId,
                'project_id'      => $projRH,
                'created_by'      => $users[5],
                'assigned_to'     => $users[6],
                'parent_task_id'  => $parentId,
                'title'           => $subTitle,
                'status'          => $j === 0 ? 'done' : ($j === 1 ? 'in_progress' : 'todo'),
                'priority'        => 'high',
                'position'        => $j,
                'due_date'        => $now->copy()->addDays(7),
                'estimated_hours' => rand(2, 8),
                'logged_hours'    => $j === 0 ? rand(2, 8) : 0,
                'created_at'      => now()->subDays(8),
                'updated_at'      => now(),
            ]);
        }

        // ── Tâches Projet COM ────────────────────────────────────────────────
        $tasksCOM = [
            ['Audit site web actuel + analyse concurrentielle',     'done',        'high',   -30, -22, 0, 8],
            ['Définition nouvelle charte graphique',               'done',        'medium', -22, -14, 8, 8],
            ['Wireframes et maquettes UX/UI',                      'done',        'high',   -14, -5,  8, 8],
            ['Développement frontend (landing page)',               'in_progress', 'high',   -5,  10,  9, 9],
            ['Intégration CMS et blog',                            'in_progress', 'medium', -3,  12,  9, 9],
            ['Rédaction contenus : pages services',               'review',      'medium', -7,  0,   7, 8],
            ['SEO on-page et métadonnées',                         'todo',        'medium', 5,   15,  7, 8],
            ['Intégration formulaire contact / CRM',               'todo',        'high',   8,   18,  7, 9],
            ['Tests multi-navigateurs et responsive',             'backlog',     'high',   15,  22,  0, 9],
            ['Formation équipe communication sur CMS',            'backlog',     'low',    22,  30,  0, 8],
            ['Lancement et communication externe',                 'backlog',     'medium', 28,  35,  0, 8],
            // EN RETARD
            ['Validation logo et identité par direction',          'todo',        'urgent', -10, -2,  0, 8],
        ];

        foreach ($tasksCOM as $i => $t) {
            $dueDate  = $now->copy()->addDays($t[4]);
            $startDate = $now->copy()->addDays($t[3]);
            $completedAt = $t[1] === 'done' ? $now->copy()->addDays($t[4] - 1) : null;

            DB::table('tasks')->insertGetId([
                'organization_id' => $orgId,
                'project_id'      => $projCOM,
                'created_by'      => $users[$t[5] % count($users)],
                'assigned_to'     => $users[$t[6] % count($users)],
                'title'           => $t[0],
                'status'          => $t[1],
                'priority'        => $t[2],
                'position'        => $i,
                'starts_at'       => $startDate,
                'due_date'        => $dueDate,
                'completed_at'    => $completedAt,
                'estimated_hours' => rand(4, 60),
                'logged_hours'    => $t[1] === 'done' ? rand(4, 60) : rand(0, 30),
                'labels'          => json_encode(['web', 'marketing']),
                'created_at'      => $now->copy()->subMonth(),
                'updated_at'      => now(),
            ]);
        }

        // ── Tâches Projet IT ─────────────────────────────────────────────────
        $tasksIT = [
            ['Audit infrastructure existante',                      'done',        'critical', -21, -16, 0, 10],
            ['Choix architecture cloud cible',                     'done',        'critical', -16, -12, 10, 10],
            ['Provisionnement environnements AWS',                  'done',        'high',    -12, -8,  10, 11],
            ['Configuration VPN et accès sécurisés',              'in_progress', 'critical', -8,  4,   10, 11],
            ['Migration serveur de messagerie',                     'in_progress', 'high',    -6,  6,   11, 10],
            ['Migration base de données production',               'review',      'critical', -4,  2,   10, 11],
            ['Tests de charge et performance',                     'todo',        'high',     2,  10,   11, 11],
            ['Mise en place sauvegarde automatique',               'todo',        'critical', 5,  15,   10, 11],
            ['Configuration monitoring et alertes',                'todo',        'high',     8,  18,   11, 11],
            ['Documentation technique infrastructure',             'backlog',     'medium',   15, 25,   10, 11],
            ['Formation IT sur nouveaux outils',                   'backlog',     'medium',   20, 28,   10, 11],
            ['Bilan sécurité post-migration',                      'backlog',     'high',     28, 35,   0, 10],
            // TÂCHES EN RETARD CRITIQUES
            ['Patch sécurité serveur Apache - CVE-2024-XXXX',     'in_progress', 'urgent',  -10, -3,  10, 11],
            ['Renouvellement certificats SSL expirés',             'todo',        'urgent',  -5,  -1,  10, 11],
        ];

        foreach ($tasksIT as $i => $t) {
            $dueDate  = $now->copy()->addDays($t[4]);
            $startDate = $now->copy()->addDays($t[3]);
            $completedAt = $t[1] === 'done' ? $now->copy()->addDays($t[4] - 1) : null;

            DB::table('tasks')->insertGetId([
                'organization_id' => $orgId,
                'project_id'      => $projIT,
                'created_by'      => $users[$t[5] % count($users)],
                'assigned_to'     => $users[$t[6] % count($users)],
                'title'           => $t[0],
                'status'          => $t[1],
                'priority'        => $t[2],
                'position'        => $i,
                'starts_at'       => $startDate,
                'due_date'        => $dueDate,
                'completed_at'    => $completedAt,
                'estimated_hours' => rand(8, 80),
                'logged_hours'    => $t[1] === 'done' ? rand(8, 80) : rand(0, 40),
                'labels'          => json_encode(['infrastructure', 'sécurité']),
                'created_at'      => $now->copy()->subWeeks(3),
                'updated_at'      => now(),
            ]);
        }

        // ── Commentaires sur quelques tâches ─────────────────────────────────
        $allTaskIds = DB::table('tasks')->where('organization_id', $orgId)->pluck('id')->toArray();
        $commentExamples = [
            'Avancement conforme au planning prévu.',
            'Des points bloquants ont été identifiés, réunion de déblocage planifiée.',
            'En attente de validation de la direction avant de continuer.',
            'Tâche plus complexe que prévu, estimation révisée à la hausse.',
            'Livrable soumis pour review, retours attendus sous 48h.',
            'Ressources supplémentaires nécessaires pour respecter le délai.',
            'Documentation en cours de rédaction en parallèle.',
            'Tests unitaires passés avec succès, passage en intégration.',
            'Problème technique identifié et en cours de résolution.',
            'Excellent travail, livrable validé par le client.',
        ];

        $selectedTasks = array_slice($allTaskIds, 0, 15);
        foreach ($selectedTasks as $taskId) {
            $nbComments = rand(1, 4);
            for ($c = 0; $c < $nbComments; $c++) {
                DB::table('task_comments')->insert([
                    'task_id'    => $taskId,
                    'user_id'    => $users[array_rand($users)],
                    'content'    => $commentExamples[array_rand($commentExamples)],
                    'created_at' => now()->subDays(rand(0, 20)),
                    'updated_at' => now(),
                ]);
            }
        }

        $totalTasks = DB::table('tasks')->where('organization_id', $orgId)->count();
        $this->command->info("  ✅ 3 projets + {$totalTasks} tâches (sous-tâches incluses) + commentaires créés.");
    }
}
