<?php

namespace App\Services;

use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * ReportService — Génération et export des rapports SECRETIS ERP
 *
 * Toutes les méthodes generate* retournent un tableau PHP prêt pour
 * l'affichage Inertia ou l'export. Les méthodes export* retournent
 * une StreamedResponse pour le téléchargement direct.
 */
class ReportService
{
    // =========================================================================
    // RAPPORTS
    // =========================================================================

    public function generateMailReport(Organization $org, Carbon $start, Carbon $end): array
    {
        $orgId = $org->id;

        $stats = DB::selectOne("
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE type = 'incoming') AS incoming,
                COUNT(*) FILTER (WHERE type = 'outgoing') AS outgoing,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'processing') AS processing,
                COUNT(*) FILTER (WHERE status = 'processed') AS processed,
                COUNT(*) FILTER (WHERE urgency = 'urgent') AS urgent,
                COUNT(*) FILTER (WHERE
                    status IN ('pending','processing')
                    AND processing_delay_days IS NOT NULL
                    AND received_at + (processing_delay_days || ' days')::interval < NOW()
                ) AS overdue,
                ROUND(AVG(
                    CASE WHEN status = 'processed'
                    THEN EXTRACT(EPOCH FROM (updated_at - received_at))/86400 END
                )::numeric, 1) AS avg_processing_days
            FROM mail_registry
            WHERE organization_id = :org
              AND COALESCE(received_at, created_at) BETWEEN :start AND :end
              AND deleted_at IS NULL
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        $byDay = DB::select("
            SELECT
                DATE(COALESCE(received_at, created_at)) AS day,
                COUNT(*) FILTER (WHERE type = 'incoming') AS incoming,
                COUNT(*) FILTER (WHERE type = 'outgoing') AS outgoing
            FROM mail_registry
            WHERE organization_id = :org
              AND COALESCE(received_at, created_at) BETWEEN :start AND :end
              AND deleted_at IS NULL
            GROUP BY 1 ORDER BY 1
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        $byUrgency = DB::select("
            SELECT urgency, COUNT(*) AS count
            FROM mail_registry
            WHERE organization_id = :org
              AND COALESCE(received_at, created_at) BETWEEN :start AND :end
              AND deleted_at IS NULL
            GROUP BY urgency ORDER BY count DESC
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        $records = DB::select("
            SELECT
                mr.reference, mr.type, mr.subject, mr.urgency, mr.status,
                mr.sender_name, mr.sender_org, mr.recipient_name,
                mr.received_at, mr.sent_at, mr.created_at,
                u.name AS assigned_to
            FROM mail_registry mr
            LEFT JOIN users u ON u.id = mr.assigned_to_id
            WHERE mr.organization_id = :org
              AND COALESCE(mr.received_at, mr.created_at) BETWEEN :start AND :end
              AND mr.deleted_at IS NULL
            ORDER BY mr.created_at DESC
            LIMIT 500
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        return [
            'period'     => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'stats'      => (array) $stats,
            'by_day'     => array_map(fn($r) => (array) $r, $byDay),
            'by_urgency' => array_map(fn($r) => (array) $r, $byUrgency),
            'records'    => array_map(fn($r) => (array) $r, $records),
        ];
    }

    public function generateTaskReport(Organization $org, Carbon $start, Carbon $end): array
    {
        $orgId = $org->id;

        $stats = DB::selectOne("
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'done') AS done,
                COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
                COUNT(*) FILTER (WHERE status = 'todo') AS todo,
                COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
                COUNT(*) FILTER (WHERE status NOT IN ('done','cancelled') AND due_date < NOW()) AS overdue,
                COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent,
                ROUND(
                    100.0 * COUNT(*) FILTER (WHERE status = 'done') / NULLIF(COUNT(*),0),
                    1
                ) AS completion_rate
            FROM tasks
            WHERE organization_id = :org
              AND created_at BETWEEN :start AND :end
              AND deleted_at IS NULL
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        $byDepartment = DB::select("
            SELECT
                COALESCE(d.name, 'Non assigné') AS department,
                COUNT(t.id) AS total,
                COUNT(t.id) FILTER (WHERE t.status = 'done') AS done,
                COUNT(t.id) FILTER (WHERE t.status NOT IN ('done','cancelled') AND t.due_date < NOW()) AS overdue
            FROM tasks t
            LEFT JOIN departments d ON d.id = t.department_id
            WHERE t.organization_id = :org
              AND t.created_at BETWEEN :start AND :end
              AND t.deleted_at IS NULL
            GROUP BY d.name ORDER BY total DESC
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        $byAssignee = DB::select("
            SELECT
                u.name AS assignee,
                COUNT(t.id) AS total,
                COUNT(t.id) FILTER (WHERE t.status = 'done') AS done,
                COUNT(t.id) FILTER (WHERE t.status NOT IN ('done','cancelled') AND t.due_date < NOW()) AS overdue
            FROM task_user tu
            JOIN tasks t ON t.id = tu.task_id
            JOIN users u ON u.id = tu.user_id
            WHERE t.organization_id = :org
              AND t.created_at BETWEEN :start AND :end
              AND t.deleted_at IS NULL
            GROUP BY u.id, u.name
            ORDER BY total DESC
            LIMIT 20
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        return [
            'period'        => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'stats'         => (array) $stats,
            'by_department' => array_map(fn($r) => (array) $r, $byDepartment),
            'by_assignee'   => array_map(fn($r) => (array) $r, $byAssignee),
        ];
    }

    public function generateVisitorReport(Organization $org, Carbon $start, Carbon $end): array
    {
        $orgId = $org->id;

        $stats = DB::selectOne("
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE check_out_at IS NOT NULL) AS departed,
                COUNT(*) FILTER (WHERE blacklisted = true) AS blacklisted,
                ROUND(AVG(
                    CASE WHEN check_out_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (check_out_at - check_in_at))/60 END
                )::numeric, 0) AS avg_duration_minutes
            FROM visitors
            WHERE organization_id = :org
              AND check_in_at BETWEEN :start AND :end
              AND deleted_at IS NULL
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        $byDay = DB::select("
            SELECT
                DATE(check_in_at) AS day,
                COUNT(*) AS total,
                EXTRACT(DOW FROM check_in_at)::int AS weekday
            FROM visitors
            WHERE organization_id = :org
              AND check_in_at BETWEEN :start AND :end
              AND deleted_at IS NULL
            GROUP BY 1, 3 ORDER BY 1
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        $byDepartment = DB::select("
            SELECT
                COALESCE(d.name, 'Non précisé') AS department,
                COUNT(*) AS count
            FROM visitors v
            LEFT JOIN departments d ON d.id = v.department_id
            WHERE v.organization_id = :org
              AND v.check_in_at BETWEEN :start AND :end
              AND v.deleted_at IS NULL
            GROUP BY d.name ORDER BY count DESC
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        $byHour = DB::select("
            SELECT
                EXTRACT(HOUR FROM check_in_at)::int AS hour,
                COUNT(*) AS count
            FROM visitors
            WHERE organization_id = :org
              AND check_in_at BETWEEN :start AND :end
              AND deleted_at IS NULL
            GROUP BY 1 ORDER BY 1
        ", ['org' => $orgId, 'start' => $start, 'end' => $end]);

        return [
            'period'        => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'stats'         => (array) $stats,
            'by_day'        => array_map(fn($r) => (array) $r, $byDay),
            'by_department' => array_map(fn($r) => (array) $r, $byDepartment),
            'by_hour'       => array_map(fn($r) => (array) $r, $byHour),
        ];
    }

    public function generateGlobalReport(Organization $org, Carbon $start, Carbon $end): array
    {
        return [
            'period'   => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'org_name' => $org->name,
            'mail'     => $this->generateMailReport($org, $start, $end),
            'tasks'    => $this->generateTaskReport($org, $start, $end),
            'visitors' => $this->generateVisitorReport($org, $start, $end),
            'meetings' => $this->generateMeetingReportData($org, $start, $end),
            'rooms'    => $this->generateRoomReportData($org, $start, $end),
        ];
    }

    // =========================================================================
    // EXPORTS
    // =========================================================================

    public function exportToPdf(string $view, array $data, string $filename): StreamedResponse
    {
        // Utilise barryvdh/laravel-dompdf si disponible, sinon génère HTML brut
        if (class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView($view, $data)
                ->setPaper('A4', 'landscape');

            return $pdf->stream($filename . '.pdf');
        }

        // Fallback HTML streamé
        return response()->stream(function () use ($view, $data) {
            echo view($view, $data)->render();
        }, 200, [
            'Content-Type'        => 'text/html; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.html"',
        ]);
    }

    public function exportToExcel(array $data, array $headers, string $filename): StreamedResponse
    {
        return response()->stream(function () use ($data, $headers) {
            $handle = fopen('php://output', 'w');

            // BOM UTF-8 pour Excel
            fputs($handle, "\xEF\xBB\xBF");

            // En-têtes
            fputcsv($handle, $headers, ';');

            // Lignes
            foreach ($data as $row) {
                fputcsv($handle, array_values((array) $row), ';');
            }

            fclose($handle);
        }, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.csv"',
            'Cache-Control'       => 'no-store, no-cache',
        ]);
    }

    // =========================================================================
    // HELPERS PRIVÉS
    // =========================================================================

    private function generateMeetingReportData(Organization $org, Carbon $start, Carbon $end): array
    {
        $rows = DB::select("
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed,
                ROUND(AVG(EXTRACT(EPOCH FROM (end_at - start_at))/3600)::numeric, 1) AS avg_duration_hours,
                (SELECT COUNT(*) FROM meeting_participants mp
                 JOIN meetings m2 ON m2.id = mp.meeting_id
                 WHERE m2.organization_id = :org2
                   AND m2.start_at BETWEEN :start2 AND :end2
                   AND m2.deleted_at IS NULL) AS total_participants
            FROM meetings
            WHERE organization_id = :org1
              AND start_at BETWEEN :start1 AND :end1
              AND deleted_at IS NULL
        ", ['org1' => $org->id, 'org2' => $org->id,
            'start1' => $start, 'end1' => $end,
            'start2' => $start, 'end2' => $end]);

        return ['stats' => (array) ($rows[0] ?? [])];
    }

    private function generateRoomReportData(Organization $org, Carbon $start, Carbon $end): array
    {
        $rows = DB::select("
            SELECT
                r.name AS room,
                r.capacity,
                COUNT(rr.id) AS reservations,
                ROUND(
                    SUM(EXTRACT(EPOCH FROM (rr.end_at - rr.start_at))/3600)::numeric, 1
                ) AS total_hours
            FROM rooms r
            LEFT JOIN room_reservations rr ON rr.room_id = r.id
                AND rr.start_at BETWEEN :start AND :end
                AND rr.status != 'cancelled'
                AND rr.deleted_at IS NULL
            WHERE r.organization_id = :org
              AND r.deleted_at IS NULL
            GROUP BY r.id, r.name, r.capacity
            ORDER BY reservations DESC
        ", ['org' => $org->id, 'start' => $start, 'end' => $end]);

        return ['rooms' => array_map(fn($r) => (array) $r, $rows)];
    }
}
