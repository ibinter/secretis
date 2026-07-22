<?php

namespace App\Http\Controllers;

use App\Models\AuditFinding;
use App\Models\CorrectiveAction;
use App\Models\CustomerComplaint;
use App\Models\Nonconformity;
use App\Models\Organization;
use App\Models\QualityAudit;
use App\Models\QualityDocument;
use App\Models\QualityIndicator;
use App\Models\QualityIndicatorValue;
use App\Models\QualityProcess;
use App\Services\AuditService;
use App\Services\QualityService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * QualityController — Module Qualité ISO 9001 SECRETIS ERP
 *
 * Routes (préfixe /qualite) :
 *   GET    /qualite/dashboard
 *   GET    /qualite/report
 *
 *   CRUD   /qualite/nc                      Non-conformités
 *   POST   /qualite/nc/{id}/root-cause      Analyse des causes
 *   POST   /qualite/nc/{id}/corrective-action  Ajouter une action
 *   POST   /qualite/nc/{id}/verify          Vérifier l'efficacité
 *   PATCH  /qualite/nc/{id}/status          Changer le statut
 *
 *   CRUD   /qualite/indicators              Indicateurs qualité
 *   POST   /qualite/indicators/{id}/values  Enregistrer une valeur
 *   GET    /qualite/indicators/{id}/history Historique des valeurs
 *
 *   CRUD   /qualite/audits                  Audits qualité
 *   GET    /qualite/audits/{id}/checklist   Checklist ISO par clause
 *   POST   /qualite/audits/{id}/findings    Ajouter constatations
 *
 *   CRUD   /qualite/documents               Documents qualité
 *   PATCH  /qualite/documents/{id}/approve  Approuver un document
 *
 *   CRUD   /qualite/complaints              Réclamations clients
 *   POST   /qualite/complaints/{id}/close   Clôturer avec satisfaction
 *
 *   CRUD   /qualite/processes               Cartographie processus
 */
class QualityController extends Controller
{
    public function __construct(
        private readonly QualityService $quality,
        private readonly AuditService   $audit,
    ) {
        $this->middleware('auth');
    }

    // =========================================================================
    // TABLEAU DE BORD
    // =========================================================================

    public function dashboard(Request $request): InertiaResponse
    {
        $org  = Organization::findOrFail(Auth::user()->organization_id);
        $data = $this->quality->getQualityDashboard($org);

        return Inertia::render('Qualite/Dashboard', [
            'dashboard' => $data,
        ]);
    }

    public function report(Request $request): JsonResponse
    {
        $org    = Organization::findOrFail(Auth::user()->organization_id);
        $period = $request->filled('period')
            ? Carbon::parse($request->input('period'))
            : now();

        $report = $this->quality->generateQualityReport($org, $period);

        return response()->json($report);
    }

    // =========================================================================
    // NON-CONFORMITÉS
    // =========================================================================

    public function ncIndex(Request $request): InertiaResponse
    {
        $orgId = Auth::user()->organization_id;

        $query = Nonconformity::where('organization_id', $orgId)
            ->with(['detectedByUser:id,name', 'process:id,code,name', 'correctiveActionsList'])
            ->orderByDesc('detected_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('severity')) {
            $query->where('severity', $request->severity);
        }
        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }
        if ($request->filled('process_id')) {
            $query->where('process_id', $request->process_id);
        }
        if ($request->filled('date_from')) {
            $query->where('detected_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('detected_at', '<=', $request->date_to);
        }
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn($q) => $q
                ->where('reference', 'ilike', "%{$s}%")
                ->orWhere('title', 'ilike', "%{$s}%"));
        }

        $nonconformities = $query->paginate(20)->withQueryString();

        $processes = QualityProcess::where('organization_id', $orgId)
            ->select('id', 'code', 'name')
            ->orderBy('code')
            ->get();

        return Inertia::render('Qualite/NonconformityList', [
            'nonconformities' => $nonconformities,
            'processes'       => $processes,
            'filters'         => $request->only(['status', 'severity', 'source', 'process_id', 'date_from', 'date_to', 'search']),
        ]);
    }

    public function ncShow(int $id): InertiaResponse
    {
        $orgId = Auth::user()->organization_id;

        $nc = Nonconformity::where('organization_id', $orgId)
            ->with([
                'detectedByUser:id,name,email',
                'verifiedByUser:id,name',
                'process:id,code,name,owner_user_id',
                'correctiveActionsList.responsibleUser:id,name',
            ])
            ->findOrFail($id);

        $users = \App\Models\User::where('organization_id', $orgId)
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        $processes = QualityProcess::where('organization_id', $orgId)
            ->select('id', 'code', 'name')
            ->orderBy('code')
            ->get();

        return Inertia::render('Qualite/NonconformityDetail', [
            'nonconformity' => $nc,
            'users'         => $users,
            'processes'     => $processes,
        ]);
    }

    public function ncStore(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'title'                  => 'required|string|max:255',
            'description'            => 'required|string',
            'source'                 => 'required|in:audit,client_complaint,internal_detection,supplier,regulatory',
            'severity'               => 'required|in:mineure,majeure,critique',
            'detected_at'            => 'required|date',
            'process_id'             => 'nullable|exists:quality_processes,id',
            'product_service'        => 'nullable|string|max:255',
            'immediate_action'       => 'nullable|string',
            'due_date'               => 'nullable|date|after:today',
            'cost_of_nonconformity'  => 'nullable|numeric|min:0',
        ]);

        $nc = $this->quality->createNonconformity([
            ...$validated,
            'organization_id' => Auth::user()->organization_id,
            'detected_by'     => Auth::id(),
        ]);

        $this->audit->log('created', 'qualite', 'nonconformity', $nc->id, [], $nc->toArray());

        return redirect()->route('qualite.nc.show', $nc->id)
            ->with('success', "Non-conformité {$nc->reference} créée avec succès.");
    }

    public function ncUpdate(Request $request, int $id): \Illuminate\Http\RedirectResponse
    {
        $orgId = Auth::user()->organization_id;
        $nc    = Nonconformity::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'title'           => 'sometimes|string|max:255',
            'description'     => 'sometimes|string',
            'severity'        => 'sometimes|in:mineure,majeure,critique',
            'process_id'      => 'nullable|exists:quality_processes,id',
            'product_service' => 'nullable|string|max:255',
            'immediate_action'=> 'nullable|string',
            'due_date'        => 'nullable|date',
            'cost_of_nonconformity' => 'nullable|numeric|min:0',
        ]);

        $old = $nc->toArray();
        $nc->update($validated);
        $this->audit->log('updated', 'qualite', 'nonconformity', $nc->id, $old, $nc->toArray());

        return back()->with('success', 'Non-conformité mise à jour.');
    }

    public function ncChangeStatus(Request $request, int $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $nc    = Nonconformity::where('organization_id', $orgId)->findOrFail($id);

        $request->validate(['status' => 'required|in:ouvert,analyse,action_corrective,verification,clos']);

        $old = $nc->status;
        $nc->update(['status' => $request->status]);
        $this->audit->log('status_changed', 'qualite', 'nonconformity', $nc->id, ['status' => $old], ['status' => $request->status]);

        return response()->json(['message' => 'Statut mis à jour.', 'status' => $nc->status]);
    }

    public function ncRootCause(Request $request, int $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $nc    = Nonconformity::where('organization_id', $orgId)->findOrFail($id);

        $request->validate([
            'method'   => 'required|in:5M,5pourquoi,ishikawa',
            'analysis' => 'required|array',
        ]);

        $this->quality->analyzeRootCause($nc, $request->method, $request->analysis);
        $this->audit->log('root_cause_analyzed', 'qualite', 'nonconformity', $nc->id, [], [
            'method' => $request->method,
        ]);

        return response()->json(['message' => 'Analyse des causes enregistrée.', 'nc' => $nc->fresh()]);
    }

    public function ncCorrectiveAction(Request $request, int $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $nc    = Nonconformity::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'description'         => 'required|string',
            'responsible_user_id' => 'nullable|exists:users,id',
            'due_date'            => 'nullable|date',
            'notes'               => 'nullable|string',
        ]);

        $action = $this->quality->createCorrectiveAction($nc, $validated);
        $this->audit->log('corrective_action_created', 'qualite', 'corrective_action', $action->id, [], $action->toArray());

        return response()->json(['message' => 'Action corrective ajoutée.', 'action' => $action]);
    }

    public function ncVerify(Request $request, int $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $nc    = Nonconformity::where('organization_id', $orgId)->findOrFail($id);

        $request->validate([
            'rating' => 'required|integer|between:1,5',
        ]);

        $this->quality->verifyNonconformity($nc, Auth::user(), $request->rating);
        $this->audit->log('verified', 'qualite', 'nonconformity', $nc->id, [], ['rating' => $request->rating]);

        return response()->json([
            'message' => $request->rating >= 3 ? 'Non-conformité clôturée.' : 'Action corrective insuffisante — NC réouverte.',
            'nc'      => $nc->fresh(),
        ]);
    }

    public function ncDestroy(int $id): \Illuminate\Http\RedirectResponse
    {
        $orgId = Auth::user()->organization_id;
        $nc    = Nonconformity::where('organization_id', $orgId)->findOrFail($id);

        $this->audit->log('deleted', 'qualite', 'nonconformity', $nc->id, $nc->toArray(), []);
        $nc->delete();

        return redirect()->route('qualite.nc.index')->with('success', 'Non-conformité supprimée.');
    }

    // =========================================================================
    // INDICATEURS QUALITÉ
    // =========================================================================

    public function indicatorsIndex(Request $request): InertiaResponse
    {
        $orgId      = Auth::user()->organization_id;
        $indicators = $this->quality->getIndicatorsWithStatus($orgId);

        return Inertia::render('Qualite/Indicators', [
            'indicators' => $indicators,
        ]);
    }

    public function indicatorStore(Request $request): JsonResponse
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'code'                => 'required|string|max:20',
            'unit'                => 'required|string|max:30',
            'target_value'        => 'nullable|numeric',
            'alert_threshold'     => 'nullable|numeric',
            'frequency'           => 'required|in:mensuel,trimestriel,annuel',
            'formula_description' => 'nullable|string',
            'owner_user_id'       => 'nullable|exists:users,id',
        ]);

        // Unicité du code par organisation
        $validated['organization_id'] = $orgId;
        $indicator = QualityIndicator::create($validated);

        return response()->json(['message' => 'Indicateur créé.', 'indicator' => $indicator], 201);
    }

    public function indicatorUpdate(Request $request, int $id): JsonResponse
    {
        $orgId     = Auth::user()->organization_id;
        $indicator = QualityIndicator::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'name'                => 'sometimes|string|max:255',
            'target_value'        => 'nullable|numeric',
            'alert_threshold'     => 'nullable|numeric',
            'formula_description' => 'nullable|string',
            'is_active'           => 'sometimes|boolean',
        ]);

        $indicator->update($validated);

        return response()->json(['message' => 'Indicateur mis à jour.', 'indicator' => $indicator]);
    }

    public function indicatorRecordValue(Request $request, int $id): JsonResponse
    {
        $orgId     = Auth::user()->organization_id;
        $indicator = QualityIndicator::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'period_year'  => 'required|integer|min:2020|max:2099',
            'period_month' => 'required|integer|min:1|max:12',
            'value'        => 'required|numeric',
            'comment'      => 'nullable|string',
        ]);

        $record = $this->quality->recordIndicatorValue(
            $indicator,
            $validated['period_year'],
            $validated['period_month'],
            $validated['value'],
            $validated['comment'] ?? null,
            Auth::id(),
        );

        return response()->json(['message' => 'Valeur enregistrée.', 'record' => $record]);
    }

    public function indicatorHistory(int $id): JsonResponse
    {
        $orgId     = Auth::user()->organization_id;
        $indicator = QualityIndicator::where('organization_id', $orgId)->findOrFail($id);

        $values = QualityIndicatorValue::where('indicator_id', $id)
            ->orderBy('period_year')
            ->orderBy('period_month')
            ->get();

        return response()->json(['indicator' => $indicator, 'values' => $values]);
    }

    // =========================================================================
    // AUDITS QUALITÉ
    // =========================================================================

    public function auditsIndex(Request $request): InertiaResponse
    {
        $orgId  = Auth::user()->organization_id;
        $audits = QualityAudit::where('organization_id', $orgId)
            ->with(['createdByUser:id,name'])
            ->orderByDesc('audit_date_start')
            ->paginate(15);

        return Inertia::render('Qualite/AuditManagement', [
            'audits' => $audits,
        ]);
    }

    public function auditShow(int $id): InertiaResponse
    {
        $orgId = Auth::user()->organization_id;
        $audit = QualityAudit::where('organization_id', $orgId)
            ->with(['findings.process:id,code,name'])
            ->findOrFail($id);

        $processes = QualityProcess::where('organization_id', $orgId)
            ->select('id', 'code', 'name')
            ->get();

        return Inertia::render('Qualite/AuditDetail', [
            'audit'     => $audit,
            'processes' => $processes,
        ]);
    }

    public function auditStore(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'title'            => 'required|string|max:255',
            'audit_type'       => 'required|in:interne,externe,certification,fournisseur,surveillance',
            'scope'            => 'nullable|string',
            'auditor_name'     => 'nullable|string|max:255',
            'auditor_user_id'  => 'nullable|exists:users,id',
            'audit_date_start' => 'nullable|date',
            'audit_date_end'   => 'nullable|date|after_or_equal:audit_date_start',
            'next_audit_date'  => 'nullable|date',
        ]);

        $audit = $this->quality->planAudit([
            ...$validated,
            'organization_id' => Auth::user()->organization_id,
            'created_by'      => Auth::id(),
        ]);

        $this->audit->log('created', 'qualite', 'audit', $audit->id, [], $audit->toArray());

        return redirect()->route('qualite.audits.show', $audit->id)
            ->with('success', "Audit {$audit->reference} planifié.");
    }

    public function auditUpdate(Request $request, int $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $audit = QualityAudit::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'status'      => 'sometimes|in:planifie,en_cours,rapport_en_attente,clos',
            'report_path' => 'nullable|string',
        ]);

        $old = $audit->toArray();
        $audit->update($validated);
        $this->audit->log('updated', 'qualite', 'audit', $id, $old, $audit->toArray());

        return response()->json(['message' => 'Audit mis à jour.', 'audit' => $audit]);
    }

    public function auditChecklist(Request $request, int $id): JsonResponse
    {
        $clause   = $request->input('clause', '9.2');
        $questions = $this->quality->getAuditChecklist($clause);

        return response()->json(['clause' => $clause, 'questions' => $questions]);
    }

    public function auditAddFinding(Request $request, int $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $audit = QualityAudit::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'finding_type' => 'required|in:nonconformite,observation,point_positif',
            'clause_iso'   => 'nullable|string|max:20',
            'process_id'   => 'nullable|exists:quality_processes,id',
            'description'  => 'required|string',
            'evidence'     => 'nullable|string',
            'risk_level'   => 'nullable|in:faible,moyen,eleve',
        ]);

        $finding = AuditFinding::create([
            ...$validated,
            'audit_id'        => $audit->id,
            'organization_id' => $orgId,
        ]);

        // Recalculer les compteurs
        $audit->increment("findings_count_{$this->findingKey($finding->finding_type)}");

        // Si la constatation est une NC, créer automatiquement une NC
        if ($finding->finding_type === 'nonconformite' && $request->boolean('create_nc')) {
            $nc = $this->quality->createNonconformity([
                'organization_id' => $orgId,
                'title'           => "NC Audit {$audit->reference} — " . substr($finding->description, 0, 100),
                'description'     => $finding->description,
                'source'          => 'audit',
                'severity'        => match ($finding->risk_level) {
                    'eleve'  => 'critique',
                    'moyen'  => 'majeure',
                    default  => 'mineure',
                },
                'detected_by'  => Auth::id(),
                'detected_at'  => now(),
                'process_id'   => $finding->process_id,
            ]);

            $finding->update(['nonconformity_id' => $nc->id]);
        }

        return response()->json(['message' => 'Constatation ajoutée.', 'finding' => $finding], 201);
    }

    public function auditUploadReport(Request $request, int $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $audit = QualityAudit::where('organization_id', $orgId)->findOrFail($id);

        $request->validate(['report' => 'required|file|mimes:pdf,docx|max:10240']);

        $path = $request->file('report')->store("quality/audits/{$orgId}", 'private');
        $audit->update(['report_path' => $path, 'status' => 'rapport_en_attente']);

        return response()->json(['message' => 'Rapport uploadé.', 'path' => $path]);
    }

    // =========================================================================
    // DOCUMENTS QUALITÉ
    // =========================================================================

    public function documentsIndex(Request $request): InertiaResponse
    {
        $orgId = Auth::user()->organization_id;

        $query = QualityDocument::where('organization_id', $orgId)
            ->with(['process:id,code,name', 'approvedByUser:id,name'])
            ->orderByDesc('updated_at');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $documents = $query->paginate(20)->withQueryString();

        $processes = QualityProcess::where('organization_id', $orgId)->select('id', 'code', 'name')->get();

        return Inertia::render('Qualite/QualityDocuments', [
            'documents' => $documents,
            'processes' => $processes,
            'filters'   => $request->only(['type', 'status']),
        ]);
    }

    public function documentStore(Request $request): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $year  = now()->year;

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'type'        => 'required|in:procedure,instruction,formulaire,enregistrement,politique',
            'process_id'  => 'nullable|exists:quality_processes,id',
            'version'     => 'nullable|string|max:20',
            'review_date' => 'nullable|date',
        ]);

        $seq = QualityDocument::where('organization_id', $orgId)->whereYear('created_at', $year)->count() + 1;

        $doc = QualityDocument::create([
            ...$validated,
            'organization_id' => $orgId,
            'reference'       => sprintf('QD-%d-%03d', $year, $seq),
            'status'          => 'brouillon',
            'change_log'      => [['version' => $validated['version'] ?? '1.0', 'date' => now()->toDateString(), 'author' => Auth::user()->name, 'change' => 'Création initiale']],
        ]);

        return response()->json(['message' => 'Document créé.', 'document' => $doc], 201);
    }

    public function documentApprove(Request $request, int $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $doc   = QualityDocument::where('organization_id', $orgId)->findOrFail($id);

        $doc->update([
            'status'      => 'approuve',
            'approved_by' => Auth::id(),
            'approved_at' => now(),
        ]);

        $this->audit->log('approved', 'qualite', 'document', $doc->id, [], ['status' => 'approuve']);

        return response()->json(['message' => 'Document approuvé.', 'document' => $doc]);
    }

    public function documentUploadFile(Request $request, int $id): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $doc   = QualityDocument::where('organization_id', $orgId)->findOrFail($id);

        $request->validate(['file' => 'required|file|mimes:pdf,docx,xlsx|max:20480']);

        $path = $request->file('file')->store("quality/documents/{$orgId}", 'private');
        $doc->update(['file_path' => $path]);

        return response()->json(['message' => 'Fichier uploadé.', 'path' => $path]);
    }

    // =========================================================================
    // RÉCLAMATIONS CLIENTS
    // =========================================================================

    public function complaintsIndex(Request $request): InertiaResponse
    {
        $orgId = Auth::user()->organization_id;

        $complaints = CustomerComplaint::where('organization_id', $orgId)
            ->with(['nonconformity:id,reference', 'handledByUser:id,name'])
            ->orderByDesc('received_at')
            ->paginate(20);

        return Inertia::render('Qualite/CustomerComplaints', [
            'complaints' => $complaints,
        ]);
    }

    public function complaintStore(Request $request): JsonResponse
    {
        $orgId = Auth::user()->organization_id;
        $year  = now()->year;

        $validated = $request->validate([
            'customer_name'    => 'required|string|max:255',
            'customer_contact' => 'nullable|string|max:255',
            'received_at'      => 'required|date',
            'channel'          => 'required|in:email,courrier,telephone,portail',
            'description'      => 'required|string',
            'severity'         => 'required|in:mineure,majeure,critique',
        ]);

        $seq = CustomerComplaint::where('organization_id', $orgId)->whereYear('received_at', $year)->count() + 1;

        $complaint = CustomerComplaint::create([
            ...$validated,
            'organization_id' => $orgId,
            'reference'       => sprintf('RC-%d-%04d', $year, $seq),
            'status'          => 'recu',
            'handled_by'      => Auth::id(),
        ]);

        // Si la sévérité est majeure ou critique, créer automatiquement une NC
        if (in_array($complaint->severity, ['majeure', 'critique'])) {
            $nc = $this->quality->createNonconformity([
                'organization_id' => $orgId,
                'title'           => "Réclamation {$complaint->reference} — {$complaint->customer_name}",
                'description'     => $complaint->description,
                'source'          => 'client_complaint',
                'severity'        => $complaint->severity,
                'detected_by'     => Auth::id(),
                'detected_at'     => $complaint->received_at,
            ]);

            $complaint->update(['nonconformity_id' => $nc->id]);
        }

        return response()->json(['message' => 'Réclamation enregistrée.', 'complaint' => $complaint], 201);
    }

    public function complaintClose(Request $request, int $id): JsonResponse
    {
        $orgId     = Auth::user()->organization_id;
        $complaint = CustomerComplaint::where('organization_id', $orgId)->findOrFail($id);

        $request->validate([
            'resolution'          => 'required|string',
            'satisfaction_rating' => 'required|integer|between:1,5',
        ]);

        $complaint->update([
            'status'              => 'clos',
            'resolution'          => $request->resolution,
            'satisfaction_rating' => $request->satisfaction_rating,
            'closed_at'           => now(),
        ]);

        return response()->json(['message' => 'Réclamation clôturée.', 'complaint' => $complaint]);
    }

    // =========================================================================
    // PROCESSUS (cartographie)
    // =========================================================================

    public function processesIndex(): InertiaResponse
    {
        $orgId     = Auth::user()->organization_id;
        $processes = QualityProcess::where('organization_id', $orgId)
            ->with(['ownerUser:id,name'])
            ->withCount('nonconformities')
            ->orderBy('category')
            ->orderBy('code')
            ->get();

        return Inertia::render('Qualite/ProcessMap', [
            'processes' => $processes,
        ]);
    }

    public function processStore(Request $request): JsonResponse
    {
        $orgId = Auth::user()->organization_id;

        $validated = $request->validate([
            'code'          => 'required|string|max:20',
            'name'          => 'required|string|max:255',
            'category'      => 'required|in:management,realization,support',
            'description'   => 'nullable|string',
            'owner_user_id' => 'nullable|exists:users,id',
            'version'       => 'nullable|string|max:20',
            'last_review_date' => 'nullable|date',
        ]);

        $process = QualityProcess::create([
            ...$validated,
            'organization_id' => $orgId,
        ]);

        return response()->json(['message' => 'Processus créé.', 'process' => $process], 201);
    }

    public function processUpdate(Request $request, int $id): JsonResponse
    {
        $orgId   = Auth::user()->organization_id;
        $process = QualityProcess::where('organization_id', $orgId)->findOrFail($id);

        $validated = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'description'      => 'nullable|string',
            'owner_user_id'    => 'nullable|exists:users,id',
            'is_documented'    => 'sometimes|boolean',
            'last_review_date' => 'nullable|date',
        ]);

        $process->update($validated);

        return response()->json(['message' => 'Processus mis à jour.', 'process' => $process]);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function findingKey(string $findingType): string
    {
        return match ($findingType) {
            'nonconformite' => 'nc',
            'observation'   => 'obs',
            'point_positif' => 'positive',
            default         => 'obs',
        };
    }
}
