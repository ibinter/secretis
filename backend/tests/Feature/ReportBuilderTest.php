<?php

/**
 * ReportBuilderTest — Tests Feature du module Report Builder
 *
 * Couvre : liste, création, prévisualisation, génération, téléchargement, isolation, policy.
 */

use App\Models\CustomReport;
use App\Models\CustomReportRun;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seedForTests();
    Queue::fake();
    Storage::fake('reports');
});

// =============================================================================
// Liste des rapports
// =============================================================================

it('user can list their reports', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    CustomReport::factory()->count(3)->create([
        'organization_id' => $org->id,
        'created_by'      => $user->id,
    ]);

    $response = $this->getJson('/api/v1/reports/builder');

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => [
                     '*' => ['id', 'name', 'module', 'is_shared', 'run_count', 'last_run_at'],
                 ],
             ]);

    expect(count($response->json('data')))->toBe(3);
});

it('user does not see private reports from other users in same org', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $otherUser = $this->createUserWithRole($org, 'gestionnaire');

    // Rapport privé d'un autre utilisateur
    CustomReport::factory()->create([
        'organization_id' => $org->id,
        'created_by'      => $otherUser->id,
        'is_shared'       => false,
    ]);

    // Rapport partagé d'un autre utilisateur (visible)
    CustomReport::factory()->create([
        'organization_id' => $org->id,
        'created_by'      => $otherUser->id,
        'is_shared'       => true,
    ]);

    $response = $this->getJson('/api/v1/reports/builder');
    $response->assertStatus(200);

    // Seul le rapport partagé doit apparaître
    expect(count($response->json('data')))->toBe(1);
});

// =============================================================================
// Création
// =============================================================================

it('user can create a custom report', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $payload = [
        'name'      => 'Rapport courrier mensuel',
        'module'    => 'courrier',
        'columns'   => ['reference', 'subject', 'status', 'created_at'],
        'filters'   => [['field' => 'status', 'operator' => '=', 'value' => 'processed']],
        'sort'      => [['field' => 'created_at', 'direction' => 'desc']],
        'is_shared' => false,
    ];

    $response = $this->postJson('/api/v1/reports/builder', $payload);

    $response->assertStatus(201)
             ->assertJsonStructure([
                 'data' => ['id', 'name', 'module', 'columns', 'filters', 'sort'],
             ]);

    $this->assertDatabaseHas('custom_reports', [
        'organization_id' => $org->id,
        'created_by'      => $user->id,
        'name'            => 'Rapport courrier mensuel',
        'module'          => 'courrier',
    ]);
});

it('report creation validates required fields', function () {
    actingAsOrg('gestionnaire');

    $this->postJson('/api/v1/reports/builder', [])
         ->assertStatus(422)
         ->assertJsonValidationErrors(['name', 'module', 'columns']);
});

// =============================================================================
// Prévisualisation
// =============================================================================

it('report preview returns data', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $report = CustomReport::factory()->create([
        'organization_id' => $org->id,
        'created_by'      => $user->id,
        'module'          => 'taches',
        'columns'         => ['title', 'status', 'due_date'],
        'filters'         => [],
        'sort'            => [],
    ]);

    $response = $this->getJson("/api/v1/reports/builder/{$report->id}/preview");

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data'    => [],
                 'columns' => [],
                 'total'   => [],
             ]);
});

// =============================================================================
// Génération asynchrone
// =============================================================================

it('generate report job is dispatched', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $report = CustomReport::factory()->create([
        'organization_id' => $org->id,
        'created_by'      => $user->id,
        'module'          => 'courrier',
        'columns'         => ['reference', 'subject'],
        'filters'         => [],
        'sort'            => [],
    ]);

    $response = $this->postJson("/api/v1/reports/builder/{$report->id}/generate", [
        'format' => 'xlsx',
    ]);

    $response->assertStatus(202)
             ->assertJsonStructure(['data' => ['run_id', 'status']]);

    Queue::assertPushed(\App\Jobs\GenerateCustomReportJob::class);
});

// =============================================================================
// Téléchargement
// =============================================================================

it('user can download generated report', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $report = CustomReport::factory()->create([
        'organization_id' => $org->id,
        'created_by'      => $user->id,
        'module'          => 'agenda',
        'columns'         => ['title', 'start_at'],
        'filters'         => [],
        'sort'            => [],
    ]);

    // Simuler un run complété
    $run = CustomReportRun::create([
        'custom_report_id' => $report->id,
        'user_id'          => $user->id,
        'status'           => 'completed',
        'format'           => 'xlsx',
        'file_path'        => 'reports/org-' . $org->id . '/report-test.xlsx',
        'row_count'        => 42,
    ]);

    Storage::disk('reports')->put($run->file_path, 'fake-xlsx-content');

    $response = $this->getJson("/api/v1/reports/builder/runs/{$run->id}/download");

    $response->assertStatus(200);
    // Soit un URL signé, soit un header Content-Disposition
    expect(
        $response->headers->has('Content-Disposition') ||
        $response->json('url') !== null
    )->toBeTrue();
});

it('user cannot download a report run that is still processing', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $report = CustomReport::factory()->create([
        'organization_id' => $org->id,
        'created_by'      => $user->id,
        'module'          => 'agenda',
        'columns'         => ['title'],
        'filters'         => [],
        'sort'            => [],
    ]);

    $run = CustomReportRun::create([
        'custom_report_id' => $report->id,
        'user_id'          => $user->id,
        'status'           => 'processing',
        'format'           => 'pdf',
        'row_count'        => 0,
    ]);

    $this->getJson("/api/v1/reports/builder/runs/{$run->id}/download")
         ->assertStatus(409);
});

// =============================================================================
// Isolation multitenancy
// =============================================================================

it('user cannot access another org reports', function () {
    $orgA  = $this->createOrganization(['slug' => 'report-orgA-' . uniqid()], 'active');
    $this->createActiveLicense($orgA);
    $userA = $this->createUserWithRole($orgA, 'gestionnaire');

    $report = CustomReport::factory()->create([
        'organization_id' => $orgA->id,
        'created_by'      => $userA->id,
        'module'          => 'courrier',
        'columns'         => ['reference'],
        'filters'         => [],
        'sort'            => [],
    ]);

    // Se connecter dans une autre org
    actingAsOrg('gestionnaire');

    $this->getJson("/api/v1/reports/builder/{$report->id}")
         ->assertStatus(403);
});

// =============================================================================
// Policy (édition par un autre utilisateur de la même org)
// =============================================================================

it('report policy prevents editing other user reports', function () {
    ['org' => $org] = actingAsOrg('gestionnaire');

    $otherUser = $this->createUserWithRole($org, 'gestionnaire');
    $report    = CustomReport::factory()->create([
        'organization_id' => $org->id,
        'created_by'      => $otherUser->id,
        'module'          => 'taches',
        'is_shared'       => false,
        'columns'         => ['title'],
        'filters'         => [],
        'sort'            => [],
    ]);

    $this->patchJson("/api/v1/reports/builder/{$report->id}", [
        'name' => 'Tentative de modification',
    ])->assertStatus(403);
});
