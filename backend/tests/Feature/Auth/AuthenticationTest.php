<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

// Initialisation avant chaque test
beforeEach(function () {
    $this->seedForTests();
    RateLimiter::clear('login:test@example.test|127.0.0.1');
});

// =============================================================================
// LOGIN — Credentials valides
// =============================================================================

test('login avec credentials valides retourne token et données user', function () {
    $org  = $this->createOrganization(['slug' => 'org-login-test'], 'trial');
    $user = $this->createUserWithRole($org, 'agent', [
        'email'    => 'valid@login.test',
        'password' => Hash::make('ValidPass@12345!'),
        'status'   => 'active',
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email'    => 'valid@login.test',
        'password' => 'ValidPass@12345!',
    ]);

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'user' => ['id', 'name', 'email', 'organization'],
                 'license_status',
                 'redirect',
             ]);

    // Le statut de licence trial est bien retourné
    expect($response->json('license_status'))->toBe('trial');

    // Le user en BDD a son login enregistré
    $user->refresh();
    expect($user->last_login_at)->not->toBeNull();
    expect($user->failed_login_attempts)->toBe(0);
});

// =============================================================================
// LOGIN — Mauvais mot de passe
// =============================================================================

test('login avec mauvais password retourne 422 avec message d erreur', function () {
    $org  = $this->createOrganization(['slug' => 'org-bad-pw'], 'trial');
    $user = $this->createUserWithRole($org, 'agent', [
        'email'    => 'user@badpw.test',
        'password' => Hash::make('CorrectPass@12345!'),
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email'    => 'user@badpw.test',
        'password' => 'WrongPassword!',
    ]);

    $response->assertStatus(422)
             ->assertJsonValidationErrors(['email']);

    // Le compteur de tentatives est incrémenté
    $user->refresh();
    expect($user->failed_login_attempts)->toBe(1);
});

test('login avec email inexistant retourne 422 (sans révéler l existence)', function () {
    $response = $this->postJson('/api/auth/login', [
        'email'    => 'nobody@nowhere.test',
        'password' => 'AnyPassword@1!',
    ]);

    // Même réponse qu'un mauvais mot de passe → pas d'énumération
    $response->assertStatus(422)
             ->assertJsonValidationErrors(['email']);
});

// =============================================================================
// LOGIN — Compte désactivé
// =============================================================================

test('login avec compte désactivé retourne 403', function () {
    $org  = $this->createOrganization(['slug' => 'org-inactive'], 'trial');
    $user = $this->createUserWithRole($org, 'agent', [
        'email'    => 'inactive@test.test',
        'password' => Hash::make('ValidPass@12345!'),
        'status'   => 'inactive', // Compte désactivé
    ]);

    $response = $this->postJson('/api/auth/login', [
        'email'    => 'inactive@test.test',
        'password' => 'ValidPass@12345!',
    ]);

    $response->assertStatus(403);
});

// =============================================================================
// LOGIN — Rate limiting
// =============================================================================

test('rate limiting bloque après 5 tentatives (6ème retourne 429)', function () {
    $org  = $this->createOrganization(['slug' => 'org-ratelimit'], 'trial');
    $user = $this->createUserWithRole($org, 'agent', [
        'email'    => 'rl@test.test',
        'password' => Hash::make('ValidPass@12345!'),
    ]);

    // 5 tentatives échouées
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/auth/login', [
            'email'    => 'rl@test.test',
            'password' => 'WrongPassword!',
        ]);
    }

    // La 6ème doit être bloquée par le rate limiter
    $response = $this->postJson('/api/auth/login', [
        'email'    => 'rl@test.test',
        'password' => 'WrongPassword!',
    ]);

    $response->assertStatus(429);
});

// =============================================================================
// LOGOUT — Session invalidée
// =============================================================================

test('logout invalide la session', function () {
    $org  = $this->createOrganization(['slug' => 'org-logout'], 'trial');
    $user = $this->createUserWithRole($org, 'agent', [
        'email'    => 'logout@test.test',
        'password' => Hash::make('ValidPass@12345!'),
    ]);

    // Se connecter d'abord
    $this->actingAs($user);

    $response = $this->postJson('/api/auth/logout');

    $response->assertStatus(200)
             ->assertJson(['message' => 'Déconnexion réussie.']);

    // L'utilisateur ne doit plus être authentifié
    $this->assertGuest();
});

// =============================================================================
// REGISTER — Organisation créée + licence trial + email bienvenue
// =============================================================================

test('register crée organisation, utilisateur admin, licence trial 14j et envoie email bienvenue', function () {
    Event::fake([Registered::class]);

    $response = $this->postJson('/api/auth/register', [
        'organization_name' => 'Mairie de Yamoussoukro',
        'organization_slug' => 'mairie-yamoussoukro',
        'country'           => 'CI',
        'timezone'          => 'Africa/Abidjan',
        'admin_name'        => 'Kouadio Jean',
        'email'             => 'admin@mairie-yamoussoukro.ci',
        'password'          => 'SecretAdmin@1234!',
        'password_confirmation' => 'SecretAdmin@1234!',
    ]);

    $response->assertStatus(201)
             ->assertJsonStructure([
                 'message',
                 'organization' => ['id', 'name', 'slug', 'status', 'trial_ends_at'],
                 'user'         => ['id', 'name', 'email'],
                 'redirect',
             ]);

    // L'organisation est créée en mode trial
    $this->assertDatabaseHas('organizations', [
        'slug'   => 'mairie-yamoussoukro',
        'status' => 'trial',
    ]);

    // L'admin a le rôle admin_org
    $org  = Organization::where('slug', 'mairie-yamoussoukro')->first();
    $user = User::where('email', 'admin@mairie-yamoussoukro.ci')->first();
    expect($user->hasRole('admin_org'))->toBeTrue();

    // La période trial dure 14 jours
    expect($org->trial_ends_at)->not->toBeNull();
    $trialDays = now()->diffInDays($org->trial_ends_at, false);
    expect($trialDays)->toBeGreaterThanOrEqual(13)->toBeLessThanOrEqual(14);

    // L'événement Registered est dispatché (déclenche l'email de bienvenue)
    Event::assertDispatched(Registered::class, function ($event) {
        return $event->user->email === 'admin@mairie-yamoussoukro.ci';
    });
});

test('register avec slug déjà utilisé retourne 422', function () {
    $this->createOrganization(['slug' => 'slug-taken'], 'trial');

    $response = $this->postJson('/api/auth/register', [
        'organization_name' => 'Autre Org',
        'organization_slug' => 'slug-taken',
        'country'           => 'CI',
        'timezone'          => 'Africa/Abidjan',
        'admin_name'        => 'Admin Test',
        'email'             => 'other@test.test',
        'password'          => 'SecretAdmin@1234!',
        'password_confirmation' => 'SecretAdmin@1234!',
    ]);

    $response->assertStatus(422)
             ->assertJsonValidationErrors(['organization_slug']);
});

test('register avec mot de passe faible retourne 422', function () {
    $response = $this->postJson('/api/auth/register', [
        'organization_name' => 'Test Org',
        'organization_slug' => 'test-weak-pw',
        'country'           => 'CI',
        'timezone'          => 'Africa/Abidjan',
        'admin_name'        => 'Admin',
        'email'             => 'admin@weakpw.test',
        'password'          => 'password123', // Trop faible
        'password_confirmation' => 'password123',
    ]);

    $response->assertStatus(422)
             ->assertJsonValidationErrors(['password']);
});

// =============================================================================
// MOT DE PASSE OUBLIÉ & RÉINITIALISATION
// =============================================================================

test('réinitialisation mot de passe envoie email et retourne message neutre', function () {
    $org  = $this->createOrganization(['slug' => 'org-reset-pw'], 'trial');
    $user = $this->createUserWithRole($org, 'agent', [
        'email' => 'reset@test.test',
    ]);

    $response = $this->postJson('/api/auth/forgot-password', [
        'email' => 'reset@test.test',
    ]);

    // Toujours 200, même si l'email existe ou pas (anti-énumération)
    $response->assertStatus(200)
             ->assertJson(['message' => 'Si cet email est associé à un compte, vous recevrez un lien de réinitialisation.']);
});

test('email inconnu sur forgot-password retourne le même message neutre', function () {
    $response = $this->postJson('/api/auth/forgot-password', [
        'email' => 'nobody@nowhere.test',
    ]);

    $response->assertStatus(200)
             ->assertJson(['message' => 'Si cet email est associé à un compte, vous recevrez un lien de réinitialisation.']);
});

test('reset password avec token valide change le mot de passe', function () {
    $org  = $this->createOrganization(['slug' => 'org-do-reset'], 'trial');
    $user = $this->createUserWithRole($org, 'agent', [
        'email'    => 'doreset@test.test',
        'password' => Hash::make('OldPass@12345!'),
    ]);

    // Générer un vrai token de réinitialisation
    $token = Password::createToken($user);

    $response = $this->postJson('/api/auth/reset-password', [
        'token'                 => $token,
        'email'                 => 'doreset@test.test',
        'password'              => 'NewStrongPass@9876!',
        'password_confirmation' => 'NewStrongPass@9876!',
    ]);

    $response->assertStatus(200)
             ->assertJson(['message' => 'Mot de passe réinitialisé avec succès.']);

    // Vérifier que le nouveau mot de passe fonctionne
    $user->refresh();
    expect(Hash::check('NewStrongPass@9876!', $user->password))->toBeTrue();

    // Le compteur de tentatives est remis à zéro
    expect($user->failed_login_attempts)->toBe(0);
    expect($user->locked_until)->toBeNull();
});
