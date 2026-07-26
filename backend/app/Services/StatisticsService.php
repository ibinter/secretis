<?php

namespace App\Services;

use App\Models\Organization;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * StatisticsService — Agrégations KPI et tendances pour les tableaux de bord
 *
 * Toutes les requêtes utilisent des agrégats SQL (COUNT, SUM, GROUP BY)
 * pour éviter les boucles PHP et minimiser la mémoire.
 */
class StatisticsService
{
    /**
     * Retourne tous les KPIs en requêtes parallèles (DB::select en mode pipeline).
     */
    public function getKpiSummary(Organization $org): array
    {
        $orgId = $org->id;
        $today = Carbon::today()->toDateString();
        $weekStart = Carbon::now()->startOfWeek()->toDateString();
        $weekEnd   = Carbon::now()->endOfWeek()->toDateString();

        // Exécution en une seule passe via des sous-requêtes scalaires
        $row = DB::selectOne("
            SELECT
                -- Courriers en attente (pending + processing)
                (SELECT COUNT(*) FROM mail_registry
                 WHERE organization_id = :org1
                   AND status IN ('pending','processing')
                   AND deleted_at IS NULL) AS mail_pending,

                -- Courriers en retard (délai dépassé)
                (SELECT COUNT(*) FROM mail_registry
                 WHERE organization_id = :org2
                   AND status IN ('pending','processing')
                   AND processing_delay_days IS NOT NULL
                   AND received_at + (processing_delay_days || ' days')::interval < NOW()
                   AND deleted_at IS NULL) AS mail_overdue,

                -- Tâches en retard (due_date < today, pas terminées)
                (SELECT COUNT(*) FROM tasks
                 WHERE organization_id = :org3
                   AND status NOT IN ('done','cancelled')
                   AND due_date < :today1
                   AND deleted_at IS NULL) AS tasks_overdue,

                -- Réunions cette semaine
                (SELECT COUNT(*) FROM meetings
                 WHERE organization_id = :org4
                   AND DATE(start_at) BETWEEN :week_start AND :week_end
                   AND deleted_at IS NULL) AS meetings_week,

                -- Visiteurs aujourd'hui (arrivés)
                (SELECT COUNT(*) FROM visitors
                 WHERE organization_id = :org5
                   AND DATE(check_in_at) = :today2
                   AND deleted_at IS NULL) AS visitors_today,

                -- Absences aujourd'hui
                (SELECT COUNT(*) FROM leaves
                 WHERE organization_id = :org6
                   AND status = 'approved'
                   AND start_date <= :today3
                   AND end_date >= :today4
                   AND deleted_at IS NULL) AS absences_today,

                -- Ressources réservées aujourd'hui
                (SELECT COUNT(*) FROM room_reservations
                 WHERE organization_id = :org7
                   AND DATE(start_at) = :today5
                   AND status IN ('confirmed','pending')
                   AND deleted_at IS NULL) AS rooms_reserved_today,

                -- Événements cette semaine
                (SELECT COUNT(*) FROM events
                 WHERE organization_id = :org8
                   AND DATE(start_at) BETWEEN :week_start2 AND :week_end2
                   AND deleted_at IS NULL) AS events_week
        ", [
            'org1' => $orgId, 'org2' => $orgId, 'org3' => $orgId,
            'org4' => $orgId, 'org5' => $orgId, 'org6' => $orgId,
            'org7' => $orgId, 'org8' => $orgId,
            'today1' => $today, 'today2' => $today, 'today3' => $today,
            'today4' => $today, 'today5' => $today,
            'week_start' => $weekStart, 'week_end' => $weekEnd,
            'week_start2' => $weekStart, 'week_end2' => $weekEnd,
        ]);

        return (array) $row;
    }

    /**
     * Données de tendance pour un métrique donné sur N jours.
     *
     * @param  string $metric  'mail' | 'tasks' | 'visitors' | 'meetings' | 'rooms'
     * @param  int    $days    Nombre de jours en arrière
     */
    public function getTrends(Organization $org, string $metric, int $days = 30): array
    {
        $orgId = $org->id;
        $start = Carbon::now()->subDays($days - 1)->startOfDay();

        $queries = [
            'mail' => "
                SELECT
                    DATE(COALESCE(received_at, created_at)) AS day,
                    COUNT(*) FILTER (WHERE type = 'incoming') AS incoming,
                    COUNT(*) FILTER (WHERE type = 'outgoing') AS outgoing,
                    COUNT(*) AS total
                FROM mail_registry
                WHERE organization_id = :org
                  AND COALESCE(received_at, created_at) >= :start
                  AND deleted_at IS NULL
                GROUP BY 1 ORDER BY 1
            ",
            'tasks' => "
                SELECT
                    DATE(created_at) AS day,
                    COUNT(*) FILTER (WHERE status = 'done') AS done,
                    COUNT(*) FILTER (WHERE status NOT IN ('done','cancelled')) AS pending,
                    COUNT(*) AS total
                FROM tasks
                WHERE organization_id = :org
                  AND created_at >= :start
                  AND deleted_at IS NULL
                GROUP BY 1 ORDER BY 1
            ",
            'visitors' => "
                SELECT
                    DATE(check_in_at) AS day,
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE check_out_at IS NOT NULL) AS departed
                FROM visitors
                WHERE organization_id = :org
                  AND check_in_at >= :start
                  AND deleted_at IS NULL
                GROUP BY 1 ORDER BY 1
            ",
            'meetings' => "
                SELECT
                    DATE(start_at) AS day,
                    COUNT(*) AS total,
                    SUM(EXTRACT(EPOCH FROM (end_at - start_at))/3600)::numeric(6,1) AS total_hours
                FROM meetings
                WHERE organization_id = :org
                  AND start_at >= :start
                  AND deleted_at IS NULL
                GROUP BY 1 ORDER BY 1
            ",
            'rooms' => "
                SELECT
                    DATE(start_at) AS day,
                    COUNT(*) AS reservations,
                    COUNT(DISTINCT room_id) AS rooms_used
                FROM room_reservations
                WHERE organization_id = :org
                  AND start_at >= :start
                  AND deleted_at IS NULL
                GROUP BY 1 ORDER BY 1
            ",
        ];

        if (! isset($queries[$metric])) {
            return [];
        }

        $rows = DB::select($queries[$metric], [
            'org'   => $orgId,
            'start' => $start->toDateTimeString(),
        ]);

        return array_map(fn($r) => (array) $r, $rows);
    }

    /**
     * Heatmap d'activité : nombre d'actions par heure (0–23) et jour de semaine (0=lun).
     */
    public function getActivityHeatmap(Organization $org): array
    {
        $rows = DB::select("
            SELECT
                EXTRACT(ISODOW FROM created_at)::int - 1 AS weekday,
                EXTRACT(HOUR FROM created_at)::int       AS hour,
                COUNT(*) AS count
            FROM audit_logs
            WHERE organization_id = :org
              AND created_at >= NOW() - INTERVAL '90 days'
            GROUP BY 1, 2
            ORDER BY 1, 2
        ", ['org' => $org->id]);

        // Initialise une grille 7×24 à zéro
        $grid = array_fill(0, 7, array_fill(0, 24, 0));

        foreach ($rows as $r) {
            $grid[(int)$r->weekday][(int)$r->hour] = (int)$r->count;
        }

        return $grid;
    }

    /**
     * Utilisation des modules : nombre d'actions par module (30 derniers jours).
     */
    public function getModuleUsageStats(Organization $org): array
    {
        $rows = DB::select("
            SELECT
                module,
                COUNT(*) AS actions,
                COUNT(DISTINCT user_id) AS unique_users
            FROM audit_logs
            WHERE organization_id = :org
              AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY module
            ORDER BY actions DESC
        ", ['org' => $org->id]);

        return array_map(fn($r) => (array) $r, $rows);
    }

    /**
     * Top services par activité de tâches.
     */
    public function getTopDepartments(Organization $org, int $limit = 5): array
    {
        $rows = DB::select("
            SELECT
                d.name AS department,
                COUNT(t.id) AS total_tasks,
                COUNT(t.id) FILTER (WHERE t.status = 'done') AS done_tasks,
                COUNT(t.id) FILTER (WHERE t.status NOT IN ('done','cancelled') AND t.due_date < NOW()) AS overdue_tasks
            FROM departments d
            LEFT JOIN tasks t ON t.department_id = d.id
                AND t.organization_id = :org1
                AND t.deleted_at IS NULL
                AND t.created_at >= NOW() - INTERVAL '30 days'
            WHERE d.organization_id = :org2
              AND d.deleted_at IS NULL
            GROUP BY d.id, d.name
            ORDER BY total_tasks DESC
            LIMIT :lim
        ", ['org1' => $org->id, 'org2' => $org->id, 'lim' => $limit]);

        return array_map(fn($r) => (array) $r, $rows);
    }
}
