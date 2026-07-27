<?php

namespace App\Http\Controllers;

use App\Models\MailRegistry;
use App\Services\AuditService;
use App\Services\CourrierService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CourrierController — Registre courrier entrant / sortant
 *
 * Toutes les routes sont scoped au tenant courant (organization_id de l'utilisateur authentifié).
 * Les exports PDF/Excel sont générés à la volée et streamés — jamais stockés dans /public.
 */
class CourrierController extends Controller
{
    public function __construct(
        private CourrierService $courrierService,
        private AuditService    $auditService,
    ) {}

    // -------------------------------------------------------------------------
    // Index — Registre
    // -------------------------------------------------------------------------

    /**
     * Registre du courrier avec filtres multiples et pagination.
     *
     * Filtres supportés :
     *   type     : incoming | outgoing
     *   status   : pending | processing | processed | archived
     *   urgency  : low | normal | high | urgent
     *   service  : UUID département
     *   from     : date ISO (received_at / sent_at)
     *   to       : date ISO
     *   search   : recherche dans reference, subject, sender_name, recipient_name
     */
    public function index(Request $request): Response|JsonResponse
    {
        $user = Auth::user();

        $query = MailRegistry::forOrganization($user->organization_id)
            ->with(['assignee:id,name'])
            ->orderBy('created_at', 'desc');

        // Filtre type
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        // Filtre statut
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filtre urgence
        if ($urgency = $request->query('urgency')) {
            $query->where('urgency', $urgency);
        }

        // Filtre service/département
        // department_id not in DB v1 — skip filter

        // Plage de dates
        if ($from = $request->query('from')) {
            $query->where(function ($q) use ($from) {
                $q->whereDate('received_at', '>=', $from)
                  ->orWhereDate('sent_at', '>=', $from);
            });
        }

        if ($to = $request->query('to')) {
            $query->where(function ($q) use ($to) {
                $q->whereDate('received_at', '<=', $to)
                  ->orWhereDate('sent_at', '<=', $to);
            });
        }

        // Recherche plein texte
        if ($search = $request->query('search')) {
            $search = '%' . addcslashes($search, '%_') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'ilike', $search)
                  ->orWhere('subject', 'ilike', $search)
                  ->orWhere('sender_name', 'ilike', $search)
                  ->orWhere('recipient_name', 'ilike', $search)
                  ->orWhere('sender_organization', 'ilike', $search);
            });
        }

        $mails = $query->paginate($request->query('per_page', 20));

        // Annoter chaque courrier avec isOverdue
        $mails->getCollection()->transform(function (MailRegistry $mail) {
            $mail->append(['is_overdue']);
            return $mail;
        });

        // Statistiques pour les compteurs
        $stats = $this->getStats($user->organization_id);

        if ($request->wantsJson()) {
            return response()->json([
                'data'  => $mails,
                'stats' => $stats,
            ]);
        }

        return Inertia::render('Courrier/Index', [
            'mails'       => $mails,
            'stats'       => $stats,
            'filters'     => $request->only(['type', 'status', 'urgency', 'department_id', 'from', 'to', 'search']),
            'departments' => \App\Models\Department::where('organization_id', $user->organization_id)
                                ->select('id', 'name')
                                ->orderBy('name')
                                ->get(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Store
    // -------------------------------------------------------------------------

    /**
     * Enregistre un nouveau courrier entrant ou sortant.
     *
     * La référence est générée automatiquement (REF-ENTRANT-YYYY-XXXXX).
     * Les pièces jointes sont uploadées en parallèle dans le stockage privé.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type'                  => ['required', 'in:incoming,outgoing,internal'],
            'sender_name'           => ['nullable', 'string', 'max:255'],
            'sender_organization'   => ['nullable', 'string', 'max:255'],
            'recipient_name'        => ['nullable', 'string', 'max:255'],
            'sender_email'          => ['nullable', 'email', 'max:255'],
            'subject'               => ['required', 'string', 'max:500'],
            'urgency'               => ['required', 'in:low,normal,high,urgent'],
            'received_at'           => ['nullable', 'date'],
            'sent_at'               => ['nullable', 'date'],
            // department_id not in DB v1
            'assigned_to'           => ['nullable', 'exists:users,id'],
            'notes'                 => ['nullable', 'string', 'max:2000'],
            'processing_delay_days' => ['nullable', 'integer', 'min:1', 'max:90'],
            'attachments'           => ['nullable', 'array', 'max:10'],
            'attachments.*'         => ['file', 'max:20480'], // 20 Mo max par fichier
        ]);

        $user = Auth::user();

        // Enregistrement du courrier
        $mail = $validated['type'] === 'incoming'
            ? $this->courrierService->registerIncoming($validated, $user)
            : $this->courrierService->registerOutgoing($validated, $user);

        // Traitement des pièces jointes
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->storeAs(
                    "tenants/{$user->organization_id}/courriers/{$mail->id}",
                    \Illuminate\Support\Str::uuid() . '.' . $file->getClientOriginalExtension(),
                    'private'
                );

                \App\Models\MailAttachment::create([
                    'mail_registry_id' => $mail->id,
                    'file_name'        => $file->getClientOriginalName(),
                    'file_path'        => $path,
                    'mime_type'        => $file->getMimeType(),
                    'file_size'        => $file->getSize(),
                    'uploaded_by'      => Auth::id(),
                ]);
            }
        }

        return response()->json([
            'message' => 'Courrier enregistré avec succès.',
            'mail'    => $mail->load(['assignee:id,name', 'attachments']),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // Show
    // -------------------------------------------------------------------------

    /**
     * Détail d'un courrier avec son historique complet de traitement.
     */
    public function show(string $id): Response|JsonResponse
    {
        $mail = $this->findMailForCurrentOrg($id);
        $mail->load(['assignee:id,name', 'attachments']);

        $this->auditService->log(
            action: 'viewed',
            module: 'courrier',
            resourceType: 'mail_registry',
            resourceId: $mail->id,
        );

        if (request()->wantsJson()) {
            return response()->json($mail);
        }

        return Inertia::render('Courrier/Show', [
            'mail' => $mail,
        ]);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    /**
     * Modifier les métadonnées d'un courrier.
     * Le type et la référence ne sont pas modifiables après création.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $mail = $this->findMailForCurrentOrg($id);

        $validated = $request->validate([
            'sender_name'    => ['nullable', 'string', 'max:255'],
            'sender_organization' => ['nullable', 'string', 'max:255'],
            'recipient_name' => ['nullable', 'string', 'max:255'],
            'recipient_email' => ['nullable', 'email', 'max:255'],
            'subject'        => ['sometimes', 'required', 'string', 'max:500'],
            'urgency'        => ['sometimes', 'required', 'in:low,normal,high,urgent'],
            'received_at'    => ['nullable', 'date'],
            'sent_at'        => ['nullable', 'date'],
            'notes'          => ['nullable', 'string', 'max:2000'],
        ]);

        $original = $mail->toArray();
        $mail->update($validated);

        $this->auditService->logUpdated(
            module: 'courrier',
            resourceType: 'mail_registry',
            resourceId: $mail->id,
            original: $original,
            changes: $validated,
        );

        return response()->json([
            'message' => 'Courrier mis à jour.',
            'mail'    => $mail->fresh(['assignee:id,name']),
        ]);
    }

    // -------------------------------------------------------------------------
    // Destroy — Archivage (soft delete)
    // -------------------------------------------------------------------------

    /**
     * Archive un courrier (soft delete).
     * Les courriers ne sont jamais physiquement supprimés.
     */
    public function destroy(string $id): JsonResponse
    {
        $mail = $this->findMailForCurrentOrg($id);

        $this->auditService->logDeleted(
            module: 'courrier',
            resourceType: 'mail_registry',
            resourceId: $mail->id,
            lastState: $mail->toArray(),
        );

        $mail->delete(); // Soft delete

        return response()->json(['message' => 'Courrier archivé.']);
    }

    // -------------------------------------------------------------------------
    // Assign
    // -------------------------------------------------------------------------

    /**
     * Assigne un courrier à un agent ou un service.
     */
    public function assign(Request $request, string $id): JsonResponse
    {
        $mail = $this->findMailForCurrentOrg($id);

        $validated = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
        ]);

        $this->courrierService->assignCourrier($mail, $validated['user_id']);

        return response()->json([
            'message' => 'Courrier assigné.',
            'mail'    => $mail->fresh(['assignee']),
        ]);
    }

    // -------------------------------------------------------------------------
    // Change Status
    // -------------------------------------------------------------------------

    /**
     * Change le statut d'un courrier selon le workflow autorisé.
     *
     * Workflow : pending → processing → processed → archived
     */
    public function changeStatus(Request $request, string $id): JsonResponse
    {
        $mail = $this->findMailForCurrentOrg($id);

        $validated = $request->validate([
            'status' => ['required', 'in:received,registered,assigned,in_progress,replied,archived,closed'],
        ]);

        $this->courrierService->changeStatus($mail, $validated['status'], Auth::user());

        return response()->json([
            'message' => 'Statut mis à jour.',
            'mail'    => $mail->fresh(),
        ]);
    }

    // -------------------------------------------------------------------------
    // Exports
    // -------------------------------------------------------------------------

    /**
     * Export du registre en PDF.
     * Génère un PDF via DomPDF / TCPDF et le streame directement.
     */
    public function exportPdf(Request $request): \Illuminate\Http\Response
    {
        $user  = Auth::user();
        $mails = $this->buildExportQuery($user, $request)->get();

        $this->auditService->log(
            action: 'exported_pdf',
            module: 'courrier',
            resourceType: 'mail_registry',
            newValues: ['count' => $mails->count(), 'filters' => $request->query()],
        );

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.courrier', [
            'mails'        => $mails,
            'organization' => $user->organization,
            'generatedAt'  => now(),
            'filters'      => $request->only(['type', 'status', 'urgency', 'from', 'to']),
        ]);

        $filename = 'registre-courrier-' . now()->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    /**
     * Export du registre en Excel.
     * Utilise Laravel Excel (Maatwebsite) pour générer le fichier.
     */
    public function exportExcel(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $user = Auth::user();

        $this->auditService->log(
            action: 'exported_excel',
            module: 'courrier',
            resourceType: 'mail_registry',
            newValues: ['filters' => $request->query()],
        );

        $filename = 'registre-courrier-' . now()->format('Y-m-d') . '.xlsx';

        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\CourrierExport($user->organization_id, $request->query()),
            $filename
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Trouve un courrier et vérifie qu'il appartient à l'organisation courante.
     * Lève une 403 si l'organisation ne correspond pas (isolation multi-tenant).
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    private function findMailForCurrentOrg(string $id): MailRegistry
    {
        return MailRegistry::where('id', $id)
            ->where('organization_id', Auth::user()->organization_id)
            ->firstOrFail();
    }

    /**
     * Construit la query d'export avec les mêmes filtres que l'index.
     */
    private function buildExportQuery(\App\Models\User $user, Request $request)
    {
        $query = MailRegistry::forOrganization($user->organization_id)
            ->with(['assignee:id,name', 'department:id,name'])
            ->orderBy('created_at', 'desc');

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        return $query;
    }

    /**
     * Calcule les statistiques du registre pour les compteurs de l'UI.
     */
    private function getStats(string $organizationId): array
    {
        $base = MailRegistry::forOrganization($organizationId);

        return [
            'total'       => (clone $base)->count(),
            'incoming'    => (clone $base)->where('type', 'incoming')->count(),
            'outgoing'    => (clone $base)->where('type', 'outgoing')->count(),
            'received'    => (clone $base)->where('status', 'received')->count(),
            'in_progress' => (clone $base)->whereIn('status', ['registered', 'assigned', 'in_progress'])->count(),
            'replied'     => (clone $base)->where('status', 'replied')->count(),
            'archived'    => (clone $base)->whereIn('status', ['archived', 'closed'])->count(),
            'overdue'     => (clone $base)->overdue()->count(),
            'urgent'      => (clone $base)->urgent()->whereNotIn('status', ['archived', 'closed'])->count(),
        ];
    }
}
