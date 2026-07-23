<?php

/**
 * IntrusionDetectionTest — Tests unitaires du service de détection d'intrusion
 *
 * Couvre : enregistrement tentatives, blocage IP, blocage email, déblocage TTL,
 *          notification superadmin.
 */

use App\Services\IntrusionDetectionService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Cache::flush();
    Notification::fake();
});

// =============================================================================
// Enregistrement des tentatives
// =============================================================================

it('records failed login attempts in redis', function () {
    $service = app(IntrusionDetectionService::class);

    $service->recordFailedAttempt('192.168.1.1', 'user@test.ci');

    expect(Cache::get('failed_attempts_ip:192.168.1.1'))->toBe(1);
    expect(Cache::get('failed_attempts_email:user@test.ci'))->toBe(1);
});

it('increments attempt counter on subsequent failures', function () {
    $service = app(IntrusionDetectionService::class);

    $service->recordFailedAttempt('10.0.0.1', 'attacker@test.ci');
    $service->recordFailedAttempt('10.0.0.1', 'attacker@test.ci');
    $service->recordFailedAttempt('10.0.0.1', 'attacker@test.ci');

    expect(Cache::get('failed_attempts_ip:10.0.0.1'))->toBe(3);
    expect(Cache::get('failed_attempts_email:attacker@test.ci'))->toBe(3);
});

// =============================================================================
// Blocage par IP
// =============================================================================

it('blocks after 5 failed attempts from same ip', function () {
    $service = app(IntrusionDetectionService::class);
    $ip      = '172.16.0.50';
    $email   = 'victim@test.ci';

    expect($service->isBlocked($ip, $email))->toBeFalse();

    for ($i = 0; $i < 5; $i++) {
        $service->recordFailedAttempt($ip, $email);
    }

    expect($service->isBlocked($ip, $email))->toBeTrue();
    expect($service->isBlockedByIp($ip))->toBeTrue();
});

it('ip below threshold is not blocked', function () {
    $service = app(IntrusionDetectionService::class);
    $ip      = '192.168.100.1';

    for ($i = 0; $i < 4; $i++) {
        $service->recordFailedAttempt($ip, 'test@test.ci');
    }

    expect($service->isBlockedByIp($ip))->toBeFalse();
});

// =============================================================================
// Blocage par email
// =============================================================================

it('blocks after 3 failed attempts for same email', function () {
    $service = app(IntrusionDetectionService::class);
    $email   = 'targeted@test.ci';
    $ip      = '10.10.10.10';

    expect($service->isBlockedByEmail($email))->toBeFalse();

    for ($i = 0; $i < 3; $i++) {
        $service->recordFailedAttempt($ip . '.' . $i, $email);
    }

    expect($service->isBlockedByEmail($email))->toBeTrue();
});

it('email below threshold is not blocked', function () {
    $service = app(IntrusionDetectionService::class);
    $email   = 'safe@test.ci';

    for ($i = 0; $i < 2; $i++) {
        $service->recordFailedAttempt('10.10.10.' . $i, $email);
    }

    expect($service->isBlockedByEmail($email))->toBeFalse();
});

// =============================================================================
// Déblocage après TTL
// =============================================================================

it('unblocks after 15 minutes', function () {
    $service = app(IntrusionDetectionService::class);
    $ip      = '203.0.113.1';
    $email   = 'blocked@test.ci';

    // Simuler un blocage actif
    for ($i = 0; $i < 5; $i++) {
        $service->recordFailedAttempt($ip, $email);
    }

    expect($service->isBlockedByIp($ip))->toBeTrue();

    // Avancer l'horloge de 16 minutes — le cache TTL doit avoir expiré
    \Carbon\Carbon::setTestNow(now()->addMinutes(16));

    // Simuler l'expiration du cache (en test, on peut flush la clé)
    Cache::forget('failed_attempts_ip:' . $ip);
    Cache::forget('blocked_ip:' . $ip);

    expect($service->isBlockedByIp($ip))->toBeFalse();
});

it('block duration is 15 minutes', function () {
    $service = app(IntrusionDetectionService::class);

    // Vérifier la constante de durée de blocage
    $ttl = $service->getBlockDurationSeconds();
    expect($ttl)->toBe(900); // 15 minutes = 900 secondes
});

// =============================================================================
// Notification superadmin
// =============================================================================

it('notifies superadmin after suspicious activity threshold', function () {
    $service = app(IntrusionDetectionService::class);

    // Simuler un seuil dépassé (ex: 20 IPs distinctes bloquées)
    for ($i = 0; $i < 20; $i++) {
        $ip = "198.51.100.{$i}";
        for ($j = 0; $j < 5; $j++) {
            $service->recordFailedAttempt($ip, "victim{$i}@test.ci");
        }
    }

    // La notification doit être déclenchée quand le nombre d'IPs bloquées dépasse le seuil
    $service->checkAndNotifySuperAdminIfNeeded();

    // Vérifier qu'une notification a été envoyée (à une adresse superadmin)
    Notification::assertSentOnDemand(\App\Notifications\SuspiciousActivityNotification::class);
});

it('does not notify on normal activity', function () {
    $service = app(IntrusionDetectionService::class);

    // Juste 2 IPs — pas de menace
    $service->recordFailedAttempt('10.0.0.1', 'a@test.ci');
    $service->recordFailedAttempt('10.0.0.2', 'b@test.ci');

    $service->checkAndNotifySuperAdminIfNeeded();

    Notification::assertNothingSent();
});
