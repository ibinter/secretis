<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Event;
use App\Models\Task;
use App\Models\Visitor;
use App\Services\CacheService;
use App\Services\StatisticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * DashboardController — Tableaux de bord SECRETIS ERP
 *
 * Routes :
 *  GET /dashboard               → index()               [optimisé, Inertia defer]
 *  GET /dashboard/executive     → executiveDashboard()
 *  GET /dashboard/secretariat   → secretariatDashboard()
 *  GET /api/dashboard/kpis      → apiKpis()
 *  GET /api/dashboard/trends    → apiTrends()
 */
class DashboardController extends Controller
{
    public function __construct(private StatisticsService $stats) {}

    // =========================================================================
    // POINT D'ENTRÉE UNIQUE — dashboard optimisé avec Inertia Deferred Props
    // =========================================================================

    /**
     * Dashboard principal — chaque propriété est chargée de façon différée
     * (Inertia::defer) pour éviter de bloquer le rendu initial de la page.
     *
     * Le navigateur affiche immédiatement la coquille React, puis chaque
     * bloc de données arrive indépendamment dès que le serveur l'a calculé.
     *
     * Chaque helper privé lit d'abord depuis Redis (cache taggué), puis
     * exécute les requêtes SQL uniquement en cas de miss.
     *
     * GET /dashboard
     */
    public function index(): InertiaResponse
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;
        $org   = $user->organization;

        return Inertia::render('Dashboard/Index', [
            // ── Données synchrones (nécessaires au rendu initial) ──────────────
            'auth' => [
                'user' => $user->only('id', 'name', 'email', 'role'),
            ],

            'organization' => $org
                ? $org->only('id', 'name', 'plan_id', 'trial_ends_at')
                : null,

            'trial_days_remaining' => $org && $org->trial_ends_at
                ? max(0, (int) now()->diffInDays($org->trial_ends_at, false))
                : 14,

            // ── Données KPI (chargées directement — pas de defer) ─────────────
            'stats' => $this->getStats($orgId),

            // ── Données secondaires en différé (non bloquantes) ───────────────
            'recentEvents'    => Inertia::defer(fn () => $this->getRecentEvents($orgId)),
            'pendingTasks'    => Inertia::defer(fn () => $this->getPendingTasks($orgId, $user->id)),
            'recentDocuments' => Inertia::defer(fn () => $this->getRecentDocuments($orgId)),
        ]);
    }

    // ─── Helpers privés pour index() ─────────────────────────────────────────

    /**
     * Compteurs KPI du dashboard.
     * Cache : ['org:{id}', 'module:dashboard'] — TTL 5 min
     */
    private function getStats(int $orgId): array
    {
        return Cache::tags(["org:{$orgId}", 'module:dashboard'])
            ->remember(
                "stats_{$orgId}",
                CacheService::DASHBOARD_TTL,
                function () use ($orgId) {
                    $week  = [now()->startOfWeek(), now()->endOfWeek()];
                    $month = now()->startOfMonth();

                    return [
                        'events_this_week'     => Event::where('organization_id', $orgId)
                            ->whereBetween('start_at', $week)
                            ->count(),

                        'pending_tasks'        => Task::where('organization_id', $orgId)
                            ->whereNotIn('status', ['done', 'cancelled'])
                            ->count(),

                        'documents_this_month' => Document::where('organization_id', $orgId)
                            ->where('created_at', '>=', $month)
                            ->count(),

                        'visitors_today'       => DB::table('visit_logs')
                            ->where('organization_id', $orgId)
                            ->whereDate('check_in_at', today())
                            ->count(),
                    ];
                }
            );
    }

    /**
     * 10 prochains événements de l'agenda (triés par date de début).
     * Cache : ['org:{id}', 'module:agenda'] — TTL 5 min
     */
    private function getRecentEvents(int $orgId): array
    {
        return Cache::tags(["org:{$orgId}", 'module:agenda'])
            ->remember(
                "recent_events_{$orgId}",
                CacheService::DASHBOARD_TTL,
                function () use ($orgId) {
                    return Event::with(['participants:id,name,avatar'])
                        ->where('organization_id', $orgId)
                        ->where('start_at', '>=', now())
                        ->orderBy('start_at')
                        ->limit(10)
                        ->get(['id', 'title', 'start_at', 'end_at', 'location', 'color', 'type'])
                        ->toArray();
                }
            );
    }

    /**
     * Tâches en cours assignées à l'utilisateur courant (priorité haute en tête).
     * Cache court (1 min) car très personnalisé — pas mis en cache org-wide.
     */
    private function getPendingTasks(int $orgId, int $userId): array
    {
        return Cache::tags(["org:{$orgId}", 'module:tasks'])
            ->remember(
                "pending_tasks_{$orgId}_user_{$userId}",
                60, // 1 minute — données très personnelles
                function () use ($orgId, $userId) {
                    return Task::with(['project:id,name'])
                        ->where('organization_id', $orgId)
                        ->where(function($q) use ($userId) { $q->where('assigned_to', $userId)->orWhere('created_by', $userId); })
                        ->whereNotIn('status', ['done', 'cancelled'])
                        ->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END")
                        ->orderBy('due_date')
                        ->limit(10)
                        ->get(['id', 'title', 'status', 'priority', 'due_date', 'project_id'])
                        ->toArray();
                }
            );
    }

    /**
     * 8 documents récemment modifiés.
     * Cache : ['org:{id}', 'module:ged'] — TTL 5 min
     */
    private function getRecentDocuments(int $orgId): array
    {
        return Cache::tags(["org:{$orgId}", 'module:ged'])
            ->remember(
                "recent_docs_{$orgId}",
                CacheService::DASHBOARD_TTL,
                function () use ($orgId) {
                    return Document::with(['folder:id,name'])
                        ->where('organization_id', $orgId)
                        ->orderByDesc('updated_at')
                        ->limit(8)
                        ->get(['id', 'title', 'mime_type', 'updated_at', 'created_by', 'folder_id'])
                        ->toArray();
                }
            );
    }

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
            SELECT COALESCE(d.name, 'Autre') AS name, COUNT(vl.id) AS value
            FROM visit_logs vl
            JOIN visitors v ON v.id = vl.visitor_id
            LEFT JOIN departments d ON d.id = vl.host_user_id
            WHERE vl.organization_id = :org
              AND vl.check_in_at >= NOW() - INTERVAL '30 days'
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
            WHERE t.organization_id = :org
              AND t.assigned_to = :user
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
                d.id, d.title, d.mime_type, d.updated_at,
                u.name AS updated_by
            FROM documents d
            JOIN users u ON u.id = d.created_by
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
