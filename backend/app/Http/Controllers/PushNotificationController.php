<?php

namespace App\Http\Controllers;

use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PushNotificationController — Gestion des abonnements Web Push.
 *
 * Routes :
 *   POST   /push/subscribe    → enregistre un abonnement push
 *   DELETE /push/unsubscribe  → supprime un abonnement push
 *   GET    /push/vapid-key    → clé publique VAPID pour le frontend
 */
class PushNotificationController extends Controller
{
    public function __construct(
        private readonly PushNotificationService $pushService
    ) {}

    // -------------------------------------------------------------------------
    // GET /push/vapid-key
    // -------------------------------------------------------------------------

    /**
     * Retourne la clé publique VAPID.
     * Nécessaire pour que le frontend puisse s'abonner via PushManager.subscribe().
     */
    public function vapidKey(): JsonResponse
    {
        $key = $this->pushService->getPublicVapidKey();

        if (empty($key)) {
            return response()->json([
                'success' => false,
                'message' => 'VAPID non configuré. Contactez l\'administrateur système.',
            ], 503);
        }

        return response()->json([
            'success'    => true,
            'public_key' => $key,
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /push/subscribe
    // -------------------------------------------------------------------------

    /**
     * Enregistre un abonnement Web Push pour l'utilisateur authentifié.
     *
     * Body JSON attendu :
     * {
     *   "endpoint": "https://fcm.googleapis.com/...",
     *   "keys": {
     *     "p256dh": "...",
     *     "auth": "..."
     *   }
     * }
     */
    public function subscribe(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint'    => 'required|url|max:2048',
            'keys'        => 'required|array',
            'keys.p256dh' => 'required|string',
            'keys.auth'   => 'required|string',
        ]);

        try {
            $this->pushService->subscribe($request->user(), $validated);

            return response()->json([
                'success' => true,
                'message' => 'Notifications push activées.',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'activation des notifications push.',
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // DELETE /push/unsubscribe
    // -------------------------------------------------------------------------

    /**
     * Supprime l'abonnement Web Push de l'utilisateur.
     *
     * Body JSON optionnel :
     * { "endpoint": "https://..." }  → supprime cet endpoint spécifique
     * (sans body)                    → supprime tous les abonnements
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $endpoint = $request->input('endpoint');

        try {
            $this->pushService->unsubscribe($request->user(), $endpoint);

            return response()->json([
                'success' => true,
                'message' => 'Notifications push désactivées.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la désactivation.',
            ], 500);
        }
    }
}
