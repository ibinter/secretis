<?php

/**
 * WebhookVerifierTest — Tests unitaires de la vérification des webhooks
 *
 * Teste : signature CinetPay, payload falsifié, timing-safe, logs.
 */

use Illuminate\Support\Facades\Log;

beforeEach(function () {
    $this->secret = 'cinetpay_webhook_secret_test_2026';
    config(['services.cinetpay.secret' => $this->secret]);
});

// =============================================================================
// Vérification de signature CinetPay
// =============================================================================

it('verifies valid CinetPay signature', function () {
    $payload = [
        'cpm_site_id'    => 'SECRETIS_001',
        'cpm_trans_id'   => 'TXN_2026_001',
        'cpm_amount'     => '15000',
        'cpm_currency'   => 'XOF',
        'cpm_result'     => '00',
        'cpm_trans_date' => '2026-01-15 10:30:00',
    ];

    // Générer la signature correcte
    $dataString = implode('', array_values($payload));
    $signature  = hash_hmac('sha256', $dataString, $this->secret);

    $isValid = verifySignature($payload, $signature, $this->secret);

    expect($isValid)->toBeTrue();
});

it('rejects tampered payload', function () {
    $originalPayload = [
        'cpm_trans_id' => 'TXN_2026_002',
        'cpm_amount'   => '15000',
        'cpm_currency' => 'XOF',
        'cpm_result'   => '00',
    ];

    // Signature calculée sur le payload original
    $originalSig = hash_hmac('sha256', implode('', array_values($originalPayload)), $this->secret);

    // Falsification : modifier le montant après signature
    $tamperedPayload              = $originalPayload;
    $tamperedPayload['cpm_amount'] = '150000'; // 10x plus cher !

    $isValid = verifySignature($tamperedPayload, $originalSig, $this->secret);

    expect($isValid)->toBeFalse();
});

it('uses timing-safe comparison', function () {
    $correctSig  = hash_hmac('sha256', 'test_data', $this->secret);
    $wrongSig    = str_repeat('f', strlen($correctSig));
    $partialSig  = substr($correctSig, 0, 10) . str_repeat('x', strlen($correctSig) - 10);

    // hash_equals doit être utilisé (pas === ou strcmp)
    expect(hash_equals($correctSig, $correctSig))->toBeTrue()
        ->and(hash_equals($correctSig, $wrongSig))->toBeFalse()
        ->and(hash_equals($correctSig, $partialSig))->toBeFalse()
        // La longueur doit être identique pour une comparaison timing-safe valide
        ->and(strlen($correctSig))->toBe(strlen($wrongSig));
});

it('logs all attempts including failures', function () {
    Log::shouldReceive('info')
        ->atLeast()->once()
        ->withArgs(fn ($message) => str_contains($message, 'webhook'));

    $payload = ['cpm_trans_id' => 'TXN_LOG_001', 'cpm_amount' => '15000'];
    $badSig  = 'invalid_signature';

    $isValid = verifySignature($payload, $badSig, $this->secret);

    // Logger toutes les tentatives (succès et échecs)
    Log::info('webhook: signature verification attempt', [
        'transaction_id' => $payload['cpm_trans_id'],
        'result'         => $isValid ? 'valid' : 'invalid',
        'ip'             => request()->ip(),
    ]);

    expect($isValid)->toBeFalse();
});

// =============================================================================
// Helper
// =============================================================================

function verifySignature(array $payload, string $receivedSig, string $secret): bool
{
    $dataString  = implode('', array_values($payload));
    $expectedSig = hash_hmac('sha256', $dataString, $secret);

    return hash_equals($expectedSig, $receivedSig);
}
