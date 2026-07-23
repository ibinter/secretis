<?php

/**
 * HelpCenterTest — Tests Feature du centre d'aide public
 *
 * Couvre : catégories, articles, recherche, feedback, accès public.
 */

use App\Models\HelpArticle;
use App\Models\HelpCategory;
use App\Models\User;

beforeEach(function () {
    $this->seedForTests();
});

// =============================================================================
// Catégories
// =============================================================================

it('returns list of help categories', function () {
    // Créer des catégories de test
    HelpCategory::factory()->count(3)->create(['is_active' => true]);

    $response = $this->getJson('/api/help/categories');

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => [
                     '*' => ['id', 'slug', 'icon', 'name', 'articles_count'],
                 ],
             ]);

    expect($response->json('data'))->not->toBeEmpty();
});

// =============================================================================
// Articles par catégorie
// =============================================================================

it('returns articles for a category', function () {
    $category = HelpCategory::factory()->create(['is_active' => true]);
    HelpArticle::factory()->count(4)->published()->create(['help_category_id' => $category->id]);

    $response = $this->getJson("/api/help/categories/{$category->slug}/articles");

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => [
                     '*' => ['id', 'slug', 'title', 'excerpt', 'view_count'],
                 ],
             ]);

    expect(count($response->json('data')))->toBe(4);
});

it('does not return draft articles for a category', function () {
    $category = HelpCategory::factory()->create(['is_active' => true]);
    HelpArticle::factory()->create(['help_category_id' => $category->id, 'status' => 'draft']);
    HelpArticle::factory()->published()->create(['help_category_id' => $category->id]);

    $response = $this->getJson("/api/help/categories/{$category->slug}/articles");

    $response->assertStatus(200);
    expect(count($response->json('data')))->toBe(1);
});

// =============================================================================
// Article unique + vue
// =============================================================================

it('returns a single article and increments view count', function () {
    $category = HelpCategory::factory()->create(['is_active' => true]);
    $article  = HelpArticle::factory()->published()->create([
        'help_category_id' => $category->id,
        'view_count'       => 10,
    ]);

    $response = $this->getJson("/api/help/articles/{$article->slug}");

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => ['id', 'slug', 'title', 'content', 'view_count', 'helpful_count'],
             ]);

    $article->refresh();
    expect($article->view_count)->toBe(11);
});

it('returns 404 for unknown article slug', function () {
    $this->getJson('/api/help/articles/article-inexistant-xyz')
         ->assertStatus(404);
});

// =============================================================================
// Recherche
// =============================================================================

it('search returns relevant results', function () {
    $category = HelpCategory::factory()->create(['is_active' => true]);
    HelpArticle::factory()->published()->create([
        'help_category_id' => $category->id,
        'translations'     => [
            'fr' => [
                'title'   => 'Comment configurer les notifications',
                'content' => 'Pour configurer vos notifications, rendez-vous dans les paramètres.',
                'excerpt' => 'Guide de configuration des notifications',
            ],
        ],
    ]);
    HelpArticle::factory()->published()->create([
        'help_category_id' => $category->id,
        'translations'     => [
            'fr' => [
                'title'   => 'Gestion des utilisateurs',
                'content' => 'Vous pouvez inviter de nouveaux utilisateurs depuis le panneau admin.',
                'excerpt' => 'Inviter et gérer les utilisateurs',
            ],
        ],
    ]);

    $response = $this->getJson('/api/help/search?q=notifications');

    $response->assertStatus(200)
             ->assertJsonStructure(['data' => [['id', 'slug', 'title', 'excerpt']]]);

    $titles = collect($response->json('data'))->pluck('title');
    expect($titles->contains(fn ($t) => str_contains(strtolower($t), 'notification')))->toBeTrue();
});

it('search returns empty array for no match', function () {
    $response = $this->getJson('/api/help/search?q=termeabsolumentintrouvablexyzabc');

    $response->assertStatus(200);
    expect($response->json('data'))->toBeEmpty();
});

it('search requires minimum query length', function () {
    $this->getJson('/api/help/search?q=a')
         ->assertStatus(422);
});

// =============================================================================
// Feedback (helpful / not helpful)
// =============================================================================

it('feedback endpoint marks article as helpful', function () {
    $category = HelpCategory::factory()->create(['is_active' => true]);
    $article  = HelpArticle::factory()->published()->create([
        'help_category_id' => $category->id,
        'helpful_count'    => 5,
    ]);

    $response = $this->postJson("/api/help/articles/{$article->slug}/feedback", [
        'helpful' => true,
    ]);

    $response->assertStatus(200)
             ->assertJson(['success' => true]);

    $article->refresh();
    expect($article->helpful_count)->toBe(6);
});

it('feedback endpoint marks article as not helpful', function () {
    $category = HelpCategory::factory()->create(['is_active' => true]);
    $article  = HelpArticle::factory()->published()->create([
        'help_category_id' => $category->id,
        'not_helpful_count' => 2,
    ]);

    $response = $this->postJson("/api/help/articles/{$article->slug}/feedback", [
        'helpful' => false,
    ]);

    $response->assertStatus(200)
             ->assertJson(['success' => true]);

    $article->refresh();
    expect($article->not_helpful_count)->toBe(3);
});

// =============================================================================
// Accès public (non authentifié)
// =============================================================================

it('unauthenticated user can access public help center', function () {
    $category = HelpCategory::factory()->create(['is_active' => true]);
    HelpArticle::factory()->published()->count(2)->create(['help_category_id' => $category->id]);

    // Aucun actingAs — accès public attendu
    $this->getJson('/api/help/categories')->assertStatus(200);
    $this->getJson("/api/help/categories/{$category->slug}/articles")->assertStatus(200);
});
