<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * NotificationApiController — API Notifications v1
 *
 * Endpoints :
 *  GET  /api/v1/notifications           → Liste (filtre unread_only)
 *  PUT  /api/v1/notifications/{id}/read → Marquer comme lue
 *  PUT  /api/v1/notifications/read-all  → Tout marquer comme lu
 *
 * Middlewares (routes/api.php) : auth:sanctum, tenant, ensureLicenseValid
 */
class NotificationApiController extends ApiController
{
    public function __construct(private readonly NotificationService $notificationService) {}

    // -------------------------------------------------------------------------
    // GET /notifications
    // -------------------------------------------------------------------------

    /**
     * Retourne les notifications de l'utilisateur authentifié.
     *
     * @queryParam unread_only bool  Si true, retourne uniquement les non lues.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'unread_only' => ['nullable', 'boolean'],
            'per_page'    => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();

        $query = $user->notifications()->orderByDesc('created_at');

        if ($request->boolean('unread_only', false)) {
            $query->whereNull('read_at');
        }

        $paginator = $query->paginate($request->integer('per_page', 25));

        $formatted = $paginator->getCollection()->map(fn($n) => [
            'id'         => $n->id,
            'type'       => class_basename($n->type),
            'title'      => $n->data['title'] ?? '',
            'body'       => $n->data['body'] ?? '',
            'data'       => $n->data,
            'is_read'    => ! is_null($n->read_at),
            'read_at'    => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at->toIso8601String(),
        ]);

        return $this->paginated($paginator, 'Notifications récupérées.', [
            'unread_count' => $user->unreadNotifications()->count(),
        ]);
    }

    // -------------------------------------------------------------------------
    // PUT /notifications/{id}/read
    // -------------------------------------------------------------------------

    /**
     * Marque une notification comme lue.
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
                                ->notifications()
                                ->where('id', $id)
                                ->first();

        if (! $notification) {
            return $this->notFound('Notification');
        }

        $notification->markAsRead();

        return $this->noContent('Notification marquée comme lue.');
    }

    // -------------------------------------------------------------------------
    // PUT /notifications/read-all
    // -------------------------------------------------------------------------

    /**
     * Marque toutes les notifications non lues comme lues.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $count = $request->user()->unreadNotifications()->count();
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return $this->success(
            ['marked_count' => $count],
            "{$count} notification(s) marquée(s) comme lue(s).",
        );
    }
}
