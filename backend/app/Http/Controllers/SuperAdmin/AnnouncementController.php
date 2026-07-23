<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\PlatformAnnouncement;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * AnnouncementController — Annonces plateforme SuperAdmin IBIG Soft
 *
 * Les annonces publiées apparaissent dans un bandeau de toutes les apps ciblées.
 * L'app cliente vérifie les annonces actives via GET /api/announcements (middleware tenant).
 *
 * ACCÈS RESTREINT : middleware 'role:superadmin_ibig'
 */
class AnnouncementController extends Controller
{
    public function __construct(private readonly AuditService $audit)
    {
        $this->middleware(['auth', 'role:superadmin_ibig']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/announcements
    // ─────────────────────────────────────────────────────────────────────────

    public function index(): Response
    {
        $announcements = PlatformAnnouncement::with('creator')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($a) => $this->formatAnnouncement($a));

        return Inertia::render('SuperAdmin/Announcements', [
            'announcements' => $announcements,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/announcements
    // ─────────────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'        => 'required|string|max:255',
            'content'      => 'required|string',
            'type'         => 'required|in:info,warning,maintenance,feature',
            'target_plans' => 'nullable|array',
            'target_plans.*' => 'string|in:all,starter,pro,enterprise',
            'scheduled_at' => 'nullable|date|after:now',
            'expires_at'   => 'nullable|date|after:scheduled_at',
        ]);

        $announcement = PlatformAnnouncement::create([
            ...$validated,
            'target_plans' => $validated['target_plans'] ?? ['all'],
            'is_published' => false,
            'created_by'   => Auth::id(),
        ]);

        $this->audit->logCreated('announcements', 'announcement', $announcement->id, ['title' => $announcement->title]);

        return response()->json($this->formatAnnouncement($announcement), 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /superadmin/announcements/{announcement}
    // ─────────────────────────────────────────────────────────────────────────

    public function update(Request $request, PlatformAnnouncement $announcement): JsonResponse
    {
        // Ne pas modifier une annonce déjà publiée (sécurité éditoriale)
        if ($announcement->is_published) {
            return response()->json(['error' => 'Impossible de modifier une annonce déjà publiée.'], 422);
        }

        $validated = $request->validate([
            'title'        => 'sometimes|string|max:255',
            'content'      => 'sometimes|string',
            'type'         => 'sometimes|in:info,warning,maintenance,feature',
            'target_plans' => 'nullable|array',
            'scheduled_at' => 'nullable|date',
            'expires_at'   => 'nullable|date',
        ]);

        $old = $announcement->toArray();
        $announcement->update($validated);
        $this->audit->logUpdated('announcements', 'announcement', $announcement->id, $old, $validated);

        return response()->json($this->formatAnnouncement($announcement->fresh()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /superadmin/announcements/{announcement}
    // ─────────────────────────────────────────────────────────────────────────

    public function destroy(PlatformAnnouncement $announcement): JsonResponse
    {
        $this->audit->logDeleted('announcements', 'announcement', $announcement->id, $announcement->toArray());
        $announcement->delete();

        return response()->json(['message' => 'Annonce supprimée.']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATCH /superadmin/announcements/{id}  — Toggle active, etc.
    // ─────────────────────────────────────────────────────────────────────────

    public function patch(Request $request, int $id): JsonResponse
    {
        $announcement = PlatformAnnouncement::findOrFail($id);
        $data = $request->only(['active', 'is_published', 'title_fr', 'title_en', 'message_fr', 'message_en']);
        $announcement->update($data);
        return response()->json($announcement->fresh());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/announcements/{announcement}/publish
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Publie une annonce immédiatement (ou la marque comme prête si scheduled_at futur).
     */
    public function publish(PlatformAnnouncement $announcement): JsonResponse
    {
        if ($announcement->is_published) {
            return response()->json(['error' => 'Cette annonce est déjà publiée.'], 422);
        }

        $updateData = ['is_published' => true];

        // Si pas de date planifiée, publication immédiate
        if (!$announcement->scheduled_at) {
            $updateData['scheduled_at'] = now();
        }

        $announcement->update($updateData);

        $this->audit->log('published', 'announcements', 'announcement', $announcement->id);

        return response()->json([
            'announcement' => $this->formatAnnouncement($announcement->fresh()),
            'message'      => 'Annonce publiée avec succès.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/announcements (route publique tenant — HORS SuperAdmin)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Endpoint consommé par les apps clientes pour afficher le bandeau.
     * Filtre selon le plan de l'organisation courante.
     *
     * CETTE ROUTE est publique (middleware ResolveTenant) et ne requiert PAS superadmin_ibig.
     */
    public function activeForTenant(Request $request): JsonResponse
    {
        $org  = app('current_organization');
        $plan = $org?->getCurrentPlan() ?? 'starter';

        $announcements = PlatformAnnouncement::where('is_published', true)
            ->where(fn ($q) => $q->whereNull('scheduled_at')->orWhere('scheduled_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()))
            ->where(fn ($q) =>
                $q->whereJsonContains('target_plans', 'all')
                  ->orWhereJsonContains('target_plans', $plan)
            )
            ->orderByDesc('scheduled_at')
            ->limit(3)
            ->get(['id', 'title', 'content', 'type', 'scheduled_at', 'expires_at']);

        return response()->json(['announcements' => $announcements]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private function formatAnnouncement(PlatformAnnouncement $a): array
    {
        return [
            'id'           => $a->id,
            'title'        => $a->title,
            'content'      => $a->content,
            'type'         => $a->type,
            'target_plans' => $a->target_plans,
            'scheduled_at' => $a->scheduled_at?->toDateTimeString(),
            'expires_at'   => $a->expires_at?->toDateTimeString(),
            'is_published' => $a->is_published,
            'created_by'   => $a->created_by,
            'creator_name' => $a->creator?->name,
            'created_at'   => $a->created_at?->toDateTimeString(),
            'is_active'    => $a->is_published
                && ($a->scheduled_at === null || $a->scheduled_at->isPast())
                && ($a->expires_at === null || $a->expires_at->isFuture()),
        ];
    }
}
