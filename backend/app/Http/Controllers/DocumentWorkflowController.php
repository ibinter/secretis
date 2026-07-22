<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Services\DocumentWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * DocumentWorkflowController — API REST pour les workflows de validation
 *
 * Routes :
 *   GET    /documents/{id}/workflow
 *   POST   /documents/{id}/workflow/start
 *   POST   /documents/{id}/workflow/steps/{stepId}/approve
 *   POST   /documents/{id}/workflow/steps/{stepId}/reject
 *   POST   /documents/{id}/workflow/steps/{stepId}/send-back
 *   GET    /document-workflow-templates
 *   POST   /document-workflow-templates
 *   PUT    /document-workflow-templates/{id}
 *   DELETE /document-workflow-templates/{id}
 */
class DocumentWorkflowController extends Controller
{
    public function __construct(
        private DocumentWorkflowService $workflowService,
    ) {}

    // -----------------------------------------------------------------------
    // Workflow d'un document
    // -----------------------------------------------------------------------

    /** GET /documents/{id}/workflow */
    public function status(int $documentId): JsonResponse
    {
        $document = $this->resolveDocument($documentId);

        $status = $this->workflowService->getWorkflowStatus($document);

        return response()->json($status);
    }

    /** POST /documents/{id}/workflow/start */
    public function start(Request $request, int $documentId): JsonResponse
    {
        $request->validate([
            'template_id' => 'required|integer|exists:document_workflow_templates,id',
        ]);

        $document = $this->resolveDocument($documentId);
        $user     = $request->user();

        $instance = $this->workflowService->startWorkflow(
            document:   $document,
            templateId: (int) $request->input('template_id'),
            startedBy:  $user->id,
        );

        return response()->json([
            'message'  => 'Workflow démarré avec succès.',
            'instance' => $instance,
        ], 201);
    }

    /** POST /documents/{id}/workflow/steps/{stepId}/approve */
    public function approve(Request $request, int $documentId, int $stepId): JsonResponse
    {
        $request->validate([
            'comment' => 'nullable|string|max:1000',
        ]);

        $this->workflowService->processStep(
            stepId:     $stepId,
            approverId: $request->user()->id,
            action:     'approve',
            comment:    $request->input('comment', ''),
        );

        return response()->json(['message' => 'Étape approuvée avec succès.']);
    }

    /** POST /documents/{id}/workflow/steps/{stepId}/reject */
    public function reject(Request $request, int $documentId, int $stepId): JsonResponse
    {
        $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        $this->workflowService->processStep(
            stepId:     $stepId,
            approverId: $request->user()->id,
            action:     'reject',
            comment:    $request->input('comment'),
        );

        return response()->json(['message' => 'Document rejeté.']);
    }

    /** POST /documents/{id}/workflow/steps/{stepId}/send-back */
    public function sendBack(Request $request, int $documentId, int $stepId): JsonResponse
    {
        $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        $this->workflowService->processStep(
            stepId:     $stepId,
            approverId: $request->user()->id,
            action:     'send_back',
            comment:    $request->input('comment'),
        );

        return response()->json(['message' => 'Document renvoyé à l\'étape précédente.']);
    }

    // -----------------------------------------------------------------------
    // CRUD Templates (Admin)
    // -----------------------------------------------------------------------

    /** GET /document-workflow-templates */
    public function indexTemplates(Request $request): JsonResponse
    {
        $orgId = $request->user()->organization_id;

        $templates = DB::table('document_workflow_templates')
            ->where('organization_id', $orgId)
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        return response()->json($templates);
    }

    /** POST /document-workflow-templates */
    public function storeTemplate(Request $request): JsonResponse
    {
        $this->authorize('manage_workflow_templates');

        $validated = $request->validate([
            'name'        => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'category'    => 'nullable|string|max:30',
            'is_active'   => 'boolean',
            'steps'       => 'required|array|min:1',
            'steps.*.step_name'     => 'required|string|max:150',
            'steps.*.approver_role' => 'nullable|string|max:80',
            'steps.*.approver_id'   => 'nullable|integer|exists:users,id',
            'steps.*.is_required'   => 'boolean',
            'steps.*.timeout_hours' => 'integer|min:1|max:720',
        ]);

        $id = DB::table('document_workflow_templates')->insertGetId([
            'organization_id' => $request->user()->organization_id,
            'name'            => $validated['name'],
            'description'     => $validated['description'] ?? null,
            'category'        => $validated['category'] ?? null,
            'steps'           => json_encode($validated['steps']),
            'is_active'       => $validated['is_active'] ?? true,
            'created_by'      => $request->user()->id,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $template = DB::table('document_workflow_templates')->find($id);

        return response()->json($template, 201);
    }

    /** PUT /document-workflow-templates/{id} */
    public function updateTemplate(Request $request, int $id): JsonResponse
    {
        $this->authorize('manage_workflow_templates');

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:150',
            'description' => 'nullable|string|max:500',
            'category'    => 'nullable|string|max:30',
            'is_active'   => 'boolean',
            'steps'       => 'sometimes|array|min:1',
            'steps.*.step_name'     => 'required_with:steps|string|max:150',
            'steps.*.approver_role' => 'nullable|string|max:80',
            'steps.*.approver_id'   => 'nullable|integer|exists:users,id',
            'steps.*.is_required'   => 'boolean',
            'steps.*.timeout_hours' => 'integer|min:1|max:720',
        ]);

        $orgId = $request->user()->organization_id;

        $template = DB::table('document_workflow_templates')
            ->where('id', $id)
            ->where('organization_id', $orgId)
            ->first();

        if (! $template) {
            return response()->json(['message' => 'Template introuvable.'], 404);
        }

        $data = array_filter([
            'name'        => $validated['name'] ?? null,
            'description' => $validated['description'] ?? null,
            'category'    => $validated['category'] ?? null,
            'is_active'   => $validated['is_active'] ?? null,
            'steps'       => isset($validated['steps']) ? json_encode($validated['steps']) : null,
            'updated_at'  => now(),
        ], fn($v) => $v !== null);

        DB::table('document_workflow_templates')->where('id', $id)->update($data);

        return response()->json(DB::table('document_workflow_templates')->find($id));
    }

    /** DELETE /document-workflow-templates/{id} */
    public function destroyTemplate(Request $request, int $id): JsonResponse
    {
        $this->authorize('manage_workflow_templates');

        $orgId = $request->user()->organization_id;

        $deleted = DB::table('document_workflow_templates')
            ->where('id', $id)
            ->where('organization_id', $orgId)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Template introuvable.'], 404);
        }

        return response()->json(['message' => 'Template supprimé.']);
    }

    // -----------------------------------------------------------------------
    // Helper
    // -----------------------------------------------------------------------

    private function resolveDocument(int $id): Document
    {
        $user = auth()->user();

        $document = Document::where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        return $document;
    }
}
