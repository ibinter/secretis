<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payment\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * WebhookController — Réception des callbacks prestataires de paiement
 *
 * RÈGLES DE SÉCURITÉ ABSOLUES :
 * 1. Ces routes n'ont AUCUN middleware auth (les prestataires ne s'authentifient pas)
 * 2. La sécurité repose UNIQUEMENT sur la vérification HMAC (WebhookService)
 * 3. Toujours retourner HTTP 200 pour éviter les relivraisons en boucle
 * 4. L'URL de retour passerelle (redirect) N'ACTIVE JAMAIS la licence
 *    → L'activation n'a lieu que via ces webhooks HMAC vérifiés
 * 5. Exclure ces routes du middleware CSRF (voir bootstrap/app.php)
 *
 * Rate limiting : 30 requêtes/minute par IP (voir routes/api/payments.php)
 */
class WebhookController extends Controller
{
    public function __construct(
        private WebhookService $webhookService,
    ) {}

    /**
     * CinetPay — Paiements carte et mobile Afrique
     * POST /webhooks/cinetpay
     * Header : X-Cinetpay-Signature
     */
    public function cinetpay(Request $request): JsonResponse
    {
        Log::channel('payments')->info('Webhook CinetPay reçu', [
            'ip'    => $request->ip(),
            'event' => $request->input('cpm_payment_status', 'unknown'),
        ]);

        return $this->webhookService->handle('cinetpay', $request);
    }

    /**
     * Paystack — Paiements carte (Nigeria, Ghana, Afrique du Sud, Kenya)
     * POST /webhooks/paystack
     * Header : X-Paystack-Signature
     */
    public function paystack(Request $request): JsonResponse
    {
        Log::channel('payments')->info('Webhook Paystack reçu', [
            'ip'    => $request->ip(),
            'event' => $request->input('event', 'unknown'),
        ]);

        return $this->webhookService->handle('paystack', $request);
    }

    /**
     * Flutterwave — Paiements multicanal Afrique
     * POST /webhooks/flutterwave
     * Header : verif-hash
     */
    public function flutterwave(Request $request): JsonResponse
    {
        Log::channel('payments')->info('Webhook Flutterwave reçu', [
            'ip'    => $request->ip(),
            'event' => $request->input('event', 'unknown'),
        ]);

        return $this->webhookService->handle('flutterwave', $request);
    }

    /**
     * Stripe — Paiements carte internationaux
     * POST /webhooks/stripe
     * Header : Stripe-Signature (format t=...,v1=...)
     */
    public function stripe(Request $request): JsonResponse
    {
        Log::channel('payments')->info('Webhook Stripe reçu', [
            'ip'    => $request->ip(),
            'type'  => $request->input('type', 'unknown'),
        ]);

        return $this->webhookService->handle('stripe', $request);
    }

    /**
     * Orange Money — Mobile Money Afrique de l'Ouest
     * POST /webhooks/orange-money
     * Format : form-encoded, token dans notif_token
     */
    public function orangeMoney(Request $request): JsonResponse
    {
        Log::channel('payments')->info('Webhook Orange Money reçu', [
            'ip'       => $request->ip(),
            'order_id' => $request->input('order_id', 'unknown'),
        ]);

        return $this->webhookService->handle('orange_money', $request);
    }

    /**
     * MTN Mobile Money — Mobile Money Afrique
     * POST /webhooks/mtn-momo
     */
    public function mtnMomo(Request $request): JsonResponse
    {
        Log::channel('payments')->info('Webhook MTN MoMo reçu', [
            'ip'          => $request->ip(),
            'external_id' => $request->input('externalId', 'unknown'),
        ]);

        return $this->webhookService->handle('mtn_momo', $request);
    }

    /**
     * Wave — Mobile Money Sénégal / Côte d'Ivoire
     * POST /webhooks/wave
     * Header : Wave-Signature
     */
    public function wave(Request $request): JsonResponse
    {
        Log::channel('payments')->info('Webhook Wave reçu', [
            'ip'   => $request->ip(),
            'type' => $request->input('type', 'unknown'),
        ]);

        return $this->webhookService->handle('wave', $request);
    }
}
