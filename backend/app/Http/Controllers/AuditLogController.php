<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\StreamedResponse;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse as SymfonyStreamed;

/**
 * AuditLogController — Journal d'audit de l'organisation
 *
 * Accès réservé aux utilisateurs ayant la permission `view.audit_logs`.
 *
 * Routes :
 *  GET  /audit-log                  → page Inertia (admin)
 *  GET  /api/v1/audit-log           → liste JSON paginée
 *  GET  /api/v1/audit-log/export    → export CSV streamé
 */
class AuditLogController extends Controller
{
    // =========================================================================
    // Page Inertia
    // =========================================================================

    /**
     * Affiche la page journal d'audit (Inertia).
     *
     * GET /audit-log
     */
    public function index(Request $request): InertiaResponse
    {
        return Inertia::render('AuditLog/Index', [
            'filters' => $request->only(['user_id', 'action', 'module', 'date_from', 'date_to', 'search']),
        ]);
    }

    // =========================================================================
    // API JSON
    // =========================================================================

    /**
     * Liste paginée des entrées du journal d'audit (JSON).
     *
     * GET /api/v1/audit-log
     *
     * Query params :
     *  - per_page   int     (défaut 50, max 200)
     *  - page       int
     *  - user_id    int     Filtrer par utilisateur
     *  - action     string  Filtrer par action (created, updated, deleted…)
     *  - module     string  Filtrer par module (agenda, ged, rh…)
     *  - date_from  date    Format Y-m-d
     *  - date_to    date    Format Y-m-d
     *  - search     string  Recherche fulltext sur le champ `description`
     */
    public function apiIndex(Request $request): JsonResponse
    {
        $this->authorize('view.audit_logs');

        $validated = $request->validate([
            'per_page'  => 'sometimes|integer|min:1|max:200',
            'user_id'   => 'sometimes|integer|exists:users,id',
            'action'    => 'sometimes|string|max:100',
            'module'    => 'sometimes|string|max:100',
            'date_from' => 'sometimes|date_format:Y-m-d',
            'date_to'   => 'sometimes|date_format:Y-m-d|after_or_equal:date_from',
            'search'    => 'sometimes|string|max:255',
        ]);

        $perPage = min((int) ($validated['per_page'] ?? 50), 200);

        $query = AuditLog::with(['user:id,name,email,avatar'])
            ->where('organization_id', $request->user()->organization_id)
            ->latest();

        if (!empty($validated['user_id'])) {
            $query->where('user_id', $validated['user_id']);
        }
        if (!empty($validated['action'])) {
            $query->where('action', $validated['action']);
        }
        if (!empty($validated['module'])) {
            $query->where('module', $validated['module']);
        }
        if (!empty($validated['date_from'])) {
            $query->whereDate('created_at', '>=', $validated['date_from']);
        }
        if (!empty($validated['date_to'])) {
            $query->whereDate('created_at', '<=', $validated['date_to']);
        }
        if (!empty($validated['search'])) {
            $query->where('description', 'like', '%' . $validated['search'] . '%');
        }

        $results = $query->paginate($perPage);

        return response()->json([
            'data'         => $results->items(),
            'current_page' => $results->currentPage(),
            'last_page'    => $results->lastPage(),
            'per_page'     => $results->perPage(),
            'total'        => $results->total(),
        ]);
    }

    /**
     * Export CSV du journal d'audit (stream).
     *
     * GET /api/v1/audit-log/export
     * Nécessite la permission `export.audit_logs`.
     */
    public function export(Request $request): StreamedResponse
    {
        // Export fermé au palier Découverte et en lecture seule (section 3.3).
        app(\App\Services\LicenceGarde::class)->exiger('export');

        $this->authorize('export.audit_logs');

        $validated = $request->validate([
            'user_id'   => 'sometimes|integer',
            'action'    => 'sometimes|string|max:100',
            'module'    => 'sometimes|string|max:100',
            'date_from' => 'sometimes|date_format:Y-m-d',
            'date_to'   => 'sometimes|date_format:Y-m-d',
        ]);

        $orgId = $request->user()->organization_id;
        $filename = 'audit_log_' . now()->format('Ymd_His') . '.csv';

        return response()->streamDownload(function () use ($validated, $orgId) {
            $handle = fopen('php://output', 'w');

            // BOM UTF-8 pour Excel
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($handle, [
                'Date', 'Utilisateur', 'Email', 'Action', 'Module',
                'Description', 'IP', 'User-Agent', 'Données modifiées',
            ], ';');

            $query = AuditLog::with('user:id,name,email')
                ->where('organization_id', $orgId)
                ->latest();

            if (!empty($validated['user_id'])) {
                $query->where('user_id', $validated['user_id']);
            }
            if (!empty($validated['action'])) {
                $query->where('action', $validated['action']);
            }
            if (!empty($validated['module'])) {
                $query->where('module', $validated['module']);
            }
            if (!empty($validated['date_from'])) {
                $query->whereDate('created_at', '>=', $validated['date_from']);
            }
            if (!empty($validated['date_to'])) {
                $query->whereDate('created_at', '<=', $validated['date_to']);
            }

            $query->chunk(500, function ($rows) use ($handle) {
                foreach ($rows as $row) {
                    fputcsv($handle, [
                        $row->created_at->format('d/m/Y H:i:s'),
                        $row->user?->name    ?? 'Système',
                        $row->user?->email   ?? '—',
                        $row->action,
                        $row->module         ?? '—',
                        $row->description    ?? '—',
                        $row->ip_address     ?? '—',
                        $row->user_agent     ?? '—',
                        $row->changes ? json_encode($row->changes, JSON_UNESCAPED_UNICODE) : '—',
                    ], ';');
                }
            });

            fclose($handle);
        }, $filename, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
