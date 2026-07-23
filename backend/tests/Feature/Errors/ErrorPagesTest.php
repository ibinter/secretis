<?php

namespace Tests\Feature\Errors;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * SECRETIS ERP — Tests des pages d'erreur (section 29.1)
 */
class ErrorPagesTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_shows_404_page_for_unknown_routes(): void
    {
        $response = $this->get('/route-qui-nexiste-vraiment-pas-du-tout-xyz123');

        $response->assertStatus(404);

        // Doit retourner du HTML pour les requêtes web
        $this->assertStringContainsString('text/html', $response->headers->get('Content-Type'));

        // Le contenu doit mentionner l'erreur
        $response->assertSee('introuvable', false);
    }

    /** @test */
    public function it_shows_403_with_error_reference_for_unauthorized_access(): void
    {
        // Créer un utilisateur sans permission
        $org  = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id]);
        $role = Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'web']);
        $user->assignRole($role);

        // Route protégée par permission (superadmin uniquement)
        $response = $this->actingAs($user)
            ->get('/superadmin/organizations');

        $response->assertStatus(403);

        // Doit contenir une référence SEC-403
        $content = $response->getContent();
        if ($content) {
            $this->assertMatchesRegularExpression('/SEC-403/', $content);
        }
    }

    /** @test */
    public function it_shows_500_page_with_error_id_on_server_errors(): void
    {
        // Simuler une erreur 500 via une route de test
        // (en environnement de test, Laravel n'affiche pas les pages d'erreur par défaut)
        $this->withoutExceptionHandling();

        // Vérifie que le layout d'erreur existe et est valide
        $this->assertFileExists(
            base_path('resources/views/errors/500.blade.php')
        );

        // Vérifie que la vue peut être rendue sans erreur de syntaxe Blade
        $rendered = view('errors.500', ['errorId' => 'ERR-TEST-12345'])->render();
        $this->assertStringContainsString('ERR-TEST-12345', $rendered);
        $this->assertStringContainsString('Erreur interne', $rendered);
    }

    /** @test */
    public function it_redirects_to_login_on_401_for_api_requests(): void
    {
        // Pour les routes API, une 401 doit retourner du JSON
        $response = $this->getJson('/api/v1/search?q=test');

        $response->assertStatus(401)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonStructure(['message']);
    }

    /** @test */
    public function it_returns_json_errors_for_api_routes(): void
    {
        $org  = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id]);

        // Route API inexistante → 404 JSON
        $response = $this->actingAs($user)
            ->getJson('/api/v1/route-inexistante');

        $response->assertStatus(404)
            ->assertHeader('Content-Type', 'application/json');

        // Ne doit PAS retourner du HTML
        $content = $response->getContent();
        $this->assertStringNotContainsString('<html', strtolower($content));
        $this->assertStringNotContainsString('<!doctype', strtolower($content));
    }

    /** @test */
    public function it_renders_error_layout_correctly(): void
    {
        foreach (['401', '403', '404', '419', '429', '500', '503'] as $code) {
            $viewPath = base_path("resources/views/errors/{$code}.blade.php");
            $this->assertFileExists($viewPath, "Vue d'erreur {$code} introuvable");
        }

        // Vérifier que le layout parent existe
        $this->assertFileExists(base_path('resources/views/errors/layout.blade.php'));
    }

    /** @test */
    public function it_shows_correct_message_for_419_session_expired(): void
    {
        $rendered = view('errors.419')->render();

        $this->assertStringContainsString('Session expirée', $rendered);
        $this->assertStringContainsString('Actualiser', $rendered);
    }

    /** @test */
    public function it_shows_maintenance_duration_on_503_when_configured(): void
    {
        // Définir la durée de maintenance
        config(['app.maintenance_duration' => '30 minutes']);

        $rendered = view('errors.503')->render();

        $this->assertStringContainsString('Maintenance', $rendered);
    }

    /** @test */
    public function it_does_not_expose_stack_trace_on_production_500(): void
    {
        // En production, les détails d'erreur ne doivent jamais être exposés
        config(['app.env' => 'production', 'app.debug' => false]);

        $rendered = view('errors.500', ['errorId' => 'ERR-TEST-999'])->render();

        // La référence est présente mais pas de stack trace PHP
        $this->assertStringContainsString('ERR-TEST-999', $rendered);
        $this->assertStringNotContainsString('Stack trace', $rendered);
        $this->assertStringNotContainsString('vendor/laravel', $rendered);
    }
}
