<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataProcessingRecord;
use App\Models\DataRetentionPolicy;
use App\Models\DataSubjectRequest;
use App\Models\PrivacyIncident;
use App\Services\GdprService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GdprAdminController extends Controller
{
    public function __construct(private readonly GdprService $gdprService) {}

    // ─── Demandes des personnes concernées ───────────────────────────────────

    /**
     * GET /admin/gdpr/requests
     * Toutes les demandes de l'organisation.
     */
    public function listRequests(Request $request): JsonResponse
    {
        $org = Auth::user()->organization;

        $query = DataSubjectRequest::where('organization_id', $org->id)
            ->with('handler:id,name,email')
            ->orderByDesc('requested_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $requests = $query->paginate(25);

        // Calculer le délai légal restant (30 jours)
        $requests->getCollection()->transform(function ($r) {
            $deadline         = \Carbon\Carbon::parse($r->requested_at)->addDays(30);
            $r->days_remaining = $deadline->diffInDays(now(), false);
            $r->is_overdue    = $deadline->isPast() && $r->status !== 'completed';
            $r->deadline      = $deadline->toDateString();
            return $r;
        });

        return response()->json($requests);
    }

    /**
     * PUT /admin/gdpr/requests/{id}/process
     * Traiter une demande manuellement.
     */
    public function processRequest(Request $request, int $id): JsonResponse
    {
        $org       = Auth::user()->organization;
        $dsRequest = DataSubjectRequest::where('organization_id', $org->id)->findOrFail($id);

        $validated = $request->validate([
            'action'           => 'required|in:complete,reject,start_processing',
            'rejection_reason' => 'required_if:action,reject|nullable|string|max:500',
            'notes'            => 'nullable|string|max:1000',
        ]);

        match ($validated['action']) {
            'start_processing' => $dsRequest->update([
                'status'     => 'processing',
                'handled_by' => Auth::id(),
            ]),
            'complete' => $this->gdprService->handleDataSubjectRequest($dsRequest),
            'reject'   => $dsRequest->update([
                'status'           => 'rejected',
                'completed_at'     => now(),
                'handled_by'       => Auth::id(),
                'rejection_reason' => $validated['rejection_reason'],
            ]),
        };

        return response()->json([
            'message' => 'Demande mise à jour avec succès.',
            'request' => $dsRequest->fresh(),
        ]);
    }

    // ─── Registre des traitements (Article 30) ───────────────────────────────

    /**
     * GET /admin/gdpr/inventory
     * Registre des traitements de données.
     */
    public function getInventory(): JsonResponse
    {
        $org       = Auth::user()->organization;
        $inventory = $this->gdprService->generateDataInventory($org);

        return response()->json($inventory);
    }

    /**
     * POST /admin/gdpr/inventory
     * Créer un enregistrement de traitement.
     */
    public function createInventoryRecord(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                  => 'required|string|max:255',
            'purpose'               => 'required|string',
            'legal_basis'           => 'required|in:consent,contract,legal_obligation,vital_interests,public_task,legitimate_interests',
            'data_categories'       => 'required|array|min:1',
            'data_categories.*'     => 'string|max:100',
            'data_subjects'         => 'required|array|min:1',
            'data_subjects.*'       => 'string|max:100',
            'retention_period_days' => 'required|integer|min:1|max:36500',
            'third_parties'         => 'nullable|array',
        ]);

        $org    = Auth::user()->organization;
        $record = DataProcessingRecord::create([
            ...$validated,
            'organization_id' => $org->id,
            'created_by'      => Auth::id(),
            'is_active'       => true,
        ]);

        return response()->json($record, 201);
    }

    /**
     * PUT /admin/gdpr/inventory/{id}
     */
    public function updateInventoryRecord(Request $request, int $id): JsonResponse
    {
        $org    = Auth::user()->organization;
        $record = DataProcessingRecord::where('organization_id', $org->id)->findOrFail($id);

        $validated = $request->validate([
            'name'                  => 'sometimes|string|max:255',
            'purpose'               => 'sometimes|string',
            'legal_basis'           => 'sometimes|in:consent,contract,legal_obligation,vital_interests,public_task,legitimate_interests',
            'data_categories'       => 'sometimes|array|min:1',
            'data_subjects'         => 'sometimes|array|min:1',
            'retention_period_days' => 'sometimes|integer|min:1|max:36500',
            'third_parties'         => 'nullable|array',
            'is_active'             => 'sometimes|boolean',
        ]);

        $record->update($validated);

        return response()->json($record);
    }

    // ─── Politiques de rétention ─────────────────────────────────────────────

    /**
     * GET /admin/gdpr/retention
     */
    public function listRetentionPolicies(): JsonResponse
    {
        $org      = Auth::user()->organization;
        $policies = DataRetentionPolicy::where('organization_id', $org->id)
            ->orderBy('data_type')
            ->get();

        return response()->json(['data' => $policies]);
    }

    /**
     * POST /admin/gdpr/retention
     */
    public function createRetentionPolicy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'data_type'      => 'required|string|max:100',
            'description'    => 'nullable|string|max:500',
            'retention_days' => 'required|integer|min:1',
            'auto_delete'    => 'boolean',
        ]);

        $org    = Auth::user()->organization;
        $policy = DataRetentionPolicy::create([
            ...$validated,
            'organization_id' => $org->id,
        ]);

        return response()->json($policy, 201);
    }

    /**
     * PUT /admin/gdpr/retention/{id}
     */
    public function updateRetentionPolicy(Request $request, int $id): JsonResponse
    {
        $org    = Auth::user()->organization;
        $policy = DataRetentionPolicy::where('organization_id', $org->id)->findOrFail($id);

        $validated = $request->validate([
            'retention_days' => 'sometimes|integer|min:1',
            'auto_delete'    => 'sometimes|boolean',
            'description'    => 'nullable|string|max:500',
        ]);

        $policy->update($validated);

        return response()->json($policy);
    }

    // ─── Incidents de sécurité (Article 33 RGPD) ─────────────────────────────

    /**
     * GET /admin/gdpr/incidents
     */
    public function listIncidents(Request $request): JsonResponse
    {
        $org = Auth::user()->organization;

        $incidents = PrivacyIncident::where('organization_id', $org->id)
            ->with('reporter:id,name')
            ->orderByDesc('discovered_at')
            ->paginate(20);

        return response()->json($incidents);
    }

    /**
     * POST /admin/gdpr/incidents
     */
    public function createIncident(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'                => 'required|string|max:255',
            'description'          => 'required|string',
            'severity'             => 'required|in:low,medium,high,critical',
            'affected_users_count' => 'required|integer|min:0',
            'discovered_at'        => 'required|date',
            'containment_measures' => 'nullable|string',
        ]);

        $org      = Auth::user()->organization;
        $incident = PrivacyIncident::create([
            ...$validated,
            'organization_id' => $org->id,
            'reported_by'     => Auth::id(),
            'status'          => 'open',
        ]);

        // Alerte CNIL obligatoire sous 72h pour incidents medium/high/critical
        if (in_array($validated['severity'], ['medium', 'high', 'critical'])) {
            \Log::channel('gdpr')->warning('Incident requiring CNIL notification within 72h', [
                'incident_id' => $incident->id,
                'severity'    => $incident->severity,
                'deadline'    => now()->addHours(72)->toDateTimeString(),
            ]);
        }

        return response()->json($incident, 201);
    }

    /**
     * PUT /admin/gdpr/incidents/{id}
     */
    public function updateIncident(Request $request, int $id): JsonResponse
    {
        $org      = Auth::user()->organization;
        $incident = PrivacyIncident::where('organization_id', $org->id)->findOrFail($id);

        $validated = $request->validate([
            'status'               => 'sometimes|in:open,investigating,contained,resolved',
            'notified_authority'   => 'sometimes|boolean',
            'notified_users'       => 'sometimes|boolean',
            'reported_at'          => 'sometimes|nullable|date',
            'containment_measures' => 'sometimes|nullable|string',
        ]);

        $incident->update($validated);

        return response()->json($incident);
    }

    // ─── Tableau de bord RGPD ────────────────────────────────────────────────

    /**
     * GET /admin/gdpr/dashboard
     */
    public function dashboard(): JsonResponse
    {
        $org = Auth::user()->organization;

        $pendingRequests = DataSubjectRequest::where('organization_id', $org->id)
            ->whereIn('status', ['pending', 'processing'])
            ->count();

        $overdueRequests = DataSubjectRequest::where('organization_id', $org->id)
            ->whereIn('status', ['pending', 'processing'])
            ->where('requested_at', '<', now()->subDays(30))
            ->count();

        $openIncidents = PrivacyIncident::where('organization_id', $org->id)
            ->whereIn('status', ['open', 'investigating'])
            ->count();

        $activeProcessings = DataProcessingRecord::where('organization_id', $org->id)
            ->where('is_active', true)
            ->count();

        $activePolicies = DataRetentionPolicy::where('organization_id', $org->id)
            ->where('auto_delete', true)
            ->count();

        return response()->json([
            'kpis' => [
                'pending_requests'  => $pendingRequests,
                'overdue_requests'  => $overdueRequests,
                'open_incidents'    => $openIncidents,
                'active_processings' => $activeProcessings,
                'active_policies'   => $activePolicies,
            ],
        ]);
    }
}
