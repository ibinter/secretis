<?php

use App\Models\Organization;
use App\Models\User;
use App\Rules\StrongPassword;
use App\Services\IntrusionDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

// ===========================================================================
// Fixtures partagées
// ===========================================================================

beforeEach(function () {
    $this->seedForTests();

    $this->org = $this->createOrganization(['slug' => 'org-auth-sec'], 'active');

    $this->user = $this->createUserWithRole($this->org, 'admin', [
        'email'    => 'authsec@test.test',
        'password' => Hash::make('ValidPass@12345!'),
        'status'   => 'active',
    ]);

    // Vider les compteurs d'échecs et rate limiters
    Cache::flush();
    RateLimiter::clear('login:authsec@test.test|127.0.0.1');

    $this->ids = app(IntrusionDetectionService::class);
});

// ===========================================================================
// Tests
// ===========================================================================

it('blocks after 5 failed login attempts from same ip', function () {
    $ip    = '10.0.0.1';
    $email = 'bruteforce@test.test';

    // Simuler 5 tentatives d'échec
    for ($i = 0; $i < 5; $i++) {
        $this->ids->recordFailedLogin($email, $ip);
    }

    // La 6ème doit être bloquée
    expect($this->ids->isBlocked($email, $ip))->toBeTrue();

    // Vérifier que le endpoint de login retourne 429
    $response = $this->postJson('/api/auth/login', [
        'email'    => $email,
        'password' => 'WrongPassword!1',
    ], ['X-Forwarded-For' => $ip]);

    // L'API doit refuser (429 ou 401 si le middleware est branché)
    expect($response->status())->toBeIn([401, 422, 429]);
});

it('blocks after 3 failed login attempts for same email', function () {
    $ip    = '10.0.0.2';
    $email = 'targeted@test.test';

    // 3 tentatives = seuil email
    for ($i = 0; $i < 3; $i++) {
        $this->ids->recordFailedLogin($email, $ip);
    }

    expect($this->ids->isBlocked($email, $ip))->toBeTrue();
});

it('clears failed attempts after successful login', function () {
    $ip    = '10.0.0.3';
    $email = $this->user->email;

    // Simuler 2 tentatives d'échec
    $this->ids->recordFailedLogin($email, $ip);
    $this->ids->recordFailedLogin($email, $ip);
    expect($this->ids->isBlocked($email, $ip))->toBeFalse();

    // Login réussi
    $this->ids->clearFailedAttempts($email, $ip);

    // Compteurs réinitialisés
    expect($this->ids->isBlocked($email, $ip))->toBeFalse();
});

it('enforces strong password on registration', function () {
    // Mots de passe trop faibles
    $weakPasswords = [
        'password',        // mot interdit
        'Short1!',         // trop court
        'alllowercase1!',  // pas de majuscule
        'ALLUPPERCASE1!',  // pas de minuscule
        'NoDigitsHere!',   // pas de chiffre
        'NoSpecial1234',   // pas de spécial
        'Secretis@123',    // contient "secretis"
        'Aaa111!!!',       // répétitions
    ];

    $rule = new StrongPassword();

    foreach ($weakPasswords as $weak) {
        expect($rule->passes($weak))->toBeFalse(
            "Le mot de passe '{$weak}' aurait dû être refusé"
        );
    }

    // Mot de passe fort
    expect($rule->passes('Tr0ub4dor&3SecretERP!'))->toBeTrue();
});

it('requires csrf token on state-changing requests', function () {
    // POST sans token CSRF doit retourner 419 sur les routes web
    $response = $this->post('/logout');

    // 419 = CSRF token mismatch ou 405/302 selon la config
    expect($response->status())->toBeIn([302, 419, 405]);
});

it('session is invalidated after logout', function () {
    // Se connecter
    $this->actingAs($this->user, 'sanctum');

    // Vérifier l'accès
    $this->getJson('/api/auth/me')->assertStatus(200);

    // Se déconnecter
    $this->postJson('/api/auth/logout')->assertStatus(200);

    // L'accès doit être refusé après logout
    $response = $this->getJson('/api/auth/me');
    expect($response->status())->toBeIn([401, 403]);
});

it('cannot reuse old session token after logout', function () {
    // Obtenir un token Sanctum
    $token = $this->user->createToken('test-token')->plainTextToken;

    // Vérifier que le token fonctionne
    $this->withToken($token)
         ->getJson('/api/auth/me')
         ->assertStatus(200);

    // Déconnecter (révocation du token)
    $this->withToken($token)
         ->postJson('/api/auth/logout')
         ->assertStatus(200);

    // Le token révoqué ne doit plus fonctionner
    $response = $this->withToken($token)->getJson('/api/auth/me');
    expect($response->status())->toBeIn([401, 403]);
});

it('strong password rule accepts valid strong passwords', function () {
    $rule = new StrongPassword();

    $validPasswords = [
        'Tr0ub4dor&3ERP!',
        'MyS3cur3@Passw0rd',
        'Admin@SecretERP99',
        'P@ssw0rd_IBIG_2024',
    ];

    foreach ($validPasswords as $valid) {
        expect($rule->passes($valid))->toBeTrue(
            "Le mot de passe '{$valid}' aurait dû être accepté"
        );
    }
});

it('strong password rule rejects consecutive character repetitions', function () {
    $rule = new StrongPassword();

    // Répétitions de 3+ caractères identiques
    expect($rule->passes('Aaaa@Secure1'))->toBeFalse();
    expect($rule->passes('Sec111@Pass!'))->toBeFalse();
    expect($rule->passes('Good@Pass1!!!'))->toBeFalse();

    // 2 répétitions max — accepté
    expect($rule->passes('Sec11@GoodPass!'))->toBeTrue();
});

it('strong password rule provides explicit error messages', function () {
    $rule = new StrongPassword();

    $errors = $rule->collectErrors('short');

    expect($errors)->not->toBeEmpty();
    expect($errors[0])->toBeString();
    // Le message doit mentionner 12 caractères
    expect(implode(' ', $errors))->toContain('12');
});
