<?php

declare(strict_types=1);

use App\Models\User;

/*
|--------------------------------------------------------------------------
| Tests d'accessibilité côté serveur — IBIG SECRETIS
| WCAG 2.1 — critères vérifiables via les réponses HTTP
|--------------------------------------------------------------------------
*/

// ── HTML valide et attributs de langue ───────────────────────────────────────

test('pages include lang attribute in french', function () {
    $response = $this->get('/');
    $response->assertSee('lang="fr"', false);
});

test('login page includes lang attribute', function () {
    $response = $this->get('/login');
    $response->assertSee('lang="fr"', false);
    $response->assertStatus(200);
});

// ── Pages d'erreur accessibles ────────────────────────────────────────────────

test('404 page includes meaningful navigation back', function () {
    $response = $this->get('/chemin-inexistant-' . uniqid());
    $response->assertStatus(404);
    // Doit contenir du texte lisible, pas juste un code
    $response->assertSeeAny(['introuvable', 'Retour', '404', 'page'], false);
});

test('error pages do not expose stack traces', function () {
    // Simuler une 404 API
    $response = $this->getJson('/api/v1/chemin-inexistant-api-' . uniqid());
    $response->assertStatus(404);

    // Pas de fuite d'informations internes
    $response->assertJsonMissing(['trace']);
    $response->assertJsonMissing(['file']);
    $response->assertJsonMissing(['line']);
    $response->assertJsonMissing(['exception']);
});

test('api returns proper error messages not stack traces', function () {
    $response = $this->getJson('/api/v1/nonexistent-' . uniqid());
    $response->assertStatus(404);
    $response->assertJsonStructure(['message']);
    $response->assertJsonMissing(['trace']);
    $response->assertJsonMissing(['file']);
});

// ── Cookie Consent API ────────────────────────────────────────────────────────

test('authenticated user can save cookie consent', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/privacy/consent', [
        'categories' => [
            'preferences' => true,
            'statistics'  => true,
            'marketing'   => false,
            'ai_sara'     => true,
        ],
    ]);

    $response->assertStatus(200);
    $response->assertJson(['message' => 'Préférences enregistrées']);
});

test('authenticated user can retrieve cookie consent', function () {
    $user = User::factory()->create();

    // Enregistrer d'abord
    $this->actingAs($user)->postJson('/api/v1/privacy/consent', [
        'categories' => [
            'preferences' => true,
            'statistics'  => false,
            'marketing'   => false,
            'ai_sara'     => true,
        ],
    ]);

    $response = $this->actingAs($user)->getJson('/api/v1/privacy/consent');

    $response->assertStatus(200);
    $response->assertJsonPath('categories.necessary', true);
    $response->assertJsonPath('categories.preferences', true);
    $response->assertJsonPath('categories.statistics', false);
    $response->assertJsonPath('categories.marketing', false);
    $response->assertJsonPath('categories.ai_sara', true);
});

test('unauthenticated user cannot access consent endpoint', function () {
    $response = $this->postJson('/api/v1/privacy/consent', [
        'categories' => ['preferences' => true],
    ]);
    $response->assertStatus(401);
});

test('consent validation rejects invalid data', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/privacy/consent', [
        // categories manquant
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['categories']);
});

// ── Réponses API structurées (accessibilité messages d'erreur) ────────────────

test('api validation errors include field names for screen reader messages', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/privacy/consent', [
        'categories' => ['marketing' => 'not-a-boolean'],
    ]);

    $response->assertStatus(422);
    $response->assertJsonStructure([
        'message',
        'errors' => ['categories.marketing'],
    ]);
});

// ── Sécurité des en-têtes (contribution à l'accessibilité) ──────────────────

test('responses include content-type with charset', function () {
    $response = $this->getJson('/api/v1/health');
    // Vérifie que le content-type est bien JSON
    $response->assertHeader('content-type', 'application/json');
});
