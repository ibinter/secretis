<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * NotificationController — Contrôleur web Inertia pour les notifications
 *
 * Gère les pages Inertia + les endpoints API /api/v1/notifications.
 */
class NotificationController extends Controller
{
    // =========================================================================
    // Pages Inertia
    // =========================================================================

    /**
     * Centre de notifications principal.
     *
     * GET /notifications → Pages/Notifications/Index
     */
    public function index(Request $request): InertiaResponse
    {
        $user        = $request->user();
        $unreadCount = $user->unreadNotifications()->count();

        return Inertia::render('Notifications/Index', [
            'unreadCount' => $unreadCount,
        ]);
    }

    /**
     * Préférences de notifications.
     *
     * GET /notifications/preferences → Pages/Notifications/Preferences
     */
    public function preferences(Request $request): InertiaResponse
    {
        $user        = $request->user();
        $preferences = $user->notificationPreferences ?? [];

        return Inertia::render('Notifications/Preferences', [
            'preferences' => $preferences,
        ]);
    }

    // =========================================================================
    // API JSON — /api/v1/notifications
    // =========================================================================

    /**
     * Liste paginée des notifications de l'utilisateur connecté.
     *
     * GET /api/v1/notifications
     *
     * Query params :
     *  - per_page     int     Nombre par page (défaut 20, max 100)
     *  - page         int     Page courante
     *  - unread_only  bool    Filtrer les non lues uniquement
     *  - types        string  Types séparés par virgule (ex. task_assigned,event)
     */
    public function apiIndex(Request $request): JsonResponse
    {
        $user     = $request->user();
        $perPage  = min((int) $request->input('per_page', 20), 100);
        $onlyUnread = filter_var($request->input('unread_only', false), FILTER_VALIDATE_BOOLEAN);
        $types    = $request->input('types') ? explode(',', $request->input('types')) : null;

        $query = $user->notifications();

        if ($onlyUnread) {
            $query->whereNull('read_at');
        }

        if ($types) {
            $query->whereIn('type', array_map(
                fn ($t) => '\\App\\Notifications\\' . str_replace('_', '', ucwords($t, '_')),
                $types
            ))->orWhereJsonContains('data->type', $types);
        }

        $paginated    = $query->latest()->paginate($perPage);
        $unreadCount  = $user->unreadNotifications()->count();

        return response()->json([
            'data'         => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page'    => $paginated->lastPage(),
            'per_page'     => $paginated->perPage(),
            'total'        => $paginated->total(),
            'meta'         => [
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    /**
     * Nombre de notifications non lues (endpoint léger pour le polling).
     *
     * GET /api/v1/notifications/unread-count
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = $request->user()->unreadNotifications()->count();

        return response()->json(['count' => $count]);
    }

    /**
     * Marquer une notification comme lue.
     *
     * POST /api/v1/notifications/{id}/read
     * PUT  /api/v1/notifications/{id}/read
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * Marquer toutes les notifications comme lues.
     *
     * POST /api/v1/notifications/read-all
     * PUT  /api/v1/notifications/read-all
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * Récupérer les préférences de notification de l'utilisateur.
     *
     * GET /api/v1/notifications/preferences
     */
    public function getPreferences(Request $request): JsonResponse
    {
        $user        = $request->user();
        $preferences = $user->notificationPreferences ?? $this->defaultPreferences();

        return response()->json($preferences);
    }

    /**
     * Mettre à jour les préférences de notification.
     *
     * PUT /api/v1/notifications/preferences
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'do_not_disturb'     => 'sometimes|boolean',
            'daily_digest'       => 'sometimes|boolean',
            'digest_time'        => 'sometimes|string|date_format:H:i',
            'sound_enabled'      => 'sometimes|boolean',
            'silent_hours'       => 'sometimes|array',
            'silent_hours.*.days'  => 'sometimes|array',
            'silent_hours.*.start' => 'sometimes|string|date_format:H:i',
            'silent_hours.*.end'   => 'sometimes|string|date_format:H:i',
            'channels'           => 'sometimes|array',
        ]);

        $user = $request->user();

        // Fusionner avec les préférences existantes (PATCH sémantique)
        $current = $user->notificationPreferences ?? $this->defaultPreferences();
        $merged  = array_merge($current, $validated);

        $user->update(['notification_preferences' => $merged]);

        return response()->json([
            'success'     => true,
            'preferences' => $merged,
        ]);
    }

    /**
     * Archiver (supprimer soft) une notification.
     *
     * DELETE /api/v1/notifications/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $request->user()
            ->notifications()
            ->findOrFail($id)
            ->delete();

        return response()->json(['success' => true]);
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    private function defaultPreferences(): array
    {
        return [
            'do_not_disturb' => false,
            'daily_digest'   => true,
            'digest_time'    => '07:30',
            'sound_enabled'  => true,
            'silent_hours'   => [
                ['days' => ['all'], 'start' => '22:00', 'end' => '07:00'],
            ],
            'channels' => [],
        ];
    }
}
