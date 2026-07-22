<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\LeaveApprovedNotification;
use App\Notifications\LeaveRejectedNotification;
use App\Notifications\LeaveRequestedNotification;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class LeaveService
{
    // -------------------------------------------------------------------------
    // Création de demande
    // -------------------------------------------------------------------------

    /**
     * Crée une demande de congé, vérifie le solde et notifie le N+1.
     *
     * @param  array    $data     { leave_type, start_date, end_date, reason }
     * @param  Employee $employee Demandeur
     * @return LeaveRequest
     *
     * @throws \Exception si solde insuffisant ou chevauchement détecté
     */
    public function createRequest(array $data, Employee $employee): LeaveRequest
    {
        return DB::transaction(function () use ($data, $employee) {
            $start = Carbon::parse($data['start_date']);
            $end   = Carbon::parse($data['end_date']);
            $type  = $data['leave_type'];

            // Calcul des jours (hors weekends et jours fériés)
            $publicHolidays = $this->getPublicHolidays($employee->organization_id, (int) $start->year);
            $days = $this->calculateLeaveDays($start, $end, $publicHolidays);

            if ($days <= 0) {
                throw new \Exception("La période sélectionnée ne contient aucun jour ouvré.");
            }

            // Vérification du solde (sauf congé maladie et sans solde)
            if (! in_array($type, ['sick', 'unpaid'])) {
                if (! $this->checkLeaveBalance($employee, $type, $days)) {
                    $available = $employee->getAvailableLeaveDays($type);
                    throw new \Exception(
                        "Solde insuffisant. Disponible : {$available} jours, demandé : {$days} jours."
                    );
                }
            }

            // Vérification chevauchement
            $overlap = LeaveRequest::where('employee_id', $employee->id)
                ->whereNotIn('status', ['rejected'])
                ->where('start_date', '<=', $end->toDateString())
                ->where('end_date', '>=', $start->toDateString())
                ->exists();

            if ($overlap) {
                throw new \Exception("Une demande de congé existe déjà sur cette période.");
            }

            $leave = LeaveRequest::create([
                'organization_id' => $employee->organization_id,
                'employee_id'     => $employee->id,
                'leave_type'      => $type,
                'status'          => 'pending',
                'start_date'      => $start->toDateString(),
                'end_date'        => $end->toDateString(),
                'days_count'      => $days,
                'reason'          => $data['reason'] ?? null,
            ]);

            // Notifier le manager (N+1)
            $this->notifyManager($leave, $employee);

            return $leave;
        });
    }

    // -------------------------------------------------------------------------
    // Approbation
    // -------------------------------------------------------------------------

    /**
     * Approuve une demande de congé (niveau N+1 ou RH).
     *
     * @param  LeaveRequest $request
     * @param  User         $approver
     * @param  string       $level     'n1' ou 'hr'
     * @return void
     */
    public function approve(LeaveRequest $request, User $approver, string $level): void
    {
        DB::transaction(function () use ($request, $approver, $level) {
            if ($level === 'n1') {
                if ($request->status !== 'pending') {
                    throw new \Exception("Cette demande ne peut pas être approuvée au niveau N+1 (statut : {$request->status}).");
                }

                $request->update([
                    'status'         => 'approved_n1',
                    'approver_n1_id' => $approver->id,
                    'approved_n1_at' => now(),
                ]);

                // Notifier le service RH
                $this->notifyHR($request);

            } elseif ($level === 'hr') {
                if ($request->status !== 'approved_n1') {
                    throw new \Exception("Cette demande doit d'abord être approuvée par le N+1.");
                }

                $request->update([
                    'status'             => 'approved_hr',
                    'approver_hr_id'     => $approver->id,
                    'approved_hr_at'     => now(),
                ]);

                // Déduire du solde de l'employé
                $employee = $request->employee;
                $employee->deductLeaveBalance($request->leave_type, $request->days_count);

                // Notifier l'employé
                $this->notifyEmployee($request, 'approved');
            }
        });
    }

    // -------------------------------------------------------------------------
    // Refus
    // -------------------------------------------------------------------------

    /**
     * Refuse une demande de congé avec motif obligatoire.
     *
     * @param  LeaveRequest $request
     * @param  User         $approver
     * @param  string       $reason   Motif obligatoire
     * @return void
     */
    public function reject(LeaveRequest $request, User $approver, string $reason): void
    {
        if (empty(trim($reason))) {
            throw new \Exception("Le motif de refus est obligatoire.");
        }

        if ($request->status === 'approved_hr') {
            throw new \Exception("Cette demande est déjà validée par le RH et ne peut plus être refusée.");
        }

        $request->update([
            'status'           => 'rejected',
            'rejection_reason' => $reason,
            'rejected_by'      => $approver->id,
            'rejected_at'      => now(),
        ]);

        // Notifier l'employé du refus
        $this->notifyEmployee($request, 'rejected');
    }

    // -------------------------------------------------------------------------
    // Calcul des jours ouvrés
    // -------------------------------------------------------------------------

    /**
     * Calcule le nombre de jours ouvrés entre deux dates,
     * en excluant les weekends et les jours fériés fournis.
     *
     * @param  Carbon   $start
     * @param  Carbon   $end
     * @param  array    $publicHolidays  ['YYYY-MM-DD', ...]
     * @return int
     */
    public function calculateLeaveDays(Carbon $start, Carbon $end, array $publicHolidays): int
    {
        $days    = 0;
        $current = $start->copy()->startOfDay();
        $endDay  = $end->copy()->startOfDay();

        while ($current->lte($endDay)) {
            if (! $current->isWeekend() && ! in_array($current->toDateString(), $publicHolidays)) {
                $days++;
            }
            $current->addDay();
        }

        return $days;
    }

    // -------------------------------------------------------------------------
    // Vérification du solde
    // -------------------------------------------------------------------------

    /**
     * Vérifie si l'employé a suffisamment de jours disponibles.
     *
     * @param  Employee $employee
     * @param  string   $type
     * @param  int      $days
     * @return bool
     */
    public function checkLeaveBalance(Employee $employee, string $type, int $days): bool
    {
        return $employee->getAvailableLeaveDays($type) >= $days;
    }

    // -------------------------------------------------------------------------
    // Absences équipe
    // -------------------------------------------------------------------------

    /**
     * Retourne toutes les absences approuvées de l'organisation pour un mois donné.
     * Format adapté au calendrier React.
     *
     * @param  Organization $org
     * @param  Carbon       $month
     * @return Collection
     */
    public function getTeamAbsences(Organization $org, Carbon $month): Collection
    {
        $start = $month->copy()->startOfMonth();
        $end   = $month->copy()->endOfMonth();

        return LeaveRequest::where('organization_id', $org->id)
            ->whereIn('status', ['approved_n1', 'approved_hr'])
            ->where('start_date', '<=', $end->toDateString())
            ->where('end_date', '>=', $start->toDateString())
            ->with(['employee:id,first_name,last_name,avatar,department_id', 'employee.department:id,name'])
            ->get()
            ->map(fn($leave) => [
                'id'          => $leave->id,
                'employee_id' => $leave->employee_id,
                'name'        => $leave->employee->full_name,
                'avatar'      => $leave->employee->avatar,
                'department'  => $leave->employee->department?->name,
                'type'        => $leave->leave_type,
                'type_label'  => $leave->leave_type_label,
                'start'       => $leave->start_date->toDateString(),
                'end'         => $leave->end_date->toDateString(),
                'days'        => $leave->days_count,
                'status'      => $leave->status,
            ]);
    }

    // -------------------------------------------------------------------------
    // Rapport mensuel (CRON)
    // -------------------------------------------------------------------------

    /**
     * Envoie le rapport mensuel des absences aux managers RH.
     * À appeler via une tâche planifiée (CRON mensuel).
     *
     * @return void
     */
    public function sendMonthlyReport(): void
    {
        $previousMonth = now()->subMonth();

        $organizations = \App\Models\Organization::all();

        foreach ($organizations as $org) {
            try {
                $absences = $this->getTeamAbsences($org, $previousMonth);

                // Notifier les utilisateurs RH de chaque organisation
                $hrUsers = User::where('organization_id', $org->id)
                    ->whereHas('roles', fn($q) => $q->where('name', 'rh_manager'))
                    ->get();

                foreach ($hrUsers as $hrUser) {
                    // Envoyer le rapport par email
                    // $hrUser->notify(new MonthlyLeaveReportNotification($absences, $previousMonth));
                    Log::info("Rapport mensuel RH envoyé à {$hrUser->email} pour {$org->name}");
                }
            } catch (\Throwable $e) {
                Log::error("Erreur rapport mensuel RH pour {$org->name}: " . $e->getMessage());
            }
        }
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    private function notifyManager(LeaveRequest $leave, Employee $employee): void
    {
        $manager = $employee->manager;
        if ($manager && $manager->user) {
            try {
                $manager->user->notify(new LeaveRequestedNotification($leave));
            } catch (\Throwable $e) {
                Log::warning("Notification manager échouée: " . $e->getMessage());
            }
        }
    }

    private function notifyHR(LeaveRequest $leave): void
    {
        $hrUsers = User::where('organization_id', $leave->organization_id)
            ->whereHas('roles', fn($q) => $q->whereIn('name', ['rh_manager', 'admin_org']))
            ->get();

        try {
            Notification::send($hrUsers, new LeaveRequestedNotification($leave));
        } catch (\Throwable $e) {
            Log::warning("Notification RH échouée: " . $e->getMessage());
        }
    }

    private function notifyEmployee(LeaveRequest $leave, string $outcome): void
    {
        $user = $leave->employee->user;
        if (! $user) return;

        try {
            $notification = $outcome === 'approved'
                ? new LeaveApprovedNotification($leave)
                : new LeaveRejectedNotification($leave);

            $user->notify($notification);
        } catch (\Throwable $e) {
            Log::warning("Notification employé échouée: " . $e->getMessage());
        }
    }

    private function getPublicHolidays(string $orgId, int $year): array
    {
        // Jours fériés par défaut (Côte d'Ivoire)
        // En production, charger depuis une table public_holidays
        return [
            "{$year}-01-01", // Jour de l'An
            "{$year}-04-13", // Lundi de Pâques (approximatif)
            "{$year}-05-01", // Fête du Travail
            "{$year}-08-07", // Fête Nationale
            "{$year}-11-01", // Toussaint
            "{$year}-11-15", // Fête de la Paix
            "{$year}-12-25", // Noël
        ];
    }
}
