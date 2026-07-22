<?php

/**
 * AuditServiceTest — Tests unitaires du journal d'audit
 *
 * Teste : masquage champs sensibles, silence sur erreur, actions, IP/UA.
 */

use App\Models\AuditLog;
use App\Services\AuditService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

beforeEach(function () {
    $this->service = new AuditService();

    $this->org  = $this->createOrganization(['slug' => 'audit-test-' . uniqid()], 'active');
    $this->user = $this->createUserWithRole($this->org, 'admin_org');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    // Authentifier l'utilisateur
    $this->actingAs($this->user);
});

// =============================================================================
// Masquage des champs sensibles
// =============================================================================

it('logs sensitive field changes as REDACTED', function () {
    $this->service->log(
        action:       'updated',
        module:       'users',
        resourceType: 'user',
        resourceId:   $this->user->id,
        oldValues:    ['password' => 'ancien_mdp', 'email' => 'old@test.ci'],
        newValues:    ['password' => 'nouveau_mdp', 'token' => 'abc123', 'email' => 'new@test.ci'],
    );

    $log = AuditLog::where('resource_type', 'user')
        ->where('resource_id', $this->user->id)
        ->latest()
        ->first();

    expect($log)->not->toBeNull();

    // Le mot de passe et le token ne doivent jamais être stockés en clair
    expect($log->old_values['password'] ?? null)->toBe('[REDACTED]');
    expect($log->new_values['password'] ?? null)->toBe('[REDACTED]');
    expect($log->new_values['token'] ?? null)->toBe('[REDACTED]');

    // Les champs non-sensibles doivent être intacts
    expect($log->new_values['email'] ?? null)->toBe('new@test.ci');
});

it('never throws exceptions (silent errors)', function () {
    // Corrompre la connexion DB pour simuler une erreur
    // L'AuditService ne doit JAMAIS propager l'exception
    Log::shouldReceive('channel->error')->once()->withAnyArgs();

    // Forcer une erreur en passant un resource_id invalide qui cause une erreur DB
    // (ex: simulé via mock de AuditLog::create)
    $mockedLog = Mockery::mock('overload:' . AuditLog::class);
    $mockedLog->shouldReceive('create')->andThrow(new \RuntimeException('DB connection failed'));

    // L'appel ne doit pas lever d'exception
    expect(fn () => $this->service->log(
        action:       'created',
        module:       'test',
        resourceType: 'test_resource',
        resourceId:   null,
    ))->not->toThrow(\Throwable::class);
});

it('records correct action types', function () {
    $actions = ['created', 'updated', 'deleted', 'access_denied', 'login_success', 'login_failed'];

    foreach ($actions as $action) {
        $this->service->log(
            action:       $action,
            module:       'test',
            resourceType: 'resource',
            resourceId:   '123',
        );
    }

    foreach ($actions as $action) {
        $exists = AuditLog::where('action', $action)
            ->where('resource_type', 'resource')
            ->exists();
        expect($exists)->toBeTrue("Action '$action' non enregistrée");
    }
});

it('stores IP address and user agent', function () {
    // Simuler une requête avec IP et User-Agent connus
    $this->withServerVariables([
        'REMOTE_ADDR'     => '196.168.1.42',
        'HTTP_USER_AGENT' => 'Mozilla/5.0 (Test Browser)',
    ]);

    $this->service->log(
        action:       'created',
        module:       'agenda',
        resourceType: 'event',
        resourceId:   'evt_001',
    );

    $log = AuditLog::where('resource_type', 'event')
        ->where('resource_id', 'evt_001')
        ->latest()
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->ip_address)->not->toBeEmpty()
        ->and($log->user_agent)->not->toBeEmpty();
});
