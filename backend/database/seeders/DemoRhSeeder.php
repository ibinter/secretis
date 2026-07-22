<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DemoRhSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('👥 Création des données RH...');

        $org = DB::table('organizations')->where('slug', 'cabinet-conseil-demo')->first();
        if (! $org) {
            $this->command->error('Organisation démo introuvable.');
            return;
        }
        $orgId   = $org->id;
        $users   = DB::table('users')->where('organization_id', $orgId)->get();
        $userIds = $users->pluck('id')->toArray();
        $depts   = DB::table('departments')->where('organization_id', $orgId)->pluck('id')->toArray();

        $now = Carbon::now();

        // ── 15 Fiches employés ───────────────────────────────────────────────
        $employeeDefs = [
            // user_idx, job_title, contract, salary, hire_date, status, dept_idx
            [0,  'Directeur Général',            'CDI',        850000, '-5 years',  'active',   0],
            [1,  'Directrice Administrative',    'CDI',        650000, '-4 years',  'active',   0],
            [2,  'Secrétaire de Direction',      'CDI',        320000, '-3 years',  'active',   1],
            [3,  'Secrétaire Administrative',    'CDI',        280000, '-2 years',  'active',   1],
            [4,  'Hôtesse d\'Accueil',           'CDI',        250000, '-18 months','active',   1],
            [5,  'Responsable RH',               'CDI',        480000, '-4 years',  'active',   2],
            [6,  'Chargée RH',                   'CDI',        320000, '-2 years',  'active',   2],
            [7,  'Commercial Senior',             'CDI',        420000, '-3 years',  'active',   3],
            [8,  'Chargée Marketing',             'CDI',        350000, '-2 years',  'active',   3],
            [9,  'Commercial Junior',             'CDD',        280000, '-8 months', 'active',   3],
            [10, 'Responsable IT',                'CDI',        550000, '-5 years',  'active',   4],
            [11, 'Développeur Full Stack',        'CDI',        420000, '-2 years',  'active',   4],
            [12, 'Comptable',                     'CDI',        380000, '-3 years',  'active',   0],
            [13, 'Chef de Projet Digital',        'CDI',        500000, '-1 year',   'active',   4],
            [14, 'Stagiaire Marketing',           'stage',      80000,  '-3 months', 'active',   3],
        ];

        $employeeIds = [];
        foreach ($employeeDefs as $i => $e) {
            $user     = $users[$e[0]];
            $hireDate = Carbon::parse($e[4]);
            $deptIdx  = min($e[6], count($depts) - 1);

            $employeeIds[] = DB::table('employees')->insertGetId([
                'organization_id'        => $orgId,
                'user_id'                => $user->id,
                'department_id'          => $depts[$deptIdx],
                'employee_number'        => 'EMP-' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'first_name'             => $user->first_name,
                'last_name'              => $user->last_name,
                'email'                  => $user->email,
                'phone'                  => '+225 07 ' . rand(10, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99),
                'job_title'              => $e[1],
                'contract_type'          => $e[2],
                'hire_date'              => $hireDate->format('Y-m-d'),
                'base_salary'            => $e[3],
                'birth_date'             => $now->copy()->subYears(rand(24, 50))->format('Y-m-d'),
                'nationality'            => 'CI',
                'address'               => 'Abidjan, Côte d\'Ivoire',
                'emergency_contact_name' => 'Contact d\'Urgence ' . $user->last_name,
                'emergency_contact_phone'=> '+225 05 ' . rand(10, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99),
                'status'                 => $e[5],
                'leave_balance'          => json_encode([
                    'annual'      => rand(10, 25),
                    'sick'        => 15,
                    'compassionate'=> 3,
                    'taken_annual'=> rand(0, 15),
                ]),
                'created_at'             => $hireDate,
                'updated_at'             => now(),
            ]);
        }

        // ── 10 Demandes de congé ─────────────────────────────────────────────
        $leaveTypes = ['annual', 'sick', 'annual', 'annual', 'maternity', 'annual', 'compassionate', 'annual', 'sick', 'annual'];
        $leaveStatuses = [
            ['pending',  null,      null],
            ['approved', 2,         -5],
            ['approved', 0,         -10],
            ['rejected', 0,         -3],
            ['approved', 2,         -15],
            ['pending',  null,      null],
            ['approved', 0,         -7],
            ['cancelled',null,      null],
            ['pending',  null,      null],
            ['approved', 1,         -8],
        ];

        $leaveReasons = [
            'Congé annuel planifié - vacances en famille',
            'Arrêt maladie - certificat médical joint',
            'Congé annuel - Voyage professionnel familial',
            'Congé pour événement familial important',
            'Congé maternité - naissance premier enfant',
            'Repos et récupération - fatigue professionnelle',
            'Décès d\'un proche - condoléances',
            'Annulé suite à impératif professionnel',
            'Consultation médicale spécialisée',
            'Congé annuel été',
        ];

        foreach ($employeeIds as $i => $empId) {
            if ($i >= 10) break;

            $type       = $leaveTypes[$i];
            $statusDef  = $leaveStatuses[$i];
            $status     = $statusDef[0];
            $approverId = $statusDef[1] !== null ? $userIds[$statusDef[1]] : null;
            $approvedAt = $statusDef[2] !== null ? $now->copy()->addDays($statusDef[2]) : null;

            $startDays  = rand(5, 30);
            $duration   = $type === 'maternity' ? 98 : rand(1, 15);
            $startDate  = $now->copy()->addDays($startDays);
            $endDate    = $startDate->copy()->addDays($duration - 1);

            DB::table('leave_requests')->insert([
                'organization_id' => $orgId,
                'employee_id'     => $empId,
                'approved_by'     => $approverId,
                'type'            => $type,
                'start_date'      => $startDate->format('Y-m-d'),
                'end_date'        => $endDate->format('Y-m-d'),
                'working_days'    => $duration,
                'reason'          => $leaveReasons[$i],
                'status'          => $status,
                'approved_at'     => $approvedAt,
                'rejection_reason'=> $status === 'rejected' ? 'Période trop chargée, reporter après le projet CRM.' : null,
                'created_at'      => $now->copy()->subDays(rand(5, 20)),
                'updated_at'      => now(),
            ]);
        }

        // ── 5 Notes de frais ─────────────────────────────────────────────────
        $expenseStatuses = ['approved', 'submitted', 'draft', 'paid', 'rejected'];
        $expenseTitles = [
            'Déplacement client Bouaké - Octobre 2024',
            'Fournitures bureau - Novembre 2024',
            'Repas d\'affaires partenaire NSIA',
            'Formation externe React/Vue.js',
            'Carburant véhicule service - Novembre 2024',
        ];

        foreach (array_slice($employeeIds, 5, 5) as $i => $empId) {
            $status = $expenseStatuses[$i];
            $expenses = [
                ['category' => 'transport',      'amount' => rand(5000, 50000),  'date' => $now->copy()->subDays(rand(5, 30))->format('Y-m-d'), 'description' => 'Taxi / Transport'],
                ['category' => 'hebergement',    'amount' => rand(20000, 80000), 'date' => $now->copy()->subDays(rand(5, 25))->format('Y-m-d'), 'description' => 'Hôtel'],
                ['category' => 'restauration',   'amount' => rand(5000, 25000),  'date' => $now->copy()->subDays(rand(5, 20))->format('Y-m-d'), 'description' => 'Repas'],
            ];
            $total = array_sum(array_column($expenses, 'amount'));

            DB::table('expense_reports')->insert([
                'organization_id' => $orgId,
                'employee_id'     => $empId,
                'approved_by'     => in_array($status, ['approved', 'paid']) ? $userIds[0] : null,
                'title'           => $expenseTitles[$i],
                'description'     => 'Note de frais professionnels - ' . $expenseTitles[$i],
                'expenses'        => json_encode($expenses),
                'total_amount'    => $total,
                'currency'        => 'XOF',
                'status'          => $status,
                'submitted_at'    => $status !== 'draft' ? $now->copy()->subDays(rand(3, 15)) : null,
                'approved_at'     => in_array($status, ['approved', 'paid']) ? $now->copy()->subDays(rand(1, 10)) : null,
                'paid_at'         => $status === 'paid' ? $now->copy()->subDays(rand(0, 5)) : null,
                'rejection_reason'=> $status === 'rejected' ? 'Justificatifs insuffisants, veuillez compléter le dossier.' : null,
                'created_at'      => $now->copy()->subDays(rand(10, 30)),
                'updated_at'      => now(),
            ]);
        }

        $this->command->info('  ✅ 15 fiches employés, 10 demandes congé, 5 notes de frais créées.');
    }
}
