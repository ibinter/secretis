<?php

namespace App\Http\Controllers;

use App\Services\PaymentService;
use App\Services\WebhookVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * WebhookController — Réception des callbacks prestataires de paiement
 *
 * SÉCURITÉ ABSOLUE :
 * Ces routes ne doivent JAMAIS avoir de middleware auth.
 * La sécurité repose UNIQUEMENT sur la vérification de signature HMAC.
 *
 * Flux pour chaque webhook :
 *   1. Lire le body RAW (avant json_decode) pour la vérification de signature
 *   2. Vérifier la signature HMAC (timing-safe, hash_equals)
 *   3. Répondre HTTP 200 immédiatement (les prestataires ont des timeouts courts)
 *   4. Traiter le paiement de façon asynchrone (ou synchrone si temps OK)
 *
 * Rate limiting : voir routes/api/payments.php (ThrottleRequests middleware)
 *
 * IMPORTANT : Toujours retourner HTTP 200 même en cas d'erreur,
 * sinon le prestataire va relivrer le webhook en boucle.
 * Les erreurs sont gérées en interne via les logs.
 */
class WebhookController extends Controller
{
    public function __construct(
        private PaymentService  $paymentService,
        private WebhookVerifier $webhookVerifier,
    ) {}

    // =========================================================================
    // CinetPay
    // =========================================================================

    /**
     * Webhook CinetPay — Confirmation de paiement carte/mobile
     *
     * POST /api/webhooks/cinetpay
     * Header : X-Cinetpay-Signature: <hmac-sha256>
     *
     * Documentation : https://docs.cinetpay.com/api#notification
     */
    public function cinetpay(Request $request): JsonResponse
    {
        // CRITIQUE : Lire le body RAW avant tout traitement
        $rawBody   = $request->getContent();
        $signature = $request->header('X-Cinetpay-Signature', '');
        $payload   = $request->all();

        Log::channel('payments')->info('Webhook CinetPay reçu', [
            'ip'    => $request->ip(),
            'event' => $payload['cpm_payment_status'] ?? 'unknown',
        ]);

        try {
            $secret = decrypt(config('services.cinetpay.webhook_secret'));

            $this->paymentService->processWebhookPayment(
                provider:  'cinetpay',
                payload:   $payload,
                rawBody:   $rawBody,
                signature: $signature,
                secret:    $secret,
            );
        } catch (\Exception $e) {
            // Signature invalide ou erreur de traitement
            Log::channel('payments')->error('Webhook CinetPay : erreur de traitement', [
                'error' => $e->getMessage(),
                'ip'    => $request->ip(),
            ]);
        }

        // TOUJOURS retourner 200 pour éviter les relivraisons en boucle
        return response()->json(['status' => 'received'], 200);
    }

    // =========================================================================
    // Paystack
    // =========================================================================

    /**
     * Webhook Paystack — Confirmation de paiement
     *
     * POST /api/webhooks/paystack
     * Header : X-Paystack-Signature: <hmac-sha512>
     *
     * Documentation : https://paystack.com/docs/payments/webhooks
     */
    public function paystack(Request $request): JsonResponse
    {
        $rawBody   = $request->getContent();
        $signature = $request->header('X-Paystack-Signature', '');
        $payload   = $request->all();

        Log::channel('payments')->info('Webhook Paystack reçu', [
            'ip'    => $request->ip(),
            'event' => $payload['event'] ?? 'unknown',
        ]);

        // Traiter uniquement les events de succès
        if (! in_array($payload['event'] ?? '', ['charge.success', 'transfer.success'], true)) {
            return response()->json(['status' => 'ignored'], 200);
        }

        try {
            $secret = decrypt(config('services.paystack.secret_key'));

            $this->paymentService->processWebhookPayment(
                provider:  'paystack',
                payload:   $payload,
                rawBody:   $rawBody,
                signature: $signature,
                secret:    $secret,
            );
        } catch (\Exception $e) {
            Log::channel('payments')->error('Webhook Paystack : erreur', [
                'error' => $e->getMessage(),
                'ip'    => $request->ip(),
            ]);
        }

        return response()->json(['status' => 'received'], 200);
    }

    // =========================================================================
    // Flutterwave
    // =========================================================================

    /**
     * Webhook Flutterwave — Confirmation de paiement
     *
     * POST /api/webhooks/flutterwave
     * Header : verif-hash: <sha256-du-secret>
     *
     * Documentation : https://developer.flutterwave.com/docs/integration-guides/webhooks
     */
    public function flutterwave(Request $request): JsonResponse
    {
        $rawBody   = $request->getContent();
        $signature = $request->header('verif-hash', '');
        $payload   = $request->all();

        Log::channel('payments')->info('Webhook Flutterwave reçu', [
            'ip'    => $request->ip(),
            'event' => $payload['event'] ?? 'unknown',
        ]);

        if (($payload['event'] ?? '') !== 'charge.completed') {
            return response()->json(['status' => 'ignored'], 200);
        }

        try {
            $secret = decrypt(config('services.flutterwave.webhook_secret'));

            $this->paymentService->processWebhookPayment(
                provider:  'flutterwave',
                payload:   $payload,
                rawBody:   $rawBody,
                signature: $signature,
                secret:    $secret,
            );
        } catch (\Exception $e) {
            Log::channel('payments')->error('Webhook Flutterwave : erreur', [
                'error' => $e->getMessage(),
                'ip'    => $request->ip(),
            ]);
        }

        return response()->json(['status' => 'received'], 200);
    }

    // =========================================================================
    // Orange Money
    // =========================================================================

    /**
     * Callback Orange Money USSD
     *
     * POST /api/webhooks/orange-money
     *
     * Orange Money utilise un format de callback différent (form-encoded),
     * et le token de notification est dans le champ "notif_token".
     *
     * Documentation : API Orange Money Côte d'Ivoire v2
     */
    public function orangeMoney(Request $request): JsonResponse
    {
        $payload = $request->all(); // Form-encoded, pas JSON
        $token   = $request->input('notif_token', '');

        Log::channel('payments')->info('Callback Orange Money reçu', [
            'ip'       => $request->ip(),
            'order_id' => $payload['order_id'] ?? 'unknown',
            'status'   => $payload['status']   ?? 'unknown',
        ]);

        try {
            $secret = decrypt(config('services.orange_money.webhook_secret'));

            // Vérification signature Orange Money
            if (! $this->webhookVerifier->verifyOrangeMoney($payload, $token, $secret)) {
                Log::channel('security')->warning('Orange Money : signature invalide', [
                    'ip'       => $request->ip(),
                    'order_id' => $payload['order_id'] ?? 'unknown',
                ]);
                return response()->json(['status' => 'received'], 200);
            }

            // Vérifier si le paiement est réussi
            if (($payload['status'] ?? '') !== 'SUCCESS') {
                Log::channel('payments')->info('Orange Money : paiement non réussi', [
                    'status'   => $payload['status'] ?? 'unknown',
                    'order_id' => $payload['order_id'] ?? 'unknown',
                ]);
                return response()->json(['status' => 'received'], 200);
            }

            // Trouver et valider le paiement manuellement
            // Orange Money est semi-automatique : on confirme via l'idempotency_key
            $payment = \App\Models\Payment::where('idempotency_key', $payload['order_id'] ?? '')
                ->where('status', 'pending')
                ->first();

            if ($payment) {
                // Mettre à jour la référence externe
                $payment->update([
                    'reference' => $payload['pay_token'] ?? $payload['order_id'],
                    'metadata'  => array_merge($payment->metadata ?? [], [
                        'orange_callback' => $payload,
                        'received_at'     => now()->toIso8601String(),
                    ]),
                ]);

                // Déclencher la validation (sera confirmée par admin si nécessaire
                // ou auto-validée selon la configuration)
                if (config('secretis.payments.orange_money.auto_validate', false)) {
                    $this->paymentService->validateManualPayment(
                        $payment,
                        \App\Models\User::ibigAdmin()->first()
                    );
                }
            }
        } catch (\Exception $e) {
            Log::channel('payments')->error('Callback Orange Money : erreur', [
                'error' => $e->getMessage(),
                'ip'    => $request->ip(),
            ]);
        }

        return response()->json(['status' => 'received'], 200);
    }

    // =========================================================================
    // MTN MoMo
    // =========================================================================

    /**
     * Callback MTN Mobile Money
     *
     * POST /api/webhooks/mtn-momo
     * Header : X-Callback-Http-Status (si configuré)
     *
     * MTN MoMo utilise une API de collection avec des callbacks configurables.
     * Documentation : https://momodeveloper.mtn.com/
     */
    public function mtnMomo(Request $request): JsonResponse
    {
        $rawBody = $request->getContent();
        $payload = $request->all();

        Log::channel('payments')->info('Callback MTN MoMo reçu', [
            'ip'          => $request->ip(),
            'external_id' => $payload['externalId']             ?? 'unknown',
            'status'      => $payload['status']                 ?? 'unknown',
            'tx_id'       => $payload['financialTransactionId'] ?? 'unknown',
        ]);

        try {
            $apiKey     = decrypt(config('services.mtn_momo.api_key'));
            $externalId = $payload['externalId'] ?? '';

            // Vérification signature MTN MoMo
            if (! $this->webhookVerifier->verifyMtnMomo($payload, $externalId, $apiKey)) {
                Log::channel('security')->warning('MTN MoMo : vérification échouée', [
                    'ip'          => $request->ip(),
                    'external_id' => $externalId,
                ]);
                return response()->json(['status' => 'received'], 200);
            }

            if (($payload['status'] ?? '') !== 'SUCCESSFUL') {
                return response()->json(['status' => 'received'], 200);
            }

            $payment = \App\Models\Payment::where('idempotency_key', $externalId)
                ->where('status', 'pending')
                ->first();

            if ($payment) {
                $payment->update([
                    'reference' => $payload['financialTransactionId'] ?? $externalId,
                    'metadata'  => array_merge($payment->metadata ?? [], [
                        'mtn_callback' => $payload,
                        'received_at'  => now()->toIso8601String(),
                    ]),
                ]);

                if (config('secretis.payments.mtn_momo.auto_validate', false)) {
                    $this->paymentService->validateManualPayment(
                        $payment,
                        \App\Models\User::ibigAdmin()->first()
                    );
                }
            }
        } catch (\Exception $e) {
            Log::channel('payments')->error('Callback MTN MoMo : erreur', [
                'error' => $e->getMessage(),
                'ip'    => $request->ip(),
            ]);
        }

        return response()->json(['status' => 'received'], 200);
    }
}
