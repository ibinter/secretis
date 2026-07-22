<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * WebhookVerifier — Vérification cryptographique des webhooks entrants
 *
 * SÉCURITÉ CRITIQUE :
 * - Toutes les comparaisons utilisent hash_equals() (timing-safe)
 *   pour prévenir les timing attacks sur la signature.
 * - Jamais de comparaison avec == ou === sur les HMAC.
 * - Chaque tentative (réussie ou échouée) est loggée pour audit.
 *
 * Principe : l'attaquant ne peut pas déduire si la signature est
 * "proche" ou "loin" de la bonne valeur grâce au temps constant.
 */
class WebhookVerifier
{
    // -------------------------------------------------------------------------
    // CinetPay
    // -------------------------------------------------------------------------

    /**
     * Vérifie la signature d'un webhook CinetPay.
     *
     * CinetPay signe avec HMAC-SHA256 sur la concaténation :
     *   site_id + transaction_id + amount + currency + status
     *
     * @param  array  $payload   Corps décodé du webhook (JSON → array)
     * @param  string $signature Valeur du header X-Cinetpay-Signature
     * @param  string $secret    Clé secrète CinetPay (déchiffrée depuis BDD)
     */
    public function verifyCinetPay(array $payload, string $signature, string $secret): bool
    {
        // Construction de la chaîne à signer selon la doc CinetPay
        $message = ($payload['cpm_site_id']        ?? '') .
                   ($payload['cpm_trans_id']        ?? '') .
                   ($payload['cpm_amount']          ?? '') .
                   ($payload['cpm_currency']        ?? '') .
                   ($payload['cpm_payment_status']  ?? '');

        $expected = hash_hmac('sha256', $message, $secret);

        $result = hash_equals($expected, strtolower($signature));

        $this->logAttempt('cinetpay', $result, [
            'trans_id' => $payload['cpm_trans_id'] ?? 'unknown',
            'status'   => $payload['cpm_payment_status'] ?? 'unknown',
        ]);

        return $result;
    }

    // -------------------------------------------------------------------------
    // Paystack
    // -------------------------------------------------------------------------

    /**
     * Vérifie la signature d'un webhook Paystack.
     *
     * Paystack signe avec HMAC-SHA512 sur le body brut (string JSON).
     * Le header de signature est : X-Paystack-Signature
     *
     * IMPORTANT : utiliser le body RAW (avant json_decode), sinon
     * l'ordre des clés peut changer et invalider la signature.
     *
     * @param  string $rawBody   Corps brut de la requête (file_get_contents('php://input'))
     * @param  string $signature Valeur du header X-Paystack-Signature
     * @param  string $secret    Clé secrète Paystack
     */
    public function verifyPaystack(string $rawBody, string $signature, string $secret): bool
    {
        $expected = hash_hmac('sha512', $rawBody, $secret);

        $result = hash_equals($expected, strtolower($signature));

        // Extraire l'ID de transaction pour l'audit sans parser le JSON deux fois
        $data = json_decode($rawBody, true);

        $this->logAttempt('paystack', $result, [
            'reference' => $data['data']['reference'] ?? 'unknown',
            'event'     => $data['event']             ?? 'unknown',
        ]);

        return $result;
    }

    // -------------------------------------------------------------------------
    // Flutterwave
    // -------------------------------------------------------------------------

    /**
     * Vérifie la signature d'un webhook Flutterwave.
     *
     * Flutterwave envoie un hash SHA256 dans le header verif-hash.
     * Le secret est configuré dans le tableau de bord Flutterwave.
     *
     * @param  string $rawBody   Corps brut de la requête
     * @param  string $signature Valeur du header verif-hash
     * @param  string $secret    Clé secrète Flutterwave (webhook secret hash)
     */
    public function verifyFlutterwave(string $rawBody, string $signature, string $secret): bool
    {
        // Flutterwave utilise un hash direct SHA256 du secret (pas HMAC)
        // selon leur documentation officielle
        $expected = hash('sha256', $secret);

        $result = hash_equals($expected, strtolower($signature));

        $data = json_decode($rawBody, true);

        $this->logAttempt('flutterwave', $result, [
            'tx_ref' => $data['data']['tx_ref'] ?? 'unknown',
            'event'  => $data['event']          ?? 'unknown',
        ]);

        return $result;
    }

    // -------------------------------------------------------------------------
    // Orange Money (callback USSD)
    // -------------------------------------------------------------------------

    /**
     * Vérifie le callback Orange Money.
     *
     * Orange Money utilise un token de session + HMAC-SHA256.
     * Le format du callback varie par pays (CI, SN, ML, BF).
     *
     * @param  array  $payload   Données du callback (POST fields)
     * @param  string $token     Token fourni dans le callback (notif_token)
     * @param  string $secret    Clé secrète Orange Money
     */
    public function verifyOrangeMoney(array $payload, string $token, string $secret): bool
    {
        // Tri des clés pour une signature reproductible
        ksort($payload);
        $message  = http_build_query($payload);
        $expected = hash_hmac('sha256', $message, $secret);

        $result = hash_equals($expected, strtolower($token));

        $this->logAttempt('orange_money', $result, [
            'order_id' => $payload['order_id']  ?? $payload['notif_id'] ?? 'unknown',
            'status'   => $payload['status']    ?? 'unknown',
        ]);

        return $result;
    }

    // -------------------------------------------------------------------------
    // MTN MoMo
    // -------------------------------------------------------------------------

    /**
     * Vérifie le callback MTN Mobile Money.
     *
     * MTN MoMo utilise OAuth 2.0 + signature sur le body.
     * Le header de signature est X-Callback-Http-Status.
     *
     * @param  array  $payload        Données du callback JSON décodé
     * @param  string $externalId     ID externe fourni lors de la requête initiale
     * @param  string $apiKey         Clé API MTN MoMo
     */
    public function verifyMtnMomo(array $payload, string $externalId, string $apiKey): bool
    {
        // MTN MoMo vérifie que le externalId correspond à notre référence
        $payloadExternalId = $payload['externalId'] ?? '';

        // Comparaison timing-safe même pour les IDs
        $result = hash_equals(
            hash('sha256', $externalId),
            hash('sha256', $payloadExternalId)
        );

        $this->logAttempt('mtn_momo', $result, [
            'external_id'    => $externalId,
            'financial_tx_id' => $payload['financialTransactionId'] ?? 'unknown',
            'status'         => $payload['status'] ?? 'unknown',
        ]);

        return $result;
    }

    // -------------------------------------------------------------------------
    // Logger privé
    // -------------------------------------------------------------------------

    /**
     * Journalise chaque tentative de vérification de webhook.
     * Loggue TOUJOURS — succès ET échec — pour l'audit de sécurité.
     */
    private function logAttempt(string $provider, bool $success, array $context): void
    {
        $level   = $success ? 'info' : 'warning';
        $message = $success
            ? "Webhook {$provider} : signature valide"
            : "Webhook {$provider} : SIGNATURE INVALIDE — possible tentative de fraude";

        Log::channel('payments')->{$level}($message, array_merge($context, [
            'provider'   => $provider,
            'verified'   => $success,
            'ip'         => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 256),
            'timestamp'  => now()->toIso8601String(),
        ]));
    }
}
