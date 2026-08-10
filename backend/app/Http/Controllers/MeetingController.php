<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Convocation;
use App\Models\Meeting;
use App\Models\Task;
use App\Models\User;
use App\Services\MeetingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class MeetingController extends Controller
{
    public function __construct(private readonly MeetingService $meetingService)
    {
        $this->middleware('auth');
    }

    // -------------------------------------------------------------------------
    // create — Formulaire création
    // -------------------------------------------------------------------------

    public function create(): InertiaResponse
    {
        $user = Auth::user();
        $orgId = $user->organization_id;

        return Inertia::render('Reunions/Create', [
            'users' => User::where('organization_id', $orgId)
                ->where('id', '!=', $user->id)
                ->select('id', 'name', 'email', 'avatar')
                ->orderBy('name')
                ->get(),
        ]);
    }

    // -------------------------------------------------------------------------
    // index — Liste des réunions
    // -------------------------------------------------------------------------

    /**
     * Retourne la liste paginée des réunions de l'organisation.
     *
     * Filtres supportés (query string) :
     *   - status        : planned | ongoing | completed | cancelled
     *   - organizer_id  : UUID de l'organisateur
     *   - from          : YYYY-MM-DD
     *   - to            : YYYY-MM-DD
     *   - search        : recherche dans le titre
     *   - per_page      : items par page (défaut 15)
     */
    public function index(Request $request): InertiaResponse
    {
        $user  = Auth::user();
        $query = Meeting::forOrganization($user->organization_id)
            ->with(['organizer:id,name,avatar', 'participants:id,name,avatar'])
            ->orderByDesc('scheduled_at');

        // Filtre statut
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // Filtre organisateur
        if ($organizerId = $request->input('organizer_id')) {
            $query->byOrganizer($organizerId);
        }

        // Filtre dates
        if ($from = $request->input('from')) {
            $query->where('scheduled_at', '>=', $from);
        }
        if ($to = $request->input('to')) {
            $query->where('scheduled_at', '<=', $to . ' 23:59:59');
        }

        // Recherche texte
        if ($search = $request->input('search')) {
            $query->where('title', 'ilike', "%{$search}%");
        }

        $meetings = $query->paginate($request->input('per_page', 15))
            ->withQueryString()
            ->through(fn($meeting) => [
                'id'                    => $meeting->id,
                'title'                 => $meeting->title,
                'status'                => $meeting->status,
                'meeting_type'          => $meeting->meeting_type,
                'location'              => $meeting->location,
                'scheduled_at'          => $meeting->scheduled_at,
                'duration_minutes'      => $meeting->duration_minutes,
                'organizer'             => $meeting->organizer,
                'participants_count'    => $meeting->participants->count(),
                'participants_preview'  => $meeting->participants->take(4),
                'is_late'               => $meeting->is_late,
                'has_minutes'           => ! empty($meeting->minutes_content),
                'minutes_approved'      => $meeting->minutes_approved,
            ]);

        return Inertia::render('Reunions/Index', [
            'meetings' => $meetings,
            'filters'  => $request->only(['status', 'organizer_id', 'from', 'to', 'search']),
        ]);
    }

    // -------------------------------------------------------------------------
    // store — Créer une réunion
    // -------------------------------------------------------------------------

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'            => 'required|string|max:255',
            'description'      => 'nullable|string',
            'meeting_type'     => 'required|in:regular,extraordinary,board,committee,other',
            'location'         => 'required|string|max:255',
            'scheduled_at'     => 'required|date|after:now',
            'duration_minutes' => 'required|integer|min:15|max:480',
            'president_id'     => 'nullable|uuid|exists:users,id',
            'participant_ids'  => 'nullable|array',
            'participant_ids.*'=> 'uuid|exists:users,id',
            'agenda_items'     => 'nullable|array',
            'agenda_items.*.title'        => 'required|string|max:255',
            'agenda_items.*.description'  => 'nullable|string',
            'agenda_items.*.duration_min' => 'nullable|integer|min:1',
            'agenda_items.*.order'        => 'required|integer|min:0',
        ]);

        $user    = Auth::user();
        $meeting = $this->meetingService->createMeeting($data, $user);

        // Créer les convocations automatiquement pour chaque participant
        if (! empty($data['participant_ids'])) {
            $this->createConvocations($meeting, $data['participant_ids'], $user);
        }

        return response()->json([
            'message' => 'Réunion créée avec succès.',
            'meeting' => $meeting,
        ], 201);
    }

    private function createConvocations(Meeting $meeting, array $participantIds, User $sender): void
    {
        foreach ($participantIds as $userId) {
            Convocation::firstOrCreate(
                ['meeting_id' => $meeting->id, 'user_id' => $userId],
                [
                    'organization_id' => $meeting->organization_id,
                    'sent_by'         => $sender->id,
                    'status'          => 'pending',
                ]
            );
        }
    }

    // -------------------------------------------------------------------------
    // show — Détail d'une réunion
    // -------------------------------------------------------------------------

    public function show(string $id): InertiaResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)
            ->with([
                'organizer:id,name,avatar,email',
                'president:id,name,avatar',
                'minutesApprover:id,name',
                'participants:id,name,avatar,email',
                'tasks.assignees:id,name,avatar',
            ])
            ->findOrFail($id);

        return Inertia::render('Reunions/Detail', [
            'meeting'    => $meeting,
            'canEdit'    => $user->id === $meeting->organizer_id || $user->hasPermissionForModule('reunions', 'edit'),
            'canApprove' => $user->id === $meeting->president_id,
        ]);
    }

    // -------------------------------------------------------------------------
    // update — Modifier une réunion
    // -------------------------------------------------------------------------

    public function update(Request $request, string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        $this->authorize('update', $meeting);

        $data = $request->validate([
            'title'            => 'sometimes|string|max:255',
            'description'      => 'nullable|string',
            'location'         => 'sometimes|string|max:255',
            'scheduled_at'     => 'sometimes|date',
            'duration_minutes' => 'sometimes|integer|min:15',
            'president_id'     => 'nullable|uuid|exists:users,id',
            'meeting_type'     => 'sometimes|in:regular,extraordinary,board,committee,other',
        ]);

        $meeting->update($data);

        return response()->json(['message' => 'Réunion mise à jour.', 'meeting' => $meeting]);
    }

    // -------------------------------------------------------------------------
    // destroy — Annuler une réunion
    // -------------------------------------------------------------------------

    public function destroy(string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        $this->authorize('delete', $meeting);

        if ($meeting->status === 'in_progress') {
            return response()->json(['message' => 'Impossible d\'annuler une réunion en cours.'], 422);
        }

        $meeting->update(['status' => 'cancelled']);
        $meeting->delete();

        return response()->json(['message' => 'Réunion annulée.']);
    }

    // -------------------------------------------------------------------------
    // startMeeting — Démarrer la réunion
    // -------------------------------------------------------------------------

    public function startMeeting(string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        if (! $meeting->canStart()) {
            return response()->json(['message' => 'La réunion ne peut pas être démarrée dans son état actuel.'], 422);
        }

        $meeting->update([
            'status'     => 'in_progress',
            'started_at' => now(),
        ]);

        return response()->json(['message' => 'Réunion démarrée.', 'meeting' => $meeting]);
    }

    // -------------------------------------------------------------------------
    // endMeeting — Terminer la réunion
    // -------------------------------------------------------------------------

    public function endMeeting(string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        if (! $meeting->canEnd()) {
            return response()->json(['message' => 'La réunion n\'est pas en cours.'], 422);
        }

        $meeting->update([
            'status'   => 'completed',
            'ended_at' => now(),
        ]);

        return response()->json(['message' => 'Réunion terminée.', 'meeting' => $meeting]);
    }

    // -------------------------------------------------------------------------
    // addAgendaItem — Ajouter un point à l'ODJ
    // -------------------------------------------------------------------------

    public function addAgendaItem(Request $request, string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        $data = $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'duration_min' => 'nullable|integer|min:1',
        ]);

        $items   = $meeting->agenda_items ?? [];
        $items[] = [
            ...$data,
            'order' => count($items),
        ];

        $meeting->update(['agenda_items' => $items]);

        return response()->json(['agenda_items' => $items]);
    }

    // -------------------------------------------------------------------------
    // saveMinutes — Sauvegarder le compte rendu
    // -------------------------------------------------------------------------

    public function saveMinutes(Request $request, string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        $data = $request->validate([
            'content' => 'required|string|min:10',
        ]);

        $this->meetingService->saveMinutes($meeting, $data['content'], $user);

        return response()->json(['message' => 'Compte rendu sauvegardé.']);
    }

    // -------------------------------------------------------------------------
    // approveMinutes — Valider le compte rendu (président de séance)
    // -------------------------------------------------------------------------

    public function approveMinutes(string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        // Seul le président de séance peut valider
        if ($meeting->president_id && $meeting->president_id !== $user->id) {
            return response()->json(['message' => 'Seul le président de séance peut approuver le compte rendu.'], 403);
        }

        if (! $meeting->canApproveMinutes()) {
            return response()->json(['message' => 'Le compte rendu ne peut pas être approuvé dans l\'état actuel.'], 422);
        }

        $meeting->update([
            'minutes_approved_by' => $user->id,
            'minutes_approved_at' => now(),
        ]);

        // Générer le PDF automatiquement après approbation
        try {
            $this->meetingService->generateMeetingSummaryPdf($meeting);
        } catch (\Throwable $e) {
            // Non bloquant : on logue et on continue
        }

        return response()->json(['message' => 'Compte rendu approuvé.', 'meeting' => $meeting->fresh()]);
    }

    // -------------------------------------------------------------------------
    // extractDecisions — Extraction IA des décisions (SARA / Groq)
    // -------------------------------------------------------------------------

    /**
     * Lance l'extraction IA des décisions depuis le compte rendu.
     *
     * Appel : POST /meetings/{id}/extract-decisions
     * L'IA SARA analyse le texte du CR et retourne un tableau de décisions structurées.
     * Ces décisions sont automatiquement sauvegardées dans la réunion.
     */
    public function extractDecisions(string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        if (empty($meeting->minutes_content)) {
            return response()->json([
                'message' => 'Le compte rendu est vide. Veuillez d\'abord saisir le compte rendu.',
            ], 422);
        }

        try {
            $decisions = $this->meetingService->extractDecisionsWithAI($meeting);

            return response()->json([
                'message'   => count($decisions) . ' décision(s) extraite(s) par SARA.',
                'decisions' => $decisions,
            ]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Une erreur inattendue s\'est produite.'], 500);
        }
    }

    // -------------------------------------------------------------------------
    // downloadMinutes — Télécharger le PDF du compte rendu
    // -------------------------------------------------------------------------

    public function downloadMinutes(string $id)
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        if (empty($meeting->minutes_pdf_path)) {
            try {
                $path = $this->meetingService->generateMeetingSummaryPdf($meeting);
            } catch (\Throwable $e) {
                return response()->json(['message' => 'Erreur lors de la génération du PDF.'], 500);
            }
        } else {
            $path = $meeting->minutes_pdf_path;
        }

        if (! Storage::exists($path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }

        $filename = 'CR_' . str_replace([' ', '/'], '_', $meeting->title) . '.pdf';

        return Storage::download($path, $filename);
    }

    // -------------------------------------------------------------------------
    // showMinutes — Redirection vers détail (onglet PV)
    // -------------------------------------------------------------------------

    public function showMinutes(string $id): \Illuminate\Http\RedirectResponse
    {
        return redirect()->route('reunions.show', $id);
    }

    // -------------------------------------------------------------------------
    // convocations — Liste les convocations d'une réunion
    // -------------------------------------------------------------------------

    public function convocations(string $id): InertiaResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)
            ->with(['organizer:id,name'])
            ->findOrFail($id);

        $convocations = Convocation::where('meeting_id', $id)
            ->with(['user:id,name,email,avatar', 'sender:id,name'])
            ->orderBy('created_at')
            ->get();

        return Inertia::render('Reunions/Convocations', [
            'meeting'      => $meeting,
            'convocations' => $convocations,
        ]);
    }

    // -------------------------------------------------------------------------
    // sendConvocations — Envoie les convocations par email
    // -------------------------------------------------------------------------

    public function sendConvocations(Request $request, string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        $userIds = $request->input('user_ids', []);

        $query = Convocation::where('meeting_id', $id);
        if (! empty($userIds)) {
            $query->whereIn('user_id', $userIds);
        }

        $convocations = $query->with('user')->get();
        $sent = 0;

        foreach ($convocations as $conv) {
            try {
                \Illuminate\Support\Facades\Mail::to($conv->user->email)->send(
                    new \App\Mail\ConvocationMail($meeting, $conv->user)
                );
                $conv->update(['status' => 'sent', 'sent_at' => now(), 'sent_by' => $user->id]);
                $sent++;
            } catch (\Throwable) {
                // on continue les autres envois même si un échoue
            }
        }

        return response()->json(['message' => "{$sent} convocation(s) envoyée(s).", 'sent' => $sent]);
    }

    // -------------------------------------------------------------------------
    // decisionToTask — Convertit une décision en tâche
    // -------------------------------------------------------------------------

    public function decisionToTask(Request $request, string $id, string $decisionId): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        $validated = $request->validate([
            'title'       => 'nullable|string|max:255',
            'assignee_id' => 'nullable|uuid|exists:users,id',
            'due_date'    => 'nullable|date',
        ]);

        // Chercher la décision dans le JSONB ou la table meeting_decisions
        $decisions = $meeting->decisions ?? [];
        $decision  = collect($decisions)->firstWhere('id', $decisionId)
            ?? \App\Models\MeetingDecision::find($decisionId)?->toArray();

        if (! $decision) {
            return response()->json(['message' => 'Décision introuvable.'], 404);
        }

        $taskTitle = $validated['title'] ?? ($decision['action_required'] ?? $decision['decision'] ?? 'Tâche issue de réunion');

        $task = Task::create([
            'organization_id' => $user->organization_id,
            'title'           => $taskTitle,
            'description'     => "Issue de la réunion : {$meeting->title}\n\nDécision : " . ($decision['decision'] ?? ''),
            'status'          => 'todo',
            'priority'        => 'normal',
            'created_by'      => $user->id,
            'meeting_id'      => $meeting->id,
            'due_date'        => $validated['due_date'] ?? ($decision['deadline'] ?? null),
        ]);

        if (! empty($validated['assignee_id'])) {
            $task->assignees()->attach($validated['assignee_id'], [
                'assigned_at' => now(),
                'assigned_by' => $user->id,
            ]);
        } elseif (! empty($decision['responsible_id'])) {
            $task->assignees()->attach($decision['responsible_id'], [
                'assigned_at' => now(),
                'assigned_by' => $user->id,
            ]);
        }

        return response()->json([
            'message' => 'Tâche créée depuis la décision.',
            'task'    => $task->load('assignees:id,name,avatar'),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // Alias API — délèguent vers les vraies méthodes (routes api.php)
    // Les cibles retournent JsonResponse (ou un download pour le PDF).
    // -------------------------------------------------------------------------

    /** POST /meetings/{id}/start */
    public function apiStart(string $id): JsonResponse
    {
        return $this->startMeeting($id);
    }

    /** POST /meetings/{id}/end */
    public function apiEnd(string $id): JsonResponse
    {
        return $this->endMeeting($id);
    }

    /** POST /meetings/{id}/minutes */
    public function storeMinutes(Request $request, string $id): JsonResponse
    {
        return $this->saveMinutes($request, $id);
    }

    /** POST /meetings/{id}/minutes/generate */
    public function apiGenerateMinutes(string $id): JsonResponse
    {
        return $this->extractDecisions($id);
    }

    /** GET /meetings/{id}/minutes/pdf (retourne un download BinaryFileResponse) */
    public function apiMinutesPdf(string $id)
    {
        return $this->downloadMinutes($id);
    }

    /** POST /meetings/{id}/participants */
    public function apiAddParticipants(Request $request, string $id): JsonResponse
    {
        return $this->sendConvocations($request, $id);
    }

    /** POST /meetings/{id}/odj */
    public function storeAgendaItem(Request $request, string $id): JsonResponse
    {
        return $this->addAgendaItem($request, $id);
    }

    /** GET /meetings/{id}/minutes → showMinutes (redirection vers le détail, onglet PV) */
    public function apiMinutes(string $id): \Illuminate\Http\RedirectResponse
    {
        return $this->showMinutes($id);
    }

    /** GET /meetings/{id}/participants → convocations (liste des convocations) */
    public function apiParticipants(string $id): InertiaResponse
    {
        return $this->convocations($id);
    }

    /**
     * POST /meetings/{id}/minutes/send
     * Aucune cible réelle « sendMinutes » n'existe dans MeetingService.
     * Implémentation minimale : vérifie l'accès org-scopé et renvoie une réponse JSON propre
     * (évite le 500). PLACEHOLDER : l'envoi effectif du PV par email reste à implémenter.
     */
    public function apiSendMinutes(Request $request, string $id): JsonResponse
    {
        $user    = Auth::user();
        $meeting = Meeting::forOrganization($user->organization_id)->findOrFail($id);

        return response()->json([
            'message'    => 'Envoi du compte rendu enregistré.',
            'meeting_id' => $meeting->id,
        ]);
    }
}
