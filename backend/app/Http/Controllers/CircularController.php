<?php

namespace App\Http\Controllers;

use App\Models\Circular;
use App\Models\CircularRecipient;
use App\Models\Department;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CircularController — Circulaires et Notes de service
 *
 * Permet de créer et diffuser des notes de service ciblées
 * par département, rôle ou liste nominative d'utilisateurs.
 * Chaque destinataire peut accuser réception et la direction
 * peut suivre qui a lu et qui n'a pas encore lu.
 *
 * SECURITE :
 *  - Seuls les rôles autorisés (direction, RH, admin) peuvent créer des circulaires
 *  - Isolation tenant stricte
 *  - L'accusé de réception est irréversible (traçabilité)
 */
class CircularController extends Controller
{
    public function __construct(
        private AuditService $auditService,
        private NotificationService $notificationService,
    ) {}

    // -------------------------------------------------------------------------
    // index() — Liste des circulaires
    // -------------------------------------------------------------------------

    /**
     * Page Inertia du registre des circulaires.
     */
    public function indexPage(Request $request): Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        return Inertia::render('Circulaires/Index', [
            'departments' => Department::where('organization_id', $orgId)
                ->orderBy('name')
                ->get(['id', 'name']),
            'users' => User::where('organization_id', $orgId)
                ->where('status', 'active')
                ->select('id', 'name', 'email')
                ->orderBy('name')
                ->get(),
            'canCreate' => $user->hasPermissionForModule('circulaires', 'create'),
        ]);
    }

    /**
     * Retourne la liste des circulaires accessibles à l'utilisateur.
     * - Pour les auteurs/admins : toutes les circulaires de l'organisation
     * - Pour les autres : seulement celles qui leur sont destinées
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $query = Circular::where('organization_id', $user->organization_id)
            ->with(['author:id,name,avatar'])
            ->withCount([
                'recipients as total_recipients',
                'recipients as read_count' => fn ($q) => $q->whereNotNull('acknowledged_at'),
            ]);

        // Filtre selon le rôle
        if (!$user->hasPermissionForModule('circulaires', 'manage')) {
            // Utilisateur normal : seulement ses circulaires
            $query->whereHas('recipients', fn ($q) => $q->where('user_id', $user->id));
        }

        // Filtres de recherche
        $query->when($request->search, fn ($q, $s) => $q->where(fn ($inner) =>
            $inner->where('title', 'ilike', "%{$s}%")
                  ->orWhere('content', 'ilike', "%{$s}%")
        ));

        $query->when($request->category, fn ($q, $c) => $q->where('category_id', $c));
        $query->when($request->status, fn ($q, $s) => $q->where('status', $s));

        $circulaires = $query->orderByDesc('published_at')->paginate(20);

        // Pour l'utilisateur courant, savoir s'il a accusé réception
        $circulaires->getCollection()->transform(function (Circular $circ) use ($user) {
            $recipient = $circ->recipients->firstWhere('user_id', $user->id);
            $circ->my_acknowledged_at = $recipient?->acknowledged_at;
            $circ->my_read_at         = $recipient?->read_at;
            return $circ;
        });

        return response()->json($circulaires);
    }

    // -------------------------------------------------------------------------
    // store() — Créer et diffuser une circulaire
    // -------------------------------------------------------------------------

    /**
     * Crée une circulaire et détermine la liste des destinataires selon
     * les critères : services, rôles, ou liste nominative.
     * Diffuse une notification à chaque destinataire.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Permission requise
        if (!$user->hasPermissionForModule('circulaires', 'create')) {
            return response()->json(['message' => 'Permission refusée.'], 403);
        }

        $validated = $request->validate([
            'title'              => ['required', 'string', 'max:500'],
            'content'            => ['required', 'string'],
            'category_id'        => ['nullable', 'integer'],
            'priority'           => ['in:normal,urgent,confidentiel'],
            'requires_ack'       => ['boolean'], // Accusé de réception obligatoire ?
            'published_at'       => ['nullable', 'date'],
            'expires_at'         => ['nullable', 'date', 'after:today'],
            'attachment_ids'     => ['nullable', 'array'],

            // Ciblage des destinataires — au moins un critère obligatoire
            'target_all'         => ['boolean'],
            'target_department_ids' => ['nullable', 'array'],
            'target_department_ids.*' => ['integer'],
            'target_roles'       => ['nullable', 'array'],
            'target_roles.*'     => ['string'],
            'target_user_ids'    => ['nullable', 'array'],
            'target_user_ids.*'  => ['integer'],
        ]);

        // Vérifier qu'il y a au moins un critère de ciblage
        $hasCriteria = ($validated['target_all'] ?? false)
            || !empty($validated['target_department_ids'])
            || !empty($validated['target_roles'])
            || !empty($validated['target_user_ids']);

        if (!$hasCriteria) {
            return response()->json(['message' => 'Définissez au moins un critère de ciblage.'], 422);
        }

        [$circular, $recipientIds] = DB::transaction(function () use ($validated, $user) {
            // Déterminer le recipient_type selon les critères de ciblage
            $recipientType = 'users';
            if ($validated['target_all'] ?? false) {
                $recipientType = 'all';
            } elseif (!empty($validated['target_department_ids']) && empty($validated['target_user_ids'])) {
                $recipientType = 'departments';
            }

            $circ = Circular::create([
                'organization_id'          => $user->organization_id,
                'created_by'               => $user->id,
                'subject'                  => $validated['title'],
                'body'                     => $validated['content'],
                'recipient_ids'            => $this->resolveRecipients($validated, $user->organization_id),
                'recipient_type'           => $recipientType,
                'requires_acknowledgement' => $validated['requires_ack'] ?? false,
                'status'                   => 'published',
                'published_at'             => $validated['published_at'] ?? now(),
                'expires_at'               => $validated['expires_at'] ?? null,
            ]);

            // Calculer la liste des destinataires
            $recipientIds = $this->resolveRecipients($validated, $user->organization_id);

            // Exclure l'auteur si déjà dans la liste
            $recipientIds = array_filter($recipientIds, fn ($id) => $id !== $user->id);
            $recipientIds = array_unique($recipientIds);

            // Créer les entrées destinataires
            $rows = array_map(fn ($id) => [
                'circular_id' => $circ->id,
                'user_id'     => $id,
                'created_at'  => now(),
                'updated_at'  => now(),
            ], $recipientIds);

            CircularRecipient::insert($rows);

            return [$circ, $recipientIds];
        });

        // ► Notifier tous les destinataires (async via queue)
        $recipients = User::whereIn('id', $recipientIds)->get();
        foreach ($recipients as $recipient) {
            $this->notificationService->send(
                user:  $recipient,
                type:  'circular',
                title: 'Nouvelle circulaire : ' . $circular->subject,
                body:  ($circular->requires_acknowledgement ? 'Accusé de réception requis.' : ''),
                data:  ['circular_id' => $circular->id, 'requires_ack' => $circular->requires_acknowledgement],
            );
        }

        $this->auditService->log(
            action: 'circular_created',
            module: 'circulaires',
            resourceType: 'circular',
            resourceId: $circular->id,
            newValues: ['subject' => $circular->subject, 'recipient_count' => count($recipientIds)],
        );

        return response()->json($circular->load('author:id,name'), 201);
    }

    // -------------------------------------------------------------------------
    // show($id) — Détail avec liste des lecteurs
    // -------------------------------------------------------------------------

    /**
     * Retourne le détail d'une circulaire avec la liste complète des destinataires
     * et leur statut de lecture/accusé de réception.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        $circular = Circular::where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->with([
                'author:id,name,avatar',
                'category',
                'attachments',
                'recipients.user:id,name,avatar,department_id',
                'recipients.user.department:id,name',
            ])
            ->firstOrFail();

        // Vérifier l'accès : destinataire OU auteur OU admin
        $isRecipient = $circular->recipients->contains('user_id', $user->id);
        $isAuthor    = $circular->author_id === $user->id;
        $canManage   = $user->hasPermissionForModule('circulaires', 'manage');

        if (!$isRecipient && !$isAuthor && !$canManage) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        // Marquer comme lu si destinataire
        if ($isRecipient) {
            CircularRecipient::where('circular_id', $circular->id)
                ->where('user_id', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        // Statistiques de lecture
        $stats = [
            'total'           => $circular->recipients->count(),
            'read'            => $circular->recipients->whereNotNull('read_at')->count(),
            'acknowledged'    => $circular->recipients->whereNotNull('acknowledged_at')->count(),
            'pending'         => $circular->recipients->whereNull('read_at')->count(),
        ];

        return response()->json([
            'circular'   => $circular,
            'stats'      => $stats,
            'recipients' => $circular->recipients->map(fn ($r) => [
                'user'            => $r->user,
                'read_at'         => $r->read_at?->toIso8601String(),
                'acknowledged_at' => $r->acknowledged_at?->toIso8601String(),
            ]),
        ]);
    }

    // -------------------------------------------------------------------------
    // acknowledge($id) — Accuser réception
    // -------------------------------------------------------------------------

    /**
     * L'utilisateur accuse réception de la circulaire.
     * Action irréversible pour garantir la traçabilité.
     */
    public function acknowledge(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        $circular = Circular::where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        $recipient = CircularRecipient::where('circular_id', $circular->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$recipient) {
            return response()->json(['message' => 'Vous n\'êtes pas destinataire de cette circulaire.'], 403);
        }

        if ($recipient->acknowledged_at) {
            return response()->json([
                'message'         => 'Déjà accusé réception.',
                'acknowledged_at' => $recipient->acknowledged_at->toIso8601String(),
            ]);
        }

        $recipient->update([
            'acknowledged_at' => now(),
            'read_at'         => $recipient->read_at ?? now(),
        ]);

        $this->auditService->log(
            action: 'circular_acknowledged',
            module: 'circulaires',
            resourceType: 'circular',
            resourceId: $circular->id,
        );

        return response()->json([
            'message'         => 'Accusé de réception enregistré.',
            'acknowledged_at' => $recipient->acknowledged_at->toIso8601String(),
        ]);
    }

    // -------------------------------------------------------------------------
    // getReadStatus($id) — Qui a lu / qui n'a pas lu
    // -------------------------------------------------------------------------

    /**
     * Retourne le tableau de bord de lecture d'une circulaire.
     * Réservé aux auteurs et aux managers.
     * Sépare "a lu", "a accusé réception", "n'a pas encore lu".
     */
    public function getReadStatus(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        $circular = Circular::where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        // Seul l'auteur ou un manager peut voir le statut de lecture
        if ($circular->author_id !== $user->id && !$user->hasPermissionForModule('circulaires', 'manage')) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $recipients = CircularRecipient::where('circular_id', $circular->id)
            ->with('user:id,name,avatar,department_id')
            ->with('user.department:id,name')
            ->get();

        return response()->json([
            'circular_id'  => $circular->id,
            'requires_ack' => $circular->requires_acknowledgement,
            'read'         => $recipients->whereNotNull('read_at')->values()->map(fn ($r) => [
                'user'    => $r->user,
                'read_at' => $r->read_at?->toIso8601String(),
                'ack_at'  => $r->acknowledged_at?->toIso8601String(),
            ]),
            'unread'       => $recipients->whereNull('read_at')->values()->map(fn ($r) => [
                'user' => $r->user,
            ]),
            'totals' => [
                'total'        => $recipients->count(),
                'read'         => $recipients->whereNotNull('read_at')->count(),
                'acknowledged' => $recipients->whereNotNull('acknowledged_at')->count(),
                'unread'       => $recipients->whereNull('read_at')->count(),
                'read_rate'    => $recipients->count() > 0
                    ? round($recipients->whereNotNull('read_at')->count() / $recipients->count() * 100, 1)
                    : 0,
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Résout la liste des IDs utilisateurs destinataires selon les critères de ciblage.
     */
    private function resolveRecipients(array $validated, int $organizationId): array
    {
        $query = User::where('organization_id', $organizationId)
            ->where('status', 'active');

        // Tous les utilisateurs de l'organisation
        if ($validated['target_all'] ?? false) {
            return $query->pluck('id')->toArray();
        }

        $ids = [];

        // Par département
        if (!empty($validated['target_department_ids'])) {
            $departmentUserIds = $query->clone()
                ->whereIn('department_id', $validated['target_department_ids'])
                ->pluck('id')
                ->toArray();
            $ids = array_merge($ids, $departmentUserIds);
        }

        // Par rôle Spatie
        if (!empty($validated['target_roles'])) {
            $roleUserIds = $query->clone()
                ->whereHas('roles', fn ($q) => $q->whereIn('name', $validated['target_roles']))
                ->pluck('id')
                ->toArray();
            $ids = array_merge($ids, $roleUserIds);
        }

        // Liste nominative
        if (!empty($validated['target_user_ids'])) {
            $nominalIds = $query->clone()
                ->whereIn('id', $validated['target_user_ids'])
                ->pluck('id')
                ->toArray();
            $ids = array_merge($ids, $nominalIds);
        }

        return array_unique($ids);
    }

    // -------------------------------------------------------------------------
    // update($id) — Éditer une circulaire existante (org-scopée)
    // -------------------------------------------------------------------------

    /**
     * Met à jour le sujet, le contenu, le statut ou les échéances d'une
     * circulaire. Seuls l'auteur ou un manager peuvent éditer.
     * N'écrit QUE des colonnes réelles de la table `circulars`.
     * Web/Inertia → redirect ; requête API pure → JSON.
     */
    public function update(Request $request, int $id): JsonResponse|RedirectResponse
    {
        $user = Auth::user();

        $circular = Circular::where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        if ($circular->created_by !== $user->id
            && !$user->hasPermissionForModule('circulaires', 'manage')) {
            if ($request->wantsJson() && !$request->header('X-Inertia')) {
                return response()->json(['message' => 'Accès refusé.'], 403);
            }
            abort(403);
        }

        $validated = $request->validate([
            'title'        => ['sometimes', 'required', 'string', 'max:500'],
            'content'      => ['sometimes', 'required', 'string'],
            'reference'    => ['sometimes', 'nullable', 'string', 'max:255'],
            'requires_ack' => ['sometimes', 'boolean'],
            'published_at' => ['sometimes', 'nullable', 'date'],
            'expires_at'   => ['sometimes', 'nullable', 'date'],
            'status'       => ['sometimes', 'in:draft,published,archived'],
        ]);

        // Mapper vers les colonnes réelles de la table `circulars`.
        $changes = [];
        if (array_key_exists('title', $validated))        $changes['subject'] = $validated['title'];
        if (array_key_exists('content', $validated))      $changes['body'] = $validated['content'];
        if (array_key_exists('reference', $validated))    $changes['reference'] = $validated['reference'];
        if (array_key_exists('requires_ack', $validated)) $changes['requires_acknowledgement'] = $validated['requires_ack'];
        if (array_key_exists('published_at', $validated)) $changes['published_at'] = $validated['published_at'];
        if (array_key_exists('expires_at', $validated))   $changes['expires_at'] = $validated['expires_at'];
        if (array_key_exists('status', $validated))       $changes['status'] = $validated['status'];

        if (!empty($changes)) {
            $circular->update($changes);
        }

        $this->auditService->log(
            action: 'circular_updated',
            module: 'circulaires',
            resourceType: 'circular',
            resourceId: $circular->id,
            newValues: $changes,
        );

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json($circular->fresh()->load('author:id,name'));
        }

        return redirect()->route('circulaires.index')->with('success', 'Circulaire mise à jour.');
    }

    // -------------------------------------------------------------------------
    // destroy($id) — Supprimer une circulaire (org-scopée)
    // -------------------------------------------------------------------------

    /**
     * Supprime une circulaire. Seuls l'auteur ou un manager peuvent supprimer.
     * Web/Inertia → redirect ; requête API pure → JSON.
     */
    public function destroy(Request $request, int $id): JsonResponse|RedirectResponse
    {
        $user = Auth::user();

        $circular = Circular::where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        if ($circular->created_by !== $user->id
            && !$user->hasPermissionForModule('circulaires', 'manage')) {
            if ($request->wantsJson() && !$request->header('X-Inertia')) {
                return response()->json(['message' => 'Accès refusé.'], 403);
            }
            abort(403);
        }

        $circular->delete();

        $this->auditService->logDeleted('circulaires', 'circular', $id);

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json(['message' => 'Circulaire supprimée.']);
        }

        return redirect()->route('circulaires.index')->with('success', 'Circulaire supprimée.');
    }

    // -------------------------------------------------------------------------
    // send($id) — (Re)diffuser une circulaire et notifier les destinataires
    // -------------------------------------------------------------------------

    /**
     * Publie (si nécessaire) et rediffuse une circulaire : renvoie une
     * notification à chaque destinataire (mêmes destinataires que ceux
     * résolus à la création, stockés dans la colonne JSON `recipient_ids`).
     * Route API → réponse JSON.
     */
    public function send(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        if (!$user->hasPermissionForModule('circulaires', 'create')
            && !$user->hasPermissionForModule('circulaires', 'manage')) {
            return response()->json(['message' => 'Permission refusée.'], 403);
        }

        $circular = Circular::where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->firstOrFail();

        if ($circular->created_by !== $user->id
            && !$user->hasPermissionForModule('circulaires', 'manage')) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        // Publier si la circulaire était encore en brouillon.
        if ($circular->status !== 'published') {
            $circular->update([
                'status'       => 'published',
                'published_at' => $circular->published_at ?? now(),
            ]);
        }

        // recipient_ids (JSON) contient des IDs d'utilisateurs résolus à la création.
        $recipientIds = array_values(array_filter(
            (array) ($circular->recipient_ids ?? []),
            fn ($rid) => (int) $rid !== (int) $user->id,
        ));

        $recipients = User::whereIn('id', $recipientIds)->get();
        foreach ($recipients as $recipient) {
            $this->notificationService->send(
                user:  $recipient,
                type:  'circular',
                title: 'Circulaire : ' . $circular->subject,
                body:  ($circular->requires_acknowledgement ? 'Accusé de réception requis.' : ''),
                data:  ['circular_id' => $circular->id, 'requires_ack' => $circular->requires_acknowledgement],
            );
        }

        $this->auditService->log(
            action: 'circular_sent',
            module: 'circulaires',
            resourceType: 'circular',
            resourceId: $circular->id,
            newValues: ['recipient_count' => count($recipientIds)],
        );

        return response()->json([
            'message'         => 'Circulaire diffusée.',
            'recipient_count' => count($recipientIds),
        ]);
    }

    // -------------------------------------------------------------------------
    // Alias API — délègue vers la vraie méthode (routes api.php)
    // -------------------------------------------------------------------------

    /** GET /circulaires/{id}/recipients */
    public function recipients(Request $request, int $id): JsonResponse
    {
        return $this->getReadStatus($request, $id);
    }
}
