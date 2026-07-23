<?php

namespace Tests\Feature\Search;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * SECRETIS ERP — Tests de la recherche globale (section 31)
 */
class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private User         $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org  = Organization::factory()->create();
        $this->user = User::factory()->create(['organization_id' => $this->org->id]);

        // Rôle de base avec permissions standard
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $this->user->assignRole($role);
    }

    /** @test */
    public function it_returns_results_scoped_to_current_organization(): void
    {
        // Créer un document dans notre org
        \DB::table('documents')->insert([
            'organization_id' => $this->org->id,
            'name'            => 'Rapport Annuel 2025',
            'description'     => 'Document confidentiel',
            'mime_type'       => 'application/pdf',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // Créer un document dans une autre org
        $otherOrg = Organization::factory()->create();
        \DB::table('documents')->insert([
            'organization_id' => $otherOrg->id,
            'name'            => 'Rapport Annuel 2025',
            'description'     => 'Document autre org',
            'mime_type'       => 'application/pdf',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/search?q=Rapport');

        $response->assertOk();

        $results = $response->json('results.documents', []);

        // Tous les résultats appartiennent à notre org (vérification via la data)
        $this->assertNotEmpty($results);
        foreach ($results as $result) {
            $docInDb = \DB::table('documents')->find((int) str_replace('/ged/', '', $result['url']));
            if ($docInDb) {
                $this->assertEquals($this->org->id, $docInDb->organization_id);
            }
        }
    }

    /** @test */
    public function it_respects_user_permissions_in_search_results(): void
    {
        // Utilisateur sans permission view.documents
        $restrictedUser = User::factory()->create(['organization_id' => $this->org->id]);
        $role = Role::firstOrCreate(['name' => 'auditor', 'guard_name' => 'web']);
        $restrictedUser->assignRole($role);
        // Ne pas donner la permission view.documents

        \DB::table('documents')->insert([
            'organization_id' => $this->org->id,
            'name'            => 'Rapport confidentiel',
            'mime_type'       => 'application/pdf',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $response = $this->actingAs($restrictedUser)
            ->getJson('/api/v1/search?q=Rapport');

        $response->assertOk();

        // L'utilisateur sans permission ne doit pas voir les documents
        $results = $response->json('results', []);
        $this->assertArrayNotHasKey('documents', $results);
    }

    /** @test */
    public function it_sanitizes_search_query_against_injection(): void
    {
        // Tentative d'injection XSS
        $xssPayload = '<script>alert("xss")</script>';
        $response   = $this->actingAs($this->user)
            ->getJson('/api/v1/search?q=' . urlencode($xssPayload));

        $response->assertOk();

        // La query retournée doit être nettoyée (sans balises HTML)
        $returnedQuery = $response->json('query', '');
        $this->assertStringNotContainsString('<script>', $returnedQuery);
        $this->assertStringNotContainsString('</script>', $returnedQuery);

        // Tentative d'injection SQL LIKE
        $sqlPayload = "report%' OR '1'='1";
        $response   = $this->actingAs($this->user)
            ->getJson('/api/v1/search?q=' . urlencode($sqlPayload));

        // Doit retourner 200 sans erreur serveur
        $response->assertOk();
    }

    /** @test */
    public function it_rate_limits_excessive_search_requests(): void
    {
        // Dépasser la limite de 60 requêtes/minute
        for ($i = 0; $i < 61; $i++) {
            $response = $this->actingAs($this->user)
                ->getJson('/api/v1/search?q=test' . $i);
        }

        $response->assertStatus(429);
    }

    /** @test */
    public function it_returns_validation_error_for_short_query(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/search?q=a');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['q']);
    }

    /** @test */
    public function it_returns_empty_results_for_no_match(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/search?q=zzzqueryinexistante');

        $response->assertOk()
            ->assertJson(['total' => 0]);

        $results = $response->json('results', []);
        $this->assertEmpty($results);
    }

    /** @test */
    public function it_requires_authentication(): void
    {
        $this->getJson('/api/v1/search?q=rapport')
            ->assertStatus(401);
    }

    /** @test */
    public function it_limits_results_to_five_per_category(): void
    {
        // Insérer 10 documents dans l'org
        for ($i = 1; $i <= 10; $i++) {
            \DB::table('documents')->insert([
                'organization_id' => $this->org->id,
                'name'            => "Document test {$i}",
                'mime_type'       => 'application/pdf',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }

        $response = $this->actingAs($this->user)
            ->getJson('/api/v1/search?q=Document');

        $response->assertOk();

        $documents = $response->json('results.documents', []);
        $this->assertLessThanOrEqual(5, count($documents));
    }
}
