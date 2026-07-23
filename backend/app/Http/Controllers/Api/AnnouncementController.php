<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementDismissal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AnnouncementController (API) — Endpoints consommés par les apps clientes.
 *
 * Routes :
 *   GET  /api/v1/announcements/active        → annonces actives non fermées
 *   POST /api/v1/announcements/{id}/dismiss  → fermer une annonce
 *
 * Nécessite le middleware 'auth:sanctum'.
 */
class AnnouncementController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/announcements/active
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retourne les annonces actives et non fermées pour l'utilisateur authentifié.
     *
     * Filtre :
     *  - Dans la fenêtre de diffusion (starts_at ≤ maintenant ≤ ends_at)
     *  - Ciblées pour l'utilisateur (plan / org / all)
     *  - Non encore fermées par cet utilisateur
     *
     * Utilisé par le composant AnnouncementBanner avec polling toutes les 5 min.
     */
    public function active(Request $request): JsonResponse
    {
        $user = $request->user();

        $announcements = Announcement::currentlyVisible()
            ->forUser($user)
            // Exclure les annonces déjà fermées par cet utilisateur
            ->whereDoesntHave('dismissals', fn ($q) =>
                $q->where('user_id', $user->id)
            )
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Announcement $a) => $this->formatForClient($a, $user->getPreferredLocale()));

        return response()->json([
            'data' => $announcements,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/v1/announcements/{id}/dismiss
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Enregistre la fermeture d'une annonce par l'utilisateur authentifié.
     * Idempotent : un second appel ne génère pas d'erreur.
     */
    public function dismiss(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // Vérifier que l'annonce existe et est dismissible
        $announcement = Announcement::where('id', $id)
            ->where('is_dismissible', true)
            ->firstOrFail();

        AnnouncementDismissal::firstOrCreate(
            [
                'announcement_id' => $announcement->id,
                'user_id'         => $user->id,
            ],
            [
                'dismissed_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Annonce fermée.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Formate une annonce pour le client en injectant le contenu dans la locale courante.
     */
    private function formatForClient(Announcement $a, string $locale = 'fr'): array
    {
        return [
            'id'             => $a->id,
            'title'          => $a->getTitle($locale),
            'message'        => $a->getMessage($locale),
            'type'           => $a->type,
            'color'          => $a->color,
            'display'        => $a->display,
            'cta_label'      => $a->cta_label,
            'cta_url'        => $a->cta_url,
            'is_dismissible' => $a->is_dismissible,
            'starts_at'      => $a->starts_at?->toIso8601String(),
            'ends_at'        => $a->ends_at?->toIso8601String(),
        ];
    }
}
