<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
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
            'meeting_type'     => 'required|in:board,team,project,extraordinary',
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

        $meeting = $this->meetingService->createMeeting($data, Auth::user());

        return response()->json([
            'message' => 'Réunion créée avec succès.',
            'meeting' => $meeting,
        ], 201);
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
            'meeting_type'     => 'sometimes|in:board,team,project,extraordinary',
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

        if ($meeting->status === 'ongoing') {
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
            'status'     => 'ongoing',
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
            // Générer à la volée si pas encore disponible
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
}
