<?php

namespace App\Http\Controllers;

use App\Services\ReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * ReportController — Génération et export des rapports SECRETIS ERP
 *
 * Paramètres communs : start_date, end_date, format (json|pdf|excel)
 */
class ReportController extends Controller
{
    public function __construct(private ReportService $reportService) {}

    // =========================================================================
    // PAGE INDEX RAPPORTS
    // =========================================================================

    public function index(): InertiaResponse
    {
        return Inertia::render('Rapports/Index');
    }

    public function viewer(Request $request): InertiaResponse
    {
        return Inertia::render('Rapports/Viewer', [
            'type' => $request->input('type', 'global'),
        ]);
    }

    // =========================================================================
    // RAPPORTS INDIVIDUELS
    // =========================================================================

    public function mailReport(Request $request): JsonResponse|StreamedResponse
    {
        [$org, $start, $end, $format] = $this->parseParams($request);
        $data = $this->reportService->generateMailReport($org, $start, $end);

        return $this->respond($data, $format, 'rapport-courrier-' . $start->format('Ymd') . '-' . $end->format('Ymd'), 'reports.mail');
    }

    public function meetingReport(Request $request): JsonResponse|StreamedResponse
    {
        [$org, $start, $end, $format] = $this->parseParams($request);

        $meetings = DB::select("
            SELECT
                m.id, m.title, m.start_at, m.end_at, m.location, m.status,
                COUNT(DISTINCT mp.user_id) AS participants,
                COUNT(DISTINCT md.id) AS decisions
            FROM meetings m
            LEFT JOIN meeting_participants mp ON mp.meeting_id = m.id
            LEFT JOIN meeting_decisions md ON md.meeting_id = m.id
            WHERE m.organization_id = :org
              AND m.start_at BETWEEN :start AND :end
              AND m.deleted_at IS NULL
            GROUP BY m.id, m.title, m.start_at, m.end_at, m.location, m.status
            ORDER BY m.start_at DESC
        ", ['org' => $org->id, 'start' => $start, 'end' => $end]);

        $stats = DB::selectOne("
            SELECT
                COUNT(DISTINCT m.id) AS total_meetings,
                COUNT(DISTINCT mp.user_id) AS total_participants,
                COUNT(DISTINCT md.id) AS total_decisions,
                ROUND(AVG(EXTRACT(EPOCH FROM (m.end_at - m.start_at))/3600)::numeric, 1) AS avg_duration
            FROM meetings m
            LEFT JOIN meeting_participants mp ON mp.meeting_id = m.id
            LEFT JOIN meeting_decisions md ON md.meeting_id = m.id
            WHERE m.organization_id = :org
              AND m.start_at BETWEEN :start AND :end
              AND m.deleted_at IS NULL
        ", ['org' => $org->id, 'start' => $start, 'end' => $end]);

        $data = [
            'period'   => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'stats'    => (array) $stats,
            'meetings' => array_map(fn($r) => (array) $r, $meetings),
        ];

        return $this->respond($data, $format, 'rapport-reunions-' . $start->format('Ymd'), 'reports.meeting');
    }

    public function taskReport(Request $request): JsonResponse|StreamedResponse
    {
        [$org, $start, $end, $format] = $this->parseParams($request);
        $data = $this->reportService->generateTaskReport($org, $start, $end);

        return $this->respond($data, $format, 'rapport-taches-' . $start->format('Ymd'), 'reports.task');
    }

    public function visitorReport(Request $request): JsonResponse|StreamedResponse
    {
        [$org, $start, $end, $format] = $this->parseParams($request);
        $data = $this->reportService->generateVisitorReport($org, $start, $end);

        return $this->respond($data, $format, 'rapport-visiteurs-' . $start->format('Ymd'), 'reports.visitor');
    }

    public function leaveReport(Request $request): JsonResponse|StreamedResponse
    {
        [$org, $start, $end, $format] = $this->parseParams($request);

        $stats = DB::selectOne("
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'approved') AS approved,
                COUNT(*) FILTER (WHERE status = 'pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
                SUM(CASE WHEN status='approved'
                    THEN (end_date - start_date + 1) ELSE 0 END) AS total_days
            FROM leaves
            WHERE organization_id = :org
              AND start_date BETWEEN :start AND :end
              AND deleted_at IS NULL
        ", ['org' => $org->id, 'start' => $start->toDateString(), 'end' => $end->toDateString()]);

        $byAgent = DB::select("
            SELECT u.name AS agent, l.leave_type, COUNT(*) AS requests,
                   SUM(l.end_date - l.start_date + 1) AS days
            FROM leaves l
            JOIN users u ON u.id = l.user_id
            WHERE l.organization_id = :org
              AND l.start_date BETWEEN :start AND :end
              AND l.status = 'approved'
              AND l.deleted_at IS NULL
            GROUP BY u.id, u.name, l.leave_type
            ORDER BY days DESC
        ", ['org' => $org->id, 'start' => $start->toDateString(), 'end' => $end->toDateString()]);

        $data = [
            'period'   => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'stats'    => (array) $stats,
            'by_agent' => array_map(fn($r) => (array) $r, $byAgent),
        ];

        return $this->respond($data, $format, 'rapport-absences-' . $start->format('Ymd'), 'reports.leave');
    }

    public function roomReport(Request $request): JsonResponse|StreamedResponse
    {
        [$org, $start, $end, $format] = $this->parseParams($request);

        $rooms = DB::select("
            SELECT
                r.name, r.capacity,
                COUNT(rr.id) AS reservations,
                ROUND(SUM(EXTRACT(EPOCH FROM (rr.end_at - rr.start_at))/3600)::numeric, 1) AS hours_used,
                ROUND(
                    100.0 * SUM(EXTRACT(EPOCH FROM (rr.end_at - rr.start_at)))
                    / NULLIF(
                        EXTRACT(EPOCH FROM (:end2::date - :start2::date + 1) * '8 hours'::interval),
                        0
                    )
                ::numeric, 1) AS occupancy_rate
            FROM rooms r
            LEFT JOIN room_reservations rr ON rr.room_id = r.id
                AND rr.start_at BETWEEN :start AND :end
                AND rr.status != 'cancelled'
                AND rr.deleted_at IS NULL
            WHERE r.organization_id = :org
              AND r.deleted_at IS NULL
            GROUP BY r.id, r.name, r.capacity
            ORDER BY reservations DESC
        ", ['org' => $org->id,
            'start' => $start, 'end' => $end,
            'start2' => $start->toDateString(), 'end2' => $end->toDateString()]);

        $data = [
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'rooms'  => array_map(fn($r) => (array) $r, $rooms),
        ];

        return $this->respond($data, $format, 'rapport-salles-' . $start->format('Ymd'), 'reports.room');
    }

    public function supplyReport(Request $request): JsonResponse|StreamedResponse
    {
        [$org, $start, $end, $format] = $this->parseParams($request);

        $items = DB::select("
            SELECT
                s.name, s.category, s.unit,
                s.current_stock, s.minimum_stock,
                CASE WHEN s.current_stock <= s.minimum_stock THEN true ELSE false END AS low_stock,
                COALESCE(mv.movements_in, 0) AS movements_in,
                COALESCE(mv.movements_out, 0) AS movements_out
            FROM supplies s
            LEFT JOIN (
                SELECT supply_id,
                    SUM(CASE WHEN type='in' THEN quantity ELSE 0 END) AS movements_in,
                    SUM(CASE WHEN type='out' THEN quantity ELSE 0 END) AS movements_out
                FROM supply_movements
                WHERE created_at BETWEEN :start AND :end
                  AND deleted_at IS NULL
                GROUP BY supply_id
            ) mv ON mv.supply_id = s.id
            WHERE s.organization_id = :org AND s.deleted_at IS NULL
            ORDER BY low_stock DESC, s.name
        ", ['org' => $org->id, 'start' => $start, 'end' => $end]);

        $data = [
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'items'  => array_map(fn($r) => (array) $r, $items),
        ];

        return $this->respond($data, $format, 'rapport-fournitures-' . $start->format('Ymd'), 'reports.supply');
    }

    public function globalActivityReport(Request $request): JsonResponse|StreamedResponse
    {
        [$org, $start, $end, $format] = $this->parseParams($request);
        $data = $this->reportService->generateGlobalReport($org, $start, $end);

        return $this->respond($data, $format, 'rapport-global-' . $start->format('Ymd') . '-' . $end->format('Ymd'), 'reports.global');
    }

    public function auditReport(Request $request): JsonResponse|StreamedResponse
    {
        [$org, $start, $end, $format] = $this->parseParams($request);

        $module = $request->input('module');
        $action = $request->input('action');

        $query = "
            SELECT
                al.id, al.action, al.module, al.resource_type, al.resource_id,
                al.old_values, al.new_values, al.ip_address, al.created_at,
                u.name AS user_name, u.email AS user_email
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            WHERE al.organization_id = :org
              AND al.created_at BETWEEN :start AND :end
        ";

        $params = ['org' => $org->id, 'start' => $start, 'end' => $end];

        if ($module) {
            $query .= " AND al.module = :module";
            $params['module'] = $module;
        }
        if ($action) {
            $query .= " AND al.action = :action";
            $params['action'] = $action;
        }

        $query .= " ORDER BY al.created_at DESC LIMIT 1000";

        $logs = DB::select($query, $params);

        $data = [
            'period' => ['start' => $start->toDateString(), 'end' => $end->toDateString()],
            'logs'   => array_map(fn($r) => (array) $r, $logs),
        ];

        return $this->respond($data, $format, 'audit-' . $start->format('Ymd'), 'reports.audit');
    }

    // =========================================================================
    // HELPERS PRIVÉS
    // =========================================================================

    private function parseParams(Request $request): array
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date|after_or_equal:start_date',
            'format'     => ['nullable', Rule::in(['json', 'pdf', 'excel'])],
        ]);

        $org    = $request->user()->organization;
        $start  = Carbon::parse($request->input('start_date', now()->startOfMonth()));
        $end    = Carbon::parse($request->input('end_date', now()->endOfDay()));
        $format = $request->input('format', 'json');

        return [$org, $start, $end, $format];
    }

    private function respond(array $data, string $format, string $filename, string $view): JsonResponse|StreamedResponse
    {
        return match ($format) {
            'pdf'   => $this->reportService->exportToPdf($view, $data, $filename),
            'excel' => $this->reportService->exportToExcel(
                $data['records'] ?? $data['logs'] ?? [],
                array_keys((array) ($data['records'][0] ?? $data['logs'][0] ?? [])),
                $filename
            ),
            default => response()->json(['data' => $data]),
        };
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }
}
