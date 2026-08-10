<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Service principal Business Intelligence — IBIG SECRETIS
 * Toutes les requêtes sont filtrées par organization_id (multi-tenant).
 */
class BiService
{
    // -------------------------------------------------------------------------
    // COURRIERS / CORRESPONDANCE
    // -------------------------------------------------------------------------

    public function getCorrespondenceAnalytics(int $orgId, Carbon $start, Carbon $end): array
    {
        $days = $start->diffInDays($end) + 1;
        $granularity = $days <= 31 ? 'day' : ($days <= 90 ? 'week' : 'month');

        // Time series : volume par période
        $timeSeries = DB::table('mail_registries')
            ->select(
                DB::raw("DATE_TRUNC('{$granularity}', created_at) AS period"),
                DB::raw('COUNT(*) AS total'),
                DB::raw("SUM(CASE WHEN type = 'entrant' THEN 1 ELSE 0 END) AS incoming"),
                DB::raw("SUM(CASE WHEN type = 'sortant' THEN 1 ELSE 0 END) AS outgoing")
            )
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn($r) => [
                'period'   => $r->period,
                'total'    => (int) $r->total,
                'incoming' => (int) $r->incoming,
                'outgoing' => (int) $r->outgoing,
            ])
            ->toArray();

        // Répartition par urgence
        $byUrgency = DB::table('mail_registries')
            ->select('urgency', DB::raw('COUNT(*) AS total'))
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('urgency')
            ->groupBy('urgency')
            ->get()
            ->mapWithKeys(fn($r) => [$r->urgency => (int) $r->total])
            ->toArray();

        // Délai moyen de traitement (minutes)
        $avgProcessingTime = DB::table('mail_registries')
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('processed_at')
            ->select(DB::raw("AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) / 60) AS avg_minutes"))
            ->value('avg_minutes');

        // Délai de traitement jour par jour (tendance)
        $processingTrend = DB::table('mail_registries')
            ->select(
                DB::raw("DATE_TRUNC('{$granularity}', created_at) AS period"),
                DB::raw("AVG(EXTRACT(EPOCH FROM (processed_at - created_at)) / 60) AS avg_minutes")
            )
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('processed_at')
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn($r) => ['period' => $r->period, 'avg_minutes' => round((float) $r->avg_minutes, 1)])
            ->toArray();

        // Top 5 expéditeurs
        $topSenders = DB::table('mail_registries')
            ->select('sender', DB::raw('COUNT(*) AS total'))
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->where('type', 'entrant')
            ->whereNotNull('sender')
            ->groupBy('sender')
            ->orderByDesc('total')
            ->limit(5)
            ->pluck('total', 'sender')
            ->toArray();

        // Top 5 destinataires
        $topRecipients = DB::table('mail_registries')
            ->select('recipient', DB::raw('COUNT(*) AS total'))
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->where('type', 'sortant')
            ->whereNotNull('recipient')
            ->groupBy('recipient')
            ->orderByDesc('total')
            ->limit(5)
            ->pluck('total', 'recipient')
            ->toArray();

        // Taux SLA (traités dans les 48h)
        $slaHours    = 48;
        $totalMails  = DB::table('mail_registries')->where('organization_id', $orgId)->whereBetween('created_at', [$start, $end])->count();
        $inSlaMails  = DB::table('mail_registries')
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('processed_at')
            ->whereRaw("EXTRACT(EPOCH FROM (processed_at - created_at)) / 3600 <= ?", [$slaHours])
            ->count();
        $slaRate = $totalMails > 0 ? round(($inSlaMails / $totalMails) * 100, 1) : 0;

        return [
            'summary' => [
                'total'              => $totalMails,
                'avg_processing_min' => round((float) $avgProcessingTime, 1),
                'sla_rate'           => $slaRate,
                'period_days'        => $days,
            ],
            'time_series'      => $timeSeries,
            'by_urgency'       => $byUrgency,
            'processing_trend' => $processingTrend,
            'top_senders'      => $topSenders,
            'top_recipients'   => $topRecipients,
        ];
    }

    // -------------------------------------------------------------------------
    // TÂCHES
    // -------------------------------------------------------------------------

    public function getTaskAnalytics(int $orgId, Carbon $start, Carbon $end): array
    {
        $days        = $start->diffInDays($end) + 1;
        $granularity = $days <= 31 ? 'day' : ($days <= 90 ? 'week' : 'month');

        // Créées vs terminées par période
        $createdVsDone = DB::table('tasks')
            ->select(
                DB::raw("DATE_TRUNC('{$granularity}', created_at) AS period"),
                DB::raw('COUNT(*) AS created'),
                DB::raw("SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed")
            )
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn($r) => [
                'period'    => $r->period,
                'created'   => (int) $r->created,
                'completed' => (int) $r->completed,
            ])
            ->toArray();

        // Taux de complétion par projet
        $byProject = DB::table('tasks')
            ->join('projects', 'tasks.project_id', '=', 'projects.id')
            ->select(
                'projects.name AS project',
                DB::raw('COUNT(*) AS total'),
                DB::raw("SUM(CASE WHEN tasks.status = 'done' THEN 1 ELSE 0 END) AS completed")
            )
            ->where('tasks.organization_id', $orgId)
            ->whereBetween('tasks.created_at', [$start, $end])
            ->groupBy('projects.id', 'projects.name')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'project'    => $r->project,
                'total'      => (int) $r->total,
                'completed'  => (int) $r->completed,
                'rate'       => $r->total > 0 ? round(($r->completed / $r->total) * 100, 1) : 0,
            ])
            ->toArray();

        // Temps moyen par tâche (en heures)
        $avgDuration = DB::table('tasks')
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->where('status', 'done')
            ->whereNotNull('completed_at')
            ->selectRaw("AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) AS avg_hours")
            ->value('avg_hours');

        // Par assigné
        $byAssignee = DB::table('tasks')
            ->join('users', 'tasks.assigned_to', '=', 'users.id')
            ->select(
                DB::raw("CONCAT(users.first_name, ' ', users.last_name) AS assignee"),
                DB::raw('COUNT(*) AS total'),
                DB::raw("SUM(CASE WHEN tasks.status = 'done' THEN 1 ELSE 0 END) AS completed")
            )
            ->where('tasks.organization_id', $orgId)
            ->whereBetween('tasks.created_at', [$start, $end])
            ->whereNotNull('tasks.assigned_to')
            ->groupBy('users.id', 'users.first_name', 'users.last_name')
            ->orderByDesc('completed')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'assignee'  => $r->assignee,
                'total'     => (int) $r->total,
                'completed' => (int) $r->completed,
            ])
            ->toArray();

        // Distribution par priorité
        $byPriority = DB::table('tasks')
            ->select('priority', DB::raw('COUNT(*) AS total'))
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('priority')
            ->groupBy('priority')
            ->pluck('total', 'priority')
            ->toArray();

        // Distribution par statut
        $byStatus = DB::table('tasks')
            ->select('status', DB::raw('COUNT(*) AS total'))
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        // Burndown data (idéal vs réel) — sur la période
        $burndownIdeal = [];
        $burndownReal  = [];
        $totalTasks    = array_sum(array_column($createdVsDone, 'created'));
        $remaining     = $totalTasks;
        $daysArr       = [];
        $current       = $start->copy();
        while ($current->lte($end)) {
            $daysArr[] = $current->toDateString();
            $current->addDay();
        }
        $idealDecrement = $totalTasks > 0 && count($daysArr) > 1 ? $totalTasks / (count($daysArr) - 1) : 0;
        $idealRemaining = $totalTasks;
        $completedPerDay = DB::table('tasks')
            ->where('organization_id', $orgId)
            ->where('status', 'done')
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$start, $end])
            ->select(DB::raw('DATE(completed_at) AS day'), DB::raw('COUNT(*) AS cnt'))
            ->groupBy('day')
            ->pluck('cnt', 'day')
            ->toArray();
        $realRemaining = $totalTasks;
        foreach ($daysArr as $day) {
            $burndownIdeal[] = ['day' => $day, 'remaining' => max(0, round($idealRemaining))];
            $idealRemaining -= $idealDecrement;
            $realRemaining  -= (int) ($completedPerDay[$day] ?? 0);
            $burndownReal[]  = ['day' => $day, 'remaining' => max(0, $realRemaining)];
        }

        // KPI globaux
        $total      = DB::table('tasks')->where('organization_id', $orgId)->whereBetween('created_at', [$start, $end])->count();
        $completed  = DB::table('tasks')->where('organization_id', $orgId)->whereBetween('created_at', [$start, $end])->where('status', 'done')->count();
        $overdue    = DB::table('tasks')
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->where('status', '!=', 'done')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();

        return [
            'summary' => [
                'total'          => $total,
                'completed'      => $completed,
                'overdue'        => $overdue,
                'completion_rate'=> $total > 0 ? round(($completed / $total) * 100, 1) : 0,
                'avg_hours'      => round((float) $avgDuration, 1),
            ],
            'created_vs_done' => $createdVsDone,
            'by_project'      => $byProject,
            'by_assignee'     => $byAssignee,
            'by_priority'     => $byPriority,
            'by_status'       => $byStatus,
            'burndown_ideal'  => $burndownIdeal,
            'burndown_real'   => $burndownReal,
        ];
    }

    // -------------------------------------------------------------------------
    // RÉUNIONS
    // -------------------------------------------------------------------------

    public function getMeetingAnalytics(int $orgId, Carbon $start, Carbon $end): array
    {
        $days        = $start->diffInDays($end) + 1;
        $granularity = $days <= 31 ? 'day' : ($days <= 90 ? 'week' : 'month');

        // Volume par semaine
        $byPeriod = DB::table('meetings')
            ->select(
                DB::raw("DATE_TRUNC('{$granularity}', start_time) AS period"),
                DB::raw('COUNT(*) AS total')
            )
            ->where('organization_id', $orgId)
            ->whereBetween('start_time', [$start, $end])
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn($r) => ['period' => $r->period, 'total' => (int) $r->total])
            ->toArray();

        // Durée moyenne planifiée vs réelle (minutes)
        $durations = DB::table('meetings')
            ->where('organization_id', $orgId)
            ->whereBetween('start_time', [$start, $end])
            ->selectRaw("
                AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)       AS avg_planned,
                AVG(EXTRACT(EPOCH FROM (actual_end_time - actual_start_time)) / 60) AS avg_actual
            ")
            ->first();

        // Taux d'acceptation des invitations
        $invitations = DB::table('meeting_participants')
            ->join('meetings', 'meeting_participants.meeting_id', '=', 'meetings.id')
            ->where('meetings.organization_id', $orgId)
            ->whereBetween('meetings.start_time', [$start, $end])
            ->select(
                DB::raw('COUNT(*) AS total'),
                DB::raw("SUM(CASE WHEN meeting_participants.status = 'accepted' THEN 1 ELSE 0 END) AS accepted")
            )
            ->first();
        $acceptanceRate = $invitations->total > 0
            ? round(($invitations->accepted / $invitations->total) * 100, 1)
            : 0;

        // Salles les plus utilisées
        $topRooms = DB::table('meetings')
            ->join('rooms', 'meetings.room_id', '=', 'rooms.id')
            ->select('rooms.name AS room', DB::raw('COUNT(*) AS total'))
            ->where('meetings.organization_id', $orgId)
            ->whereBetween('meetings.start_time', [$start, $end])
            ->whereNotNull('meetings.room_id')
            ->groupBy('rooms.id', 'rooms.name')
            ->orderByDesc('total')
            ->limit(5)
            ->pluck('total', 'room')
            ->toArray();

        // Avec vs sans compte rendu
        $withMinutes    = DB::table('meetings')->where('organization_id', $orgId)->whereBetween('start_time', [$start, $end])->whereNotNull('minutes_url')->count();
        $withoutMinutes = DB::table('meetings')->where('organization_id', $orgId)->whereBetween('start_time', [$start, $end])->whereNull('minutes_url')->count();

        // Décisions extraites par type
        $decisions = DB::table('meeting_decisions')
            ->join('meetings', 'meeting_decisions.meeting_id', '=', 'meetings.id')
            ->where('meetings.organization_id', $orgId)
            ->whereBetween('meetings.start_time', [$start, $end])
            ->select('meeting_decisions.type', DB::raw('COUNT(*) AS total'))
            ->groupBy('meeting_decisions.type')
            ->pluck('total', 'type')
            ->toArray();

        $totalDecisions = array_sum($decisions);

        return [
            'summary' => [
                'total'           => DB::table('meetings')->where('organization_id', $orgId)->whereBetween('start_time', [$start, $end])->count(),
                'avg_planned_min' => round((float) ($durations->avg_planned ?? 0), 1),
                'avg_actual_min'  => round((float) ($durations->avg_actual ?? 0), 1),
                'acceptance_rate' => $acceptanceRate,
                'with_minutes'    => $withMinutes,
                'without_minutes' => $withoutMinutes,
                'total_decisions' => $totalDecisions,
            ],
            'by_period'      => $byPeriod,
            'top_rooms'      => $topRooms,
            'decisions'      => $decisions,
        ];
    }

    // -------------------------------------------------------------------------
    // RH (RESSOURCES HUMAINES)
    // -------------------------------------------------------------------------

    public function getHrAnalytics(int $orgId, Carbon $start, Carbon $end): array
    {
        // Absentéisme par département
        $absenceByDept = DB::table('leave_requests')
            ->join('users', 'leave_requests.user_id', '=', 'users.id')
            ->join('departments', 'users.department_id', '=', 'departments.id')
            ->select(
                'departments.name AS department',
                DB::raw("SUM(leave_requests.days) AS total_days"),
                DB::raw("COUNT(DISTINCT users.id) AS nb_employees")
            )
            ->where('leave_requests.organization_id', $orgId)
            ->where('leave_requests.status', 'approved')
            ->whereBetween('leave_requests.start_date', [$start, $end])
            ->groupBy('departments.id', 'departments.name')
            ->orderByDesc('total_days')
            ->get()
            ->map(fn($r) => [
                'department'   => $r->department,
                'total_days'   => (float) $r->total_days,
                'nb_employees' => (int) $r->nb_employees,
            ])
            ->toArray();

        // Répartition des congés par type
        $byLeaveType = DB::table('leave_requests')
            ->select('type', DB::raw('COUNT(*) AS total'), DB::raw('SUM(days) AS total_days'))
            ->where('organization_id', $orgId)
            ->where('status', 'approved')
            ->whereBetween('start_date', [$start, $end])
            ->groupBy('type')
            ->get()
            ->map(fn($r) => [
                'type'       => $r->type,
                'total'      => (int) $r->total,
                'total_days' => (float) $r->total_days,
            ])
            ->toArray();

        // Notes de frais par catégorie et département
        $expensesByCategory = DB::table('expense_reports')
            ->select('category', DB::raw('SUM(amount) AS total'), DB::raw('COUNT(*) AS nb'))
            ->where('organization_id', $orgId)
            ->where('status', 'approved')
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('category')
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => [
                'category' => $r->category,
                'total'    => (float) $r->total,
                'nb'       => (int) $r->nb,
            ])
            ->toArray();

        $expensesByDept = DB::table('expense_reports')
            ->join('users', 'expense_reports.user_id', '=', 'users.id')
            ->join('departments', 'users.department_id', '=', 'departments.id')
            ->select('departments.name AS department', DB::raw('SUM(expense_reports.amount) AS total'))
            ->where('expense_reports.organization_id', $orgId)
            ->where('expense_reports.status', 'approved')
            ->whereBetween('expense_reports.created_at', [$start, $end])
            ->groupBy('departments.id', 'departments.name')
            ->orderByDesc('total')
            ->limit(10)
            ->pluck('total', 'department')
            ->toArray();

        // Délai moyen d'approbation des congés (heures)
        $avgApprovalDelay = DB::table('leave_requests')
            ->where('organization_id', $orgId)
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('approved_at')
            ->selectRaw("AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 3600) AS avg_hours")
            ->value('avg_hours');

        return [
            'summary' => [
                'total_absences'      => array_sum(array_column($byLeaveType, 'total')),
                'total_absence_days'  => array_sum(array_column($byLeaveType, 'total_days')),
                'total_expenses'      => array_sum(array_column($expensesByCategory, 'total')),
                'avg_approval_hours'  => round((float) $avgApprovalDelay, 1),
            ],
            'absence_by_dept'     => $absenceByDept,
            'by_leave_type'       => $byLeaveType,
            'expenses_by_category'=> $expensesByCategory,
            'expenses_by_dept'    => $expensesByDept,
        ];
    }

    // -------------------------------------------------------------------------
    // VISITEURS
    // -------------------------------------------------------------------------

    public function getVisitorAnalytics(int $orgId, Carbon $start, Carbon $end): array
    {
        $days        = $start->diffInDays($end) + 1;
        $granularity = $days <= 7 ? 'hour' : ($days <= 31 ? 'day' : 'week');

        // Flux par période
        $flux = DB::table('visitors')
            ->select(
                DB::raw("DATE_TRUNC('{$granularity}', check_in_at) AS period"),
                DB::raw('COUNT(*) AS total')
            )
            ->where('organization_id', $orgId)
            ->whereBetween('check_in_at', [$start, $end])
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->map(fn($r) => ['period' => $r->period, 'total' => (int) $r->total])
            ->toArray();

        // Motifs les plus fréquents
        $byPurpose = DB::table('visitors')
            ->select('purpose', DB::raw('COUNT(*) AS total'))
            ->where('organization_id', $orgId)
            ->whereBetween('check_in_at', [$start, $end])
            ->whereNotNull('purpose')
            ->groupBy('purpose')
            ->orderByDesc('total')
            ->limit(8)
            ->pluck('total', 'purpose')
            ->toArray();

        // Temps d'attente moyen (minutes)
        $avgWait = DB::table('visitors')
            ->where('organization_id', $orgId)
            ->whereBetween('check_in_at', [$start, $end])
            ->whereNotNull('received_at')
            ->selectRaw("AVG(EXTRACT(EPOCH FROM (received_at - check_in_at)) / 60) AS avg_min")
            ->value('avg_min');

        // Heure de pointe (par tranche horaire, 0-23)
        $peakHours = DB::table('visitors')
            ->select(
                DB::raw("EXTRACT(HOUR FROM check_in_at) AS hour"),
                DB::raw('COUNT(*) AS total')
            )
            ->where('organization_id', $orgId)
            ->whereBetween('check_in_at', [$start, $end])
            ->groupBy('hour')
            ->orderByDesc('total')
            ->get()
            ->mapWithKeys(fn($r) => [(int) $r->hour => (int) $r->total])
            ->toArray();

        // RDV vs passage libre
        $rdv    = DB::table('visitors')->where('organization_id', $orgId)->whereBetween('check_in_at', [$start, $end])->where('type', 'appointment')->count();
        $walkin = DB::table('visitors')->where('organization_id', $orgId)->whereBetween('check_in_at', [$start, $end])->where('type', 'walk_in')->count();

        return [
            'summary' => [
                'total'        => DB::table('visitors')->where('organization_id', $orgId)->whereBetween('check_in_at', [$start, $end])->count(),
                'avg_wait_min' => round((float) $avgWait, 1),
                'appointments' => $rdv,
                'walk_ins'     => $walkin,
            ],
            'flux'       => $flux,
            'by_purpose' => $byPurpose,
            'peak_hours' => $peakHours,
        ];
    }

    // -------------------------------------------------------------------------
    // COMPTABILITÉ
    // -------------------------------------------------------------------------

    public function getAccountingAnalytics(int $orgId, Carbon $start, Carbon $end): array
    {
        // Revenus mensuels (facturé, encaissé, en attente)
        // Colonnes réelles de `invoices` : issue_date, total, payment_date
        // (et NON issued_at / total_amount / paid_at). Statuts : draft|sent|paid|overdue|cancelled.
        $revenueByMonth = DB::table('invoices')
            ->select(
                DB::raw("DATE_TRUNC('month', issue_date) AS month"),
                DB::raw("SUM(total) AS invoiced"),
                DB::raw("SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) AS collected"),
                DB::raw("SUM(CASE WHEN status IN ('sent','overdue') THEN total ELSE 0 END) AS pending")
            )
            ->where('organization_id', $orgId)
            ->whereBetween('issue_date', [$start, $end])
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn($r) => [
                'month'     => $r->month,
                'invoiced'  => (float) $r->invoiced,
                'collected' => (float) $r->collected,
                'pending'   => (float) $r->pending,
            ])
            ->toArray();

        // DSO (Days Sales Outstanding)
        $dso = DB::table('invoices')
            ->where('organization_id', $orgId)
            ->whereBetween('issue_date', [$start, $end])
            ->where('status', 'paid')
            ->whereNotNull('payment_date')
            ->selectRaw("AVG(payment_date - issue_date) AS avg_days")
            ->value('avg_days');

        // Top clients — la table est `accounting_clients` (il n'existe pas de table `clients`).
        // Colonnes qualifiées : les deux tables ont organization_id (sinon « ambiguous »).
        $topClients = DB::table('invoices')
            ->join('accounting_clients', 'invoices.client_id', '=', 'accounting_clients.id')
            ->select('accounting_clients.name AS client', DB::raw('SUM(invoices.total) AS total'))
            ->where('invoices.organization_id', $orgId)
            ->whereBetween('invoices.issue_date', [$start, $end])
            ->groupBy('accounting_clients.id', 'accounting_clients.name')
            ->orderByDesc('total')
            ->limit(5)
            ->pluck('total', 'client')
            ->toArray();

        // Taux de recouvrement par mois
        $recoveryRate = collect($revenueByMonth)->map(fn($m) => [
            'month' => $m['month'],
            'rate'  => $m['invoiced'] > 0 ? round(($m['collected'] / $m['invoiced']) * 100, 1) : 0,
        ])->toArray();

        // Dépenses par catégorie
        // Table réelle : `expenses` (pas `accounting_expenses`), catégorie via
        // expense_categories.name, date via expense_date.
        $expensesByCategory = DB::table('expenses')
            ->join('expense_categories', 'expense_categories.id', '=', 'expenses.category_id')
            ->select('expense_categories.name AS category', DB::raw('SUM(expenses.amount) AS total'))
            ->where('expenses.organization_id', $orgId)
            ->whereBetween('expenses.expense_date', [$start, $end])
            ->groupBy('expense_categories.name')
            ->orderByDesc('total')
            ->pluck('total', 'category')
            ->toArray();

        $totalInvoiced  = array_sum(array_column($revenueByMonth, 'invoiced'));
        $totalCollected = array_sum(array_column($revenueByMonth, 'collected'));

        return [
            'summary' => [
                'total_invoiced'  => $totalInvoiced,
                'total_collected' => $totalCollected,
                'total_pending'   => array_sum(array_column($revenueByMonth, 'pending')),
                'dso_days'        => round((float) $dso, 1),
                'recovery_rate'   => $totalInvoiced > 0 ? round(($totalCollected / $totalInvoiced) * 100, 1) : 0,
            ],
            'revenue_by_month'    => $revenueByMonth,
            'recovery_rate'       => $recoveryRate,
            'top_clients'         => $topClients,
            'expenses_by_category'=> $expensesByCategory,
        ];
    }

    // -------------------------------------------------------------------------
    // RAPPORT PERSONNALISÉ
    // -------------------------------------------------------------------------

    public function buildCustomReport(int $orgId, array $config): array
    {
        $module      = $config['module'] ?? 'correspondence';
        $metrics     = $config['metrics'] ?? [];
        $dimensions  = $config['dimensions'] ?? [];
        $filters     = $config['filters'] ?? [];
        $period      = $config['period'] ?? [];
        $granularity = $config['granularity'] ?? 'day';

        $start = isset($period['start']) ? Carbon::parse($period['start']) : now()->subMonth();
        $end   = isset($period['end'])   ? Carbon::parse($period['end'])   : now();

        // Dispatch vers la méthode dédiée selon le module
        $rawData = match ($module) {
            'correspondence' => $this->getCorrespondenceAnalytics($orgId, $start, $end),
            'tasks'          => $this->getTaskAnalytics($orgId, $start, $end),
            'meetings'       => $this->getMeetingAnalytics($orgId, $start, $end),
            'hr'             => $this->getHrAnalytics($orgId, $start, $end),
            'visitors'       => $this->getVisitorAnalytics($orgId, $start, $end),
            'accounting'     => $this->getAccountingAnalytics($orgId, $start, $end),
            default          => [],
        };

        // Filtrer uniquement les métriques demandées
        if (!empty($metrics)) {
            $rawData = array_intersect_key($rawData, array_flip($metrics));
        }

        return [
            'config'  => $config,
            'data'    => $rawData,
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
