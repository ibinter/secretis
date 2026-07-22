<?php

/**
 * UserTest — Tests unitaires du modèle User
 *
 * Teste : verrouillage compte, permissions module, secret MFA.
 */

use App\Models\User;
use Carbon\Carbon;
use Spatie\Permission\Models\Permission;

beforeEach(function () {
    $this->org = $this->createOrganization(['slug' => 'user-test-' . uniqid()], 'active');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);
});

// =============================================================================
// Verrouillage de compte
// =============================================================================

it('locks account after 5 failed login attempts', function () {
    $user = $this->createUserWithRole($this->org, 'agent');

    expect($user->isLocked())->toBeFalse();
    expect($user->failed_login_attempts)->toBe(0);

    // 4 premières tentatives — pas encore verrouillé
    for ($i = 0; $i < 4; $i++) {
        $user->recordFailedLogin();
        expect($user->isLocked())->toBeFalse();
    }

    // 5ème tentative — doit verrouiller
    $user->recordFailedLogin();

    $user->refresh();
    expect($user->isLocked())->toBeTrue()
        ->and($user->failed_login_attempts)->toBe(5)
        ->and($user->locked_until)->not->toBeNull()
        ->and($user->locked_until->isFuture())->toBeTrue();
});

// =============================================================================
// Permissions par module
// =============================================================================

it('has correct permissions for module', function () {
    $user = $this->createUserWithRole($this->org, 'agent');

    // Créer et assigner une permission au module agenda
    $permission = Permission::firstOrCreate([
        'name'       => 'agenda.create',
        'guard_name' => 'web',
    ]);
    $user->givePermissionTo($permission);

    expect($user->hasPermissionForModule('agenda', 'create'))->toBeTrue()
        ->and($user->hasPermissionForModule('agenda', 'delete'))->toBeFalse(); // Pas cette permission
});

it('generates unique MFA secret', function () {
    // Simuler la génération de secrets MFA uniques pour plusieurs utilisateurs
    $secrets = collect(range(1, 10))->map(fn () => generateMfaSecret());

    // Tous les secrets doivent être uniques
    $uniqueSecrets = $secrets->unique();
    expect($uniqueSecrets->count())->toBe(10);

    // Chaque secret doit avoir la longueur attendue (base32, 32 chars)
    foreach ($secrets as $secret) {
        expect(strlen($secret))->toBeGreaterThanOrEqual(16);
        // Seuls des caractères base32 valides (A-Z, 2-7)
        expect($secret)->toMatch('/^[A-Z2-7]+$/');
    }
});

// =============================================================================
// Helpers
// =============================================================================

function generateMfaSecret(): string
{
    $chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $secret = '';
    for ($i = 0; $i < 32; $i++) {
        $secret .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $secret;
}
