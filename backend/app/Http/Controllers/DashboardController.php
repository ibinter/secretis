<?php

namespace App\Http\Controllers;

use App\Services\StatisticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * DashboardController — Tableaux de bord SECRETIS ERP
 *
 * Routes :
 *  GET /dashboard/executive     → executiveDashboard()
 *  GET /dashboard/secretariat   → secretariatDashboard()
 *  GET /api/dashboard/kpis      → apiKpis()
 *  GET /api/dashboard/trends    → apiTrends()
 */
class DashboardController extends Controller
{
    public function __construct(private StatisticsService $stats) {}

    // =========================================================================
    // PAGE DIRIGEANT
    // =========================================================================

    public function executiveDashboard(Request $request): InertiaResponse
    {
        $org   = $request->user()->organization;
        $kpis  = $this->stats->getKpiSummary($org);
        $trend = $this->stats->getTrends($org, 'mail', 30);
        $top   = $this->stats->getTopDepartments($org, 5);

        // Activité récente — 20 dernières actions d'audit avec relations
        $recentActivity = DB::select("
            SELECT
                al.id, al.action, al.module, al.resource_type, al.resource_id,
                al.created_at,
                u.name  AS user_name,
                u.avatar AS user_avatar
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            WHERE al.organization_id = :org
            ORDER BY al.created_at DESC
            LIMIT 20
        ", ['org' => $org->id]);

        // Tâches par statut pour BarChart
        $tasksByStatus = DB::select("
            SELECT status, priority, COUNT(*) AS count
            FROM tasks
            WHERE organization_id = :org
              AND deleted_at IS NULL
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY status, priority
        ", ['org' => $org->id]);

        // Visiteurs par service pour PieChart
        $visitorsByDept = DB::select("
            SELECT COALESCE(d.name, 'Autre') AS name, COUNT(v.id) AS value
            FROM visitors v
            LEFT JOIN departments d ON d.id = v.department_id
            WHERE v.organization_id = :org
              AND v.check_in_at >= NOW() - INTERVAL '30 days'
              AND v.deleted_at IS NULL
            GROUP BY d.name
            ORDER BY value DESC
            LIMIT 6
        ", ['org' => $org->id]);

        // Tendance réunions 3 mois pour LineChart
        $meetingsTrend = DB::select("
            SELECT
                TO_CHAR(start_at, 'YYYY-MM') AS month,
                COUNT(*) AS count
            FROM meetings
            WHERE organization_id = :org
              AND start_at >= NOW() - INTERVAL '90 days'
              AND deleted_at IS NULL
            GROUP BY 1 ORDER BY 1
        ", ['org' => $org->id]);

        return Inertia::render('Dashboard/Executive', [
            'kpis'            => $kpis,
            'mailTrend'       => $trend,
            'tasksByStatus'   => array_map(fn($r) => (array) $r, $tasksByStatus),
            'visitorsByDept'  => array_map(fn($r) => (array) $r, $visitorsByDept),
            'meetingsTrend'   => array_map(fn($r) => (array) $r, $meetingsTrend),
            'topDepartments'  => $top,
            'recentActivity'  => array_map(fn($r) => (array) $r, $recentActivity),
            'heatmap'         => $this->stats->getActivityHeatmap($org),
        ]);
    }

    // =========================================================================
    // PAGE SECRÉTARIAT
    // =========================================================================

    public function secretariatDashboard(Request $request): InertiaResponse
    {
        $org   = $request->user()->organization;
        $orgId = $org->id;
        $today = Carbon::today()->toDateString();
        $user  = $request->user();

        // Agenda du jour — événements triés par heure
        $agendaToday = DB::select("
            SELECT
                e.id, e.title, e.start_at, e.end_at, e.location,
                e.color, e.type,
                COUNT(ep.user_id) AS participants_count
            FROM events e
            LEFT JOIN event_participants ep ON ep.event_id = e.id
            WHERE e.organization_id = :org
              AND DATE(e.start_at) = :today
              AND e.deleted_at IS NULL
            GROUP BY e.id, e.title, e.start_at, e.end_at, e.location, e.color, e.type
            ORDER BY e.start_at ASC
        ", ['org' => $orgId, 'today' => $today]);

        // Tâches urgentes assignées au secrétariat (priorité haute/urgente, non terminées)
        $urgentTasks = DB::select("
            SELECT
                t.id, t.title, t.priority, t.status, t.due_date,
                p.name AS project_name
            FROM tasks t
            LEFT JOIN projects p ON p.id = t.project_id
            JOIN task_user tu ON tu.task_id = t.id AND tu.user_id = :user
            WHERE t.organization_id = :org
              AND t.priority IN ('high','urgent')
              AND t.status NOT IN ('done','cancelled')
              AND t.deleted_at IS NULL
            ORDER BY t.due_date ASC NULLS LAST, t.priority DESC
            LIMIT 10
        ", ['org' => $orgId, 'user' => $user->id]);

        // Courriers à traiter
        $pendingMail = DB::selectOne("
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE urgency = 'urgent') AS urgent,
                COUNT(*) FILTER (WHERE
                    processing_delay_days IS NOT NULL
                    AND received_at + (processing_delay_days || ' days')::interval < NOW()
                ) AS overdue
            FROM mail_registry
            WHERE organization_id = :org
              AND status IN ('pending','processing')
              AND deleted_at IS NULL
        ", ['org' => $orgId]);

        // Prochains visiteurs (rendez-vous prévus)
        $nextVisitors = DB::select("
            SELECT
                a.id, a.visitor_name, a.visitor_company,
                a.scheduled_at, a.purpose,
                u.name AS host_name
            FROM appointments a
            LEFT JOIN users u ON u.id = a.host_id
            WHERE a.organization_id = :org
              AND DATE(a.scheduled_at) = :today
              AND a.status IN ('confirmed','pending')
              AND a.deleted_at IS NULL
            ORDER BY a.scheduled_at ASC
            LIMIT 10
        ", ['org' => $orgId, 'today' => $today]);

        // Documents récents (7 derniers jours)
        $recentDocs = DB::select("
            SELECT
                d.id, d.title, d.file_type, d.updated_at,
                u.name AS updated_by
            FROM documents d
            JOIN users u ON u.id = d.updated_by_id
            WHERE d.organization_id = :org
              AND d.updated_at >= NOW() - INTERVAL '7 days'
              AND d.deleted_at IS NULL
            ORDER BY d.updated_at DESC
            LIMIT 8
        ", ['org' => $orgId]);

        // Rappels de la semaine (événements à venir)
        $weekEvents = DB::select("
            SELECT
                DATE(start_at) AS day,
                COUNT(*) AS count
            FROM events
            WHERE organization_id = :org
              AND start_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
              AND deleted_at IS NULL
            GROUP BY 1 ORDER BY 1
        ", ['org' => $orgId]);

        return Inertia::render('Dashboard/Secretariat', [
            'agendaToday'  => array_map(fn($r) => (array) $r, $agendaToday),
            'urgentTasks'  => array_map(fn($r) => (array) $r, $urgentTasks),
            'pendingMail'  => (array) $pendingMail,
            'nextVisitors' => array_map(fn($r) => (array) $r, $nextVisitors),
            'recentDocs'   => array_map(fn($r) => (array) $r, $recentDocs),
            'weekEvents'   => array_map(fn($r) => (array) $r, $weekEvents),
        ]);
    }

    // =========================================================================
    // API JSON (pour TanStack Query)
    // =========================================================================

    public function apiKpis(Request $request): JsonResponse
    {
        $org  = $request->user()->organization;
        $kpis = $this->stats->getKpiSummary($org);

        return response()->json(['data' => $kpis]);
    }

    public function apiTrends(Request $request): JsonResponse
    {
        $org    = $request->user()->organization;
        $metric = $request->string('metric', 'mail');
        $days   = (int) $request->input('days', 30);

        $data = $this->stats->getTrends($org, $metric, max(7, min(365, $days)));

        return response()->json(['data' => $data]);
    }

    public function apiHeatmap(Request $request): JsonResponse
    {
        $org = $request->user()->organization;
        return response()->json(['data' => $this->stats->getActivityHeatmap($org)]);
    }

    public function apiModuleUsage(Request $request): JsonResponse
    {
        $org = $request->user()->organization;
        return response()->json(['data' => $this->stats->getModuleUsageStats($org)]);
    }
}
