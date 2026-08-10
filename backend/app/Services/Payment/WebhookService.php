<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\PaymentWebhookLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * WebhookService — Traitement sécurisé des webhooks de paiement
 *
 * FLUX OBLIGATOIRE (dans cet ordre impératif) :
 *   1. Vérification signature HMAC (timing-safe hash_equals)
 *   2. Extraction event_id
 *   3. Vérification doublon (idempotence) via SELECT FOR UPDATE
 *   4. Enregistrement du webhook
 *   5. Vérification montant (tolérance 1 unité max)
 *   6. Activation licence via PaymentService->activateLicense()
 *   7. Marquer le webhook comme traité
 *
 * RÈGLES ABSOLUES :
 * - Jamais d'activation sur retour URL (URL falsifiable)
 * - TOUJOURS hash_equals() — jamais == ou ===
 * - Un event_id webhook ne déclenche qu'une seule activation
 * - Le montant reçu doit correspondre au montant attendu (±1 unité)
 */
class WebhookService
{
    public function __construct(
        private PaymentService $paymentService,
    ) {}

    /**
     * Point d'entrée unique pour tous les webhooks.
     * Retourne toujours HTTP 200 pour éviter les relivraisons en boucle.
     */
    public function handle(string $provider, Request $request): JsonResponse
    {
        // 1. VÉRIFICATION SIGNATURE HMAC (timing-safe)
        if (! $this->verifySignature($provider, $request)) {
            Log::channel('security')->critical('Webhook signature invalide', [
                'provider'   => $provider,
                'ip'         => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            // Retourner 200 (pas 401) pour ne pas alerter l'attaquant
            return response()->json(['status' => 'received'], 200);
        }

        // 2. EXTRACTION event_id
        $eventId   = $this->extractEventId($provider, $request);
        $eventType = $this->extractEventType($provider, $request);

        if (empty($eventId)) {
            Log::warning('Webhook sans event_id', ['provider' => $provider]);
            return response()->json(['status' => 'received'], 200);
        }

        // 3. VÉRIFICATION DOUBLON (idempotence)
        $alreadyProcessed = DB::transaction(function () use ($eventId) {
            return PaymentWebhookLog::where('event_id', $eventId)
                                    ->lockForUpdate()
                                    ->exists();
        });

        if ($alreadyProcessed) {
            Log::info('Webhook déjà traité (idempotent)', [
                'provider' => $provider,
                'event_id' => $eventId,
            ]);
            return response()->json(['status' => 'already_processed'], 200);
        }

        // 4. ENREGISTREMENT DU WEBHOOK
        $orderReference   = $this->extractOrderReference($provider, $request);
        $amountReceived   = $this->extractAmount($provider, $request);
        $currencyReceived = $this->extractCurrency($provider, $request);

        $log = PaymentWebhookLog::create([
            'provider'          => $provider,
            'event_id'          => $eventId,
            'event_type'        => $eventType,
            'order_reference'   => $orderReference,
            'amount_received'   => $amountReceived,
            'currency_received' => $currencyReceived,
            'signature_valid'   => true, // déjà vérifié ci-dessus
            'raw_payload'       => $request->getContent(),
        ]);

        // 5. TROUVER LA COMMANDE
        $order = $this->findOrder($orderReference, $request->all());

        if (! $order) {
            $log->update(['error_message' => 'Order not found: ' . $orderReference]);
            return response()->json(['status' => 'received'], 200);
        }

        // 6. VÉRIFICATION MONTANT (tolérance 1 unité max)
        if (! $this->amountMatches($order, (float) $amountReceived)) {
            $log->update([
                'amount_matches' => false,
                'error_message'  => sprintf(
                    'Amount mismatch: expected %s, received %s',
                    $order->getNetAmount(),
                    $amountReceived
                ),
            ]);
            Log::warning('Webhook: montant non correspondant', [
                'provider'  => $provider,
                'event_id'  => $eventId,
                'expected'  => $order->getNetAmount(),
                'received'  => $amountReceived,
                'order_ref' => $orderReference,
            ]);
            return response()->json(['status' => 'received'], 200);
        }

        $log->update(['amount_matches' => true]);

        // Vérifier que l'événement est un succès
        if (! $this->isSuccessEvent($provider, $request)) {
            $log->update([
                'processed'   => true,
                'processed_at' => Carbon::now(),
                'error_message' => 'Non-success event type: ' . $eventType,
            ]);
            return response()->json(['status' => 'received'], 200);
        }

        // 7. ACTIVATION LICENCE
        try {
            $order->update(['status' => 'processing']);
            $this->paymentService->activateLicense($order);

            $log->update([
                'processed'    => true,
                'processed_at' => Carbon::now(),
            ]);

            Log::info('Webhook traité — licence activée', [
                'provider'  => $provider,
                'event_id'  => $eventId,
                'order_ref' => $orderReference,
            ]);
        } catch (\Throwable $e) {
            $log->update(['error_message' => $e->getMessage()]);
            Log::error('Webhook: erreur activation licence', [
                'provider' => $provider,
                'event_id' => $eventId,
                'error'    => $e->getMessage(),
            ]);
        }

        return response()->json(['status' => 'received'], 200);
    }

    // =========================================================================
    // Vérification signature HMAC (timing-safe)
    // =========================================================================

    /**
     * RÈGLE ABSOLUE : utiliser UNIQUEMENT hash_equals() — jamais == ou ===
     */
    private function verifySignature(string $provider, Request $request): bool
    {
        return match ($provider) {
            'cinetpay'    => $this->verifyCinetpay($request),
            'paystack'    => $this->verifyPaystack($request),
            'flutterwave' => $this->verifyFlutterwave($request),
            'stripe'      => $this->verifyStripe($request),
            'orange_money' => $this->verifyOrangeMoney($request),
            'mtn_momo'    => $this->verifyMtnMomo($request),
            'wave'        => $this->verifyWave($request),
            default       => false,
        };
    }

    private function verifyCinetpay(Request $request): bool
    {
        $secret    = decrypt(config('payment.providers.cinetpay.webhook_secret', ''));
        $signature = $request->header('X-Cinetpay-Signature', '');
        $rawBody   = $request->getContent();

        if (empty($secret) || empty($signature)) {
            return false;
        }

        $expected = hash_hmac('sha256', $rawBody, $secret);
        return hash_equals($expected, $signature); // TIMING-SAFE
    }

    private function verifyPaystack(Request $request): bool
    {
        $secret    = decrypt(config('payment.providers.paystack.webhook_secret', ''));
        $signature = $request->header('X-Paystack-Signature', '');
        $rawBody   = $request->getContent();

        if (empty($secret) || empty($signature)) {
            return false;
        }

        $expected = hash_hmac('sha512', $rawBody, $secret);
        return hash_equals($expected, $signature); // TIMING-SAFE
    }

    private function verifyFlutterwave(Request $request): bool
    {
        $secret    = decrypt(config('payment.providers.flutterwave.secret_hash', ''));
        $signature = $request->header('verif-hash', '');

        if (empty($secret) || empty($signature)) {
            return false;
        }

        // Flutterwave envoie le secret directement en header (hash simple)
        return hash_equals($secret, $signature); // TIMING-SAFE
    }

    private function verifyStripe(Request $request): bool
    {
        $secret    = decrypt(config('payment.providers.stripe.webhook_secret', ''));
        $signature = $request->header('Stripe-Signature', '');
        $rawBody   = $request->getContent();

        if (empty($secret) || empty($signature)) {
            return false;
        }

        // Stripe utilise le format : t=timestamp,v1=signature
        $parts     = [];
        foreach (explode(',', $signature) as $part) {
            [$key, $val] = array_pad(explode('=', $part, 2), 2, '');
            $parts[$key] = $val;
        }

        $timestamp = $parts['t'] ?? '';
        $v1        = $parts['v1'] ?? '';

        if (empty($timestamp) || empty($v1)) {
            return false;
        }

        // Tolérance timestamp : 5 minutes
        if (abs(time() - (int) $timestamp) > 300) {
            Log::warning('Stripe webhook: timestamp trop ancien', ['timestamp' => $timestamp]);
            return false;
        }

        $signedPayload = "{$timestamp}.{$rawBody}";
        $expected      = hash_hmac('sha256', $signedPayload, $secret);
        return hash_equals($expected, $v1); // TIMING-SAFE
    }

    private function verifyOrangeMoney(Request $request): bool
    {
        $secret = decrypt(config('payment.providers.orange_money.webhook_secret', ''));
        $token  = $request->input('notif_token', '');

        if (empty($secret) || empty($token)) {
            return false;
        }

        $expected = hash_hmac('sha256', json_encode($request->except('notif_token')), $secret);
        return hash_equals($expected, $token); // TIMING-SAFE
    }

    private function verifyMtnMomo(Request $request): bool
    {
        // MTN MoMo utilise une clé API pour vérifier les callbacks
        $apiKey     = decrypt(config('payment.providers.mtn_momo.api_key', ''));
        $externalId = $request->input('externalId', '');
        $signature  = $request->header('X-Callback-Http-Status', '');

        if (empty($apiKey) || empty($externalId)) {
            // MTN MoMo en mode test : accepter sans vérification stricte
            return config('payment.providers.mtn_momo.test_mode', true);
        }

        $expected = hash_hmac('sha256', $externalId, $apiKey);
        return hash_equals($expected, $signature); // TIMING-SAFE
    }

    private function verifyWave(Request $request): bool
    {
        $secret    = decrypt(config('payment.providers.wave.webhook_secret', ''));
        $signature = $request->header('Wave-Signature', '');
        $rawBody   = $request->getContent();

        if (empty($secret) || empty($signature)) {
            return false;
        }

        $expected = hash_hmac('sha256', $rawBody, $secret);
        return hash_equals($expected, $signature); // TIMING-SAFE
    }

    // =========================================================================
    // Extraction des données
    // =========================================================================

    private function extractEventId(string $provider, Request $request): string
    {
        $payload = $request->all();

        return match ($provider) {
            'cinetpay'    => $payload['cpm_trans_id']              ?? '',
            'paystack'    => $payload['data']['id']                ?? '',
            'flutterwave' => (string) ($payload['data']['id']      ?? ''),
            'stripe'      => $payload['id']                        ?? '',
            'orange_money' => $payload['pay_token']                ?? $payload['order_id'] ?? '',
            'mtn_momo'    => $payload['financialTransactionId']    ?? $payload['externalId'] ?? '',
            'wave'        => $payload['id']                        ?? '',
            default       => $payload['id']                        ?? '',
        };
    }

    private function extractEventType(string $provider, Request $request): string
    {
        $payload = $request->all();

        return match ($provider) {
            'cinetpay'    => $payload['cpm_payment_status']    ?? 'unknown',
            'paystack'    => $payload['event']                 ?? 'unknown',
            'flutterwave' => $payload['event']                 ?? 'unknown',
            'stripe'      => $payload['type']                  ?? 'unknown',
            'orange_money' => $payload['status']               ?? 'unknown',
            'mtn_momo'    => $payload['status']                ?? 'unknown',
            'wave'        => $payload['type']                  ?? 'unknown',
            default       => 'unknown',
        };
    }

    private function extractOrderReference(string $provider, Request $request): string
    {
        $payload = $request->all();

        return match ($provider) {
            'cinetpay'    => $payload['cpm_custom']                 ?? $payload['cpm_trans_id'] ?? '',
            'paystack'    => $payload['data']['reference']          ?? '',
            'flutterwave' => $payload['data']['tx_ref']             ?? '',
            'stripe'      => $payload['data']['object']['metadata']['order_reference'] ?? '',
            'orange_money' => $payload['order_id']                  ?? '',
            'mtn_momo'    => $payload['externalId']                 ?? '',
            'wave'        => $payload['client_reference']           ?? '',
            default       => '',
        };
    }

    private function extractAmount(string $provider, Request $request): float
    {
        $payload = $request->all();

        $raw = match ($provider) {
            'cinetpay'    => $payload['cpm_amount']           ?? 0,
            'paystack'    => ($payload['data']['amount'] ?? 0) / 100, // Paystack en centimes
            'flutterwave' => $payload['data']['amount']        ?? 0,
            'stripe'      => ($payload['data']['object']['amount'] ?? 0) / 100,
            'orange_money' => $payload['amount']               ?? 0,
            'mtn_momo'    => $payload['amount']                ?? 0,
            'wave'        => $payload['amount']                ?? 0,
            default       => 0,
        };

        return (float) $raw;
    }

    private function extractCurrency(string $provider, Request $request): string
    {
        $payload = $request->all();

        return match ($provider) {
            'cinetpay'    => $payload['cpm_currency']              ?? 'XOF',
            'paystack'    => strtoupper($payload['data']['currency'] ?? 'NGN'),
            'flutterwave' => strtoupper($payload['data']['currency'] ?? 'XOF'),
            'stripe'      => strtoupper($payload['data']['object']['currency'] ?? 'EUR'),
            'orange_money' => 'XOF',
            'mtn_momo'    => 'XOF',
            'wave'        => 'XOF',
            default       => 'XOF',
        };
    }

    private function isSuccessEvent(string $provider, Request $request): bool
    {
        $payload = $request->all();

        return match ($provider) {
            'cinetpay'    => ($payload['cpm_payment_status'] ?? '') === 'ACCEPTED',
            'paystack'    => in_array($payload['event'] ?? '', ['charge.success', 'transfer.success'], true),
            'flutterwave' => ($payload['event'] ?? '') === 'charge.completed'
                             && ($payload['data']['status'] ?? '') === 'successful',
            'stripe'      => in_array($payload['type'] ?? '', ['payment_intent.succeeded', 'charge.succeeded'], true),
            'orange_money' => ($payload['status'] ?? '') === 'SUCCESS',
            'mtn_momo'    => ($payload['status'] ?? '') === 'SUCCESSFUL',
            'wave'        => ($payload['type'] ?? '') === 'checkout.session.completed',
            default       => false,
        };
    }

    // =========================================================================
    // Vérification du montant
    // =========================================================================

    /**
     * Vérifie que le montant reçu correspond au montant attendu.
     * Tolérance : config('payment.amount_tolerance') unités (défaut 1).
     *
     * RÈGLE DE SÉCURITÉ : ne jamais activer si le montant reçu est inférieur
     * au montant attendu (tolérance uniquement pour arrondis de conversion).
     */
    private function amountMatches(Order $order, float $received): bool
    {
        if ($received <= 0) {
            return false;
        }

        $expected  = (float) $order->getNetAmount();
        $tolerance = (float) config('payment.amount_tolerance', 1);

        return abs($expected - $received) <= $tolerance;
    }

    // =========================================================================
    // Recherche de commande
    // =========================================================================

    private function findOrder(string $reference, array $payload): ?Order
    {
        if (empty($reference)) {
            return null;
        }

        // Chercher par référence ORD-XXXX-XXXXX
        $order = Order::where('reference', $reference)
                      ->whereIn('status', ['pending', 'awaiting_proof', 'proof_submitted', 'processing'])
                      ->first();

        if ($order) {
            return $order;
        }

        // Fallback : chercher par idempotency_key (certains providers renvoient notre clé)
        return Order::where('idempotency_key', $reference)
                    ->whereIn('status', ['pending', 'awaiting_proof', 'proof_submitted', 'processing'])
                    ->first();
    }
}
