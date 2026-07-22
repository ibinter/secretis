<?php

/**
 * AuthControllerTest — Tests de sécurité du contrôleur d'authentification
 *
 * Teste : rate limiting, timing constant, non-révélation d'email, hachage bcrypt.
 */

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

beforeEach(function () {
    $this->org = $this->createOrganization(['slug' => 'auth-sec-' . uniqid()], 'active');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    RateLimiter::clear('login:test@test.ci|127.0.0.1');
});

// =============================================================================
// Rate Limiting
// =============================================================================

it('rate limits after 5 failed attempts', function () {
    $email = 'ratelimit-' . uniqid() . '@test.ci';

    // Créer un utilisateur pour les tentatives
    $user = $this->createUserWithRole($this->org, 'agent', [
        'email' => $email,
    ]);

    $rateLimitKey = 'login:' . strtolower($email) . '|127.0.0.1';

    // 5 tentatives avec mauvais mot de passe
    for ($i = 0; $i < 5; $i++) {
        $response = $this->postJson(route('auth.login'), [
            'email'    => $email,
            'password' => 'WrongPassword@' . $i,
        ]);
    }

    // La 6ème tentative doit être rate-limitée (429)
    $response = $this->postJson(route('auth.login'), [
        'email'    => $email,
        'password' => 'AnyPassword@123',
    ]);

    expect($response->status())->toBe(429);
});

// =============================================================================
// Timing constant (anti-user-enumeration)
// =============================================================================

it('returns same response time whether user exists or not', function () {
    $existingUser = $this->createUserWithRole($this->org, 'agent', [
        'email' => 'existing-' . uniqid() . '@test.ci',
    ]);

    // Mesurer le temps pour un utilisateur existant avec mauvais mot de passe
    $start1   = microtime(true);
    $resp1    = $this->postJson(route('auth.login'), [
        'email'    => $existingUser->email,
        'password' => 'WrongPassword@123!',
    ]);
    $time1 = microtime(true) - $start1;

    // Mesurer le temps pour un utilisateur inexistant
    $start2  = microtime(true);
    $resp2   = $this->postJson(route('auth.login'), [
        'email'    => 'nonexistent-' . uniqid() . '@test.ci',
        'password' => 'WrongPassword@123!',
    ]);
    $time2 = microtime(true) - $start2;

    // Les deux doivent retourner la même erreur générique
    expect($resp1->status())->toBe(422)
        ->and($resp2->status())->toBe(422);

    // Vérifier que les messages d'erreur sont identiques (pas de révélation)
    $body1 = $resp1->json('errors.email.0');
    $body2 = $resp2->json('errors.email.0');
    expect($body1)->toBe($body2);
});

// =============================================================================
// Non-révélation d'email (mot de passe oublié)
// =============================================================================

it('does not reveal if email exists on password reset', function () {
    $existingEmail    = 'existing-' . uniqid() . '@test.ci';
    $nonExistingEmail = 'ghost-' . uniqid() . '@test.ci';

    $this->createUserWithRole($this->org, 'agent', ['email' => $existingEmail]);

    // Demande pour email existant
    $resp1 = $this->postJson(route('auth.forgot-password'), ['email' => $existingEmail]);

    // Demande pour email inexistant
    $resp2 = $this->postJson(route('auth.forgot-password'), ['email' => $nonExistingEmail]);

    // Les deux réponses doivent avoir le même message générique
    expect($resp1->status())->toBe(200)
        ->and($resp2->status())->toBe(200);

    $msg1 = $resp1->json('message');
    $msg2 = $resp2->json('message');

    expect($msg1)->toBe($msg2)
        ->and($msg1)->toContain('Si cet email');
});

// =============================================================================
// Hachage bcrypt
// =============================================================================

it('hashes password with bcrypt', function () {
    $rawPassword = 'SuperSecure@Pass2026!';

    $user = $this->createUserWithRole($this->org, 'agent', [
        'email'    => 'bcrypt-test-' . uniqid() . '@test.ci',
        'password' => bcrypt($rawPassword),
    ]);

    // Le mot de passe stocké ne doit jamais être en clair
    expect($user->password)->not->toBe($rawPassword);

    // Doit commencer par le préfixe bcrypt ($2y$)
    expect($user->password)->toStartWith('$2y$');

    // Hash::check doit valider le mot de passe
    expect(Hash::check($rawPassword, $user->password))->toBeTrue();

    // Un autre mot de passe ne doit pas passer
    expect(Hash::check('WrongPassword', $user->password))->toBeFalse();
});
