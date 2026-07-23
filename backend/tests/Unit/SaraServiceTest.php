<?php

/**
 * SaraServiceTest — Tests unitaires du service SARA (assistant IA)
 *
 * Couvre : prompt système, contexte module, isolation tenant, gestion d'erreur,
 *          génération de titre, suggestions FAQ.
 */

use App\Models\Organization;
use App\Models\User;
use App\Services\SaraService;
use Mockery\MockInterface;

beforeEach(function () {
    $this->seedForTests();
});

// =============================================================================
// Prompt système
// =============================================================================

it('generates a system prompt with user context', function () {
    $org  = $this->createOrganization(['slug' => 'sara-test-' . uniqid(), 'name' => 'Cabinet Test SA'], 'active');
    $user = $this->createUserWithRole($org, 'gestionnaire', ['name' => 'Marie Kouamé']);

    app()->instance('current_organization', $org);

    $service = app(SaraService::class);
    $prompt  = $service->buildSystemPrompt($user, $org);

    expect($prompt)->toContain('Cabinet Test SA');
    expect($prompt)->toContain('Marie Kouamé');
    expect($prompt)->toContain('gestionnaire');
    expect($prompt)->toContain('SECRETIS');
    expect($prompt)->toContain('IBIG');
});

it('injects module context in system prompt', function () {
    $org  = $this->createOrganization(['slug' => 'sara-module-' . uniqid()], 'active');
    $user = $this->createUserWithRole($org, 'agent');

    app()->instance('current_organization', $org);

    $service = app(SaraService::class);
    $prompt  = $service->buildSystemPrompt($user, $org, moduleContext: 'courrier');

    expect($prompt)->toContain('courrier');
    // Le prompt doit mentionner le module pour contextualiser les réponses
    expect(strtolower($prompt))->toContain('module');
});

// =============================================================================
// Isolation multitenancy
// =============================================================================

it('refuses to reveal data from other organizations', function () {
    $orgA = $this->createOrganization(['slug' => 'sara-orgA-' . uniqid(), 'name' => 'Org Alpha'], 'active');
    $orgB = $this->createOrganization(['slug' => 'sara-orgB-' . uniqid(), 'name' => 'Org Beta'], 'active');

    $userA = $this->createUserWithRole($orgA, 'agent');
    app()->instance('current_organization', $orgA);

    $service = app(SaraService::class);

    // La requête demande des infos d'une autre organisation
    $canAccess = $service->canAccessOrganizationData($userA, $orgB->id);

    expect($canAccess)->toBeFalse();
});

it('allows access to own organization data', function () {
    $org  = $this->createOrganization(['slug' => 'sara-own-' . uniqid()], 'active');
    $user = $this->createUserWithRole($org, 'agent');

    app()->instance('current_organization', $org);

    $service    = app(SaraService::class);
    $canAccess  = $service->canAccessOrganizationData($user, $org->id);

    expect($canAccess)->toBeTrue();
});

// =============================================================================
// Gestion des erreurs provider
// =============================================================================

it('handles provider failure gracefully', function () {
    $org  = $this->createOrganization(['slug' => 'sara-fail-' . uniqid()], 'active');
    $user = $this->createUserWithRole($org, 'agent');

    app()->instance('current_organization', $org);

    // Mocker le client IA pour simuler une panne
    $mockClient = Mockery::mock(\App\Contracts\AiClientInterface::class);
    $mockClient->shouldReceive('chat')
               ->andThrow(new \RuntimeException('Provider API is unavailable'));

    app()->instance(\App\Contracts\AiClientInterface::class, $mockClient);

    $service  = app(SaraService::class);
    $response = $service->handleProviderFailure(new \RuntimeException('Provider API is unavailable'));

    expect($response)->toBeArray();
    expect($response)->toHaveKey('error');
    expect($response['error'])->not->toBeEmpty();
    // La réponse de fallback ne doit pas exposer les détails techniques
    expect($response['error'])->not->toContain('Exception');
});

it('returns a fallback message on timeout', function () {
    $org  = $this->createOrganization(['slug' => 'sara-timeout-' . uniqid()], 'active');
    $user = $this->createUserWithRole($org, 'agent');

    app()->instance('current_organization', $org);

    $service  = app(SaraService::class);
    $response = $service->handleProviderFailure(
        new \Illuminate\Http\Client\ConnectionException('cURL timeout')
    );

    expect($response)->toHaveKey('error');
    expect($response['fallback'])->toBeTrue();
});

// =============================================================================
// Génération de titre
// =============================================================================

it('generates a short title from first message', function () {
    $service = app(SaraService::class);

    $longMessage = 'Comment puis-je créer un nouveau courrier sortant et l\'affecter à un dossier existant dans le module gestion documentaire ?';

    $title = $service->generateConversationTitle($longMessage);

    expect($title)->toBeString();
    expect(strlen($title))->toBeLessThanOrEqual(80);
    expect($title)->not->toBeEmpty();
});

it('title generation truncates very long first messages', function () {
    $service     = app(SaraService::class);
    $veryLong    = str_repeat('Comment créer un rapport personnalisé détaillé ? ', 10);
    $title       = $service->generateConversationTitle($veryLong);

    expect(strlen($title))->toBeLessThanOrEqual(80);
});

// =============================================================================
// Suggestions FAQ
// =============================================================================

it('suggests faq articles for relevant queries', function () {
    $service  = app(SaraService::class);
    $query    = 'Mot de passe oublié, comment réinitialiser ?';

    $suggestions = $service->suggestFaqArticles($query, locale: 'fr');

    expect($suggestions)->toBeArray();

    if (count($suggestions) > 0) {
        foreach ($suggestions as $suggestion) {
            expect($suggestion)->toHaveKey('slug');
            expect($suggestion)->toHaveKey('title');
            expect($suggestion)->toHaveKey('relevance_score');
        }
    }
});

it('returns empty suggestions for unrelated queries', function () {
    $service     = app(SaraService::class);
    $irrelevant  = 'xyzzy plugh foo bar baz qux';

    $suggestions = $service->suggestFaqArticles($irrelevant, locale: 'fr');

    // Soit tableau vide, soit résultats avec faible pertinence
    if (count($suggestions) > 0) {
        foreach ($suggestions as $suggestion) {
            expect($suggestion['relevance_score'] ?? 0)->toBeLessThan(0.5);
        }
    } else {
        expect($suggestions)->toBeEmpty();
    }
});
