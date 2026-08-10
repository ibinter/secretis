<?php

namespace App\Http\Controllers;

use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * WhatsAppWebhookController — Réception des webhooks Meta WhatsApp Business.
 *
 * Routes (sans authentification Sanctum — Meta ne peut pas s'authentifier) :
 *   GET  /webhooks/whatsapp → vérification Meta (hub challenge)
 *   POST /webhooks/whatsapp → réception messages et statuts
 *
 * Sécurité :
 *   - GET  : vérification hub.verify_token
 *   - POST : vérification signature HMAC-SHA256 (X-Hub-Signature-256)
 */
class WhatsAppWebhookController extends Controller
{
    public function __construct(
        private readonly WhatsAppService $whatsApp
    ) {}

    // -------------------------------------------------------------------------
    // GET /webhooks/whatsapp — Vérification Meta
    // -------------------------------------------------------------------------

    /**
     * Endpoint de vérification Meta.
     * Meta envoie : hub.mode=subscribe, hub.verify_token, hub.challenge
     * On répond avec hub.challenge si le verify_token est correct.
     */
    public function verify(Request $request): Response|JsonResponse
    {
        $mode        = $request->query('hub_mode');
        $token       = $request->query('hub_verify_token');
        $challenge   = $request->query('hub_challenge');

        $verifyToken = config('services.whatsapp.verify_token');

        if ($mode === 'subscribe' && $token === $verifyToken) {
            Log::info('WhatsApp webhook vérifié par Meta');
            return response((string) $challenge, 200);
        }

        Log::warning('WhatsApp webhook : vérification échouée', [
            'mode'  => $mode,
            'token' => $token,
        ]);

        return response()->json(['error' => 'Forbidden'], 403);
    }

    // -------------------------------------------------------------------------
    // POST /webhooks/whatsapp — Réception des événements
    // -------------------------------------------------------------------------

    /**
     * Traite les événements entrants de Meta WhatsApp Cloud API.
     * Vérifie la signature HMAC-SHA256 avant de traiter.
     *
     * Meta attend TOUJOURS un 200 OK rapide (< 20s).
     * Le traitement lourd doit être asynchrone.
     */
    public function receive(Request $request): JsonResponse
    {
        // Vérification de la signature HMAC-SHA256
        if (! $this->verifySignature($request)) {
            Log::warning('WhatsApp webhook : signature invalide', [
                'ip' => $request->ip(),
            ]);
            return response()->json(['error' => 'Invalid signature'], 403);
        }

        $payload = $request->json()->all();

        // Vérifier que c'est bien un objet whatsapp_business_account
        if (($payload['object'] ?? '') !== 'whatsapp_business_account') {
            return response()->json(['status' => 'ignored'], 200);
        }

        try {
            // Dispatch asynchrone pour répondre vite à Meta
            dispatch(function () use ($payload) {
                app(WhatsAppService::class)->handleWebhook($payload);
            })->afterResponse();
        } catch (\Exception $e) {
            Log::error('WhatsApp webhook traitement échoué', [
                'error'   => $e->getMessage(),
                'payload' => $payload,
            ]);
        }

        // Répondre 200 immédiatement à Meta
        return response()->json(['status' => 'ok'], 200);
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Vérifie la signature X-Hub-Signature-256 de Meta.
     * Format : sha256=<hmac_hex>
     */
    private function verifySignature(Request $request): bool
    {
        $signature = $request->header('X-Hub-Signature-256');

        if (! $signature) {
            // En développement, tolérer l'absence de signature
            if (app()->environment('local')) {
                return true;
            }
            return false;
        }

        $appSecret = config('services.whatsapp.app_secret');

        if (! $appSecret) {
            Log::warning('WHATSAPP_APP_SECRET non configuré — vérification de signature ignorée');
            return true;
        }

        $body     = $request->getContent();
        $expected = 'sha256=' . hash_hmac('sha256', $body, $appSecret);

        return hash_equals($expected, $signature);
    }
}
