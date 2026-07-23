<?php

/**
 * ImportTest — Tests Feature du wizard d'import universel CSV/XLSX
 *
 * Couvre : upload, validation MIME/taille, mapping, détection auto, dispatch, statut.
 */

use App\Models\ImportJob;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seedForTests();
    Queue::fake();
    Storage::fake('imports');
});

// =============================================================================
// Upload de fichier valide
// =============================================================================

it('accepts valid csv file upload', function () {
    ['org' => $org] = actingAsOrg('gestionnaire');

    $csvContent = "prenom,nom,email\nJean,Dupont,jean.dupont@test.ci\nMarie,Curie,m.curie@test.ci";
    $file = UploadedFile::fake()->createWithContent('contacts.csv', $csvContent);
    $file = new UploadedFile($file->getPathname(), 'contacts.csv', 'text/csv', null, true);

    $response = $this->postJson('/api/v1/imports/upload', [
        'file'   => $file,
        'module' => 'contacts',
    ]);

    $response->assertStatus(201)
             ->assertJsonStructure([
                 'data' => ['id', 'status', 'module', 'original_filename', 'total_rows'],
             ]);

    expect($response->json('data.status'))->toBe('mapping');
    expect($response->json('data.module'))->toBe('contacts');
});

it('accepts valid xlsx file upload', function () {
    actingAsOrg('gestionnaire');

    $file = UploadedFile::fake()->create(
        'utilisateurs.xlsx',
        50,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    $response = $this->postJson('/api/v1/imports/upload', [
        'file'   => $file,
        'module' => 'contacts',
    ]);

    $response->assertStatus(201);
});

// =============================================================================
// Rejet de fichier trop lourd
// =============================================================================

it('rejects file over 10mb', function () {
    actingAsOrg('gestionnaire');

    // 11 Mo — dépasse la limite de 10 Mo
    $file = UploadedFile::fake()->create('huge.csv', 11264, 'text/csv');

    $this->postJson('/api/v1/imports/upload', [
        'file'   => $file,
        'module' => 'contacts',
    ])->assertStatus(422)
      ->assertJsonValidationErrors(['file']);
});

// =============================================================================
// Rejet de MIME non autorisé
// =============================================================================

it('rejects non-csv/excel mime types', function () {
    actingAsOrg('gestionnaire');

    $file = UploadedFile::fake()->create('malicious.php', 10, 'application/x-php');

    $this->postJson('/api/v1/imports/upload', [
        'file'   => $file,
        'module' => 'contacts',
    ])->assertStatus(422)
      ->assertJsonValidationErrors(['file']);
})->with([
    'PHP'        => ['application/x-php', 'php'],
    'Shell'      => ['application/x-sh', 'sh'],
    'Executable' => ['application/x-msdownload', 'exe'],
    'JavaScript' => ['application/javascript', 'js'],
    'HTML'       => ['text/html', 'html'],
]);

// =============================================================================
// Validation des données mappées
// =============================================================================

it('validates mapped data before import', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $job = ImportJob::create([
        'organization_id'   => $org->id,
        'user_id'           => $user->id,
        'module'            => 'contacts',
        'file_path'         => 'imports/test.csv',
        'original_filename' => 'contacts.csv',
        'file_type'         => 'csv',
        'status'            => 'mapping',
        'total_rows'        => 5,
        'valid_rows'        => 0,
        'imported_rows'     => 0,
        'skipped_rows'      => 0,
        'error_rows'        => 0,
    ]);

    $response = $this->postJson("/api/v1/imports/{$job->id}/validate", [
        'column_mapping' => [
            'prenom' => 'first_name',
            'nom'    => 'last_name',
            'email'  => 'email',
        ],
    ]);

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => ['valid_rows', 'error_rows', 'validation_errors', 'status'],
             ]);

    expect($response->json('data.status'))->toBe('validating');
});

// =============================================================================
// Détection automatique du mapping
// =============================================================================

it('auto-detects column mapping', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $job = ImportJob::create([
        'organization_id'   => $org->id,
        'user_id'           => $user->id,
        'module'            => 'contacts',
        'file_path'         => 'imports/auto.csv',
        'original_filename' => 'contacts_auto.csv',
        'file_type'         => 'csv',
        'status'            => 'mapping',
        'total_rows'        => 3,
        'valid_rows'        => 0,
        'imported_rows'     => 0,
        'skipped_rows'      => 0,
        'error_rows'        => 0,
    ]);

    $response = $this->postJson("/api/v1/imports/{$job->id}/detect-mapping", [
        'headers' => ['first_name', 'last_name', 'email', 'phone'],
    ]);

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => ['mapping', 'confidence'],
             ]);

    // Les colonnes standards doivent être détectées automatiquement
    $mapping = $response->json('data.mapping');
    expect($mapping)->toHaveKey('first_name')
                   ->toHaveKey('last_name')
                   ->toHaveKey('email');
});

// =============================================================================
// Dispatch du job d'import
// =============================================================================

it('import job is dispatched on start', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $job = ImportJob::create([
        'organization_id'   => $org->id,
        'user_id'           => $user->id,
        'module'            => 'contacts',
        'file_path'         => 'imports/ready.csv',
        'original_filename' => 'contacts_ready.csv',
        'file_type'         => 'csv',
        'status'            => 'validating',
        'column_mapping'    => ['prenom' => 'first_name', 'email' => 'email'],
        'total_rows'        => 10,
        'valid_rows'        => 10,
        'imported_rows'     => 0,
        'skipped_rows'      => 0,
        'error_rows'        => 0,
    ]);

    $response = $this->postJson("/api/v1/imports/{$job->id}/start");

    $response->assertStatus(202)
             ->assertJson(['data' => ['status' => 'importing']]);

    Queue::assertPushed(\App\Jobs\ProcessImportJob::class, function ($queued) use ($job) {
        return $queued->importJobId === $job->id;
    });
});

// =============================================================================
// Statut et progression
// =============================================================================

it('import status returns progress', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('gestionnaire');

    $job = ImportJob::create([
        'organization_id'   => $org->id,
        'user_id'           => $user->id,
        'module'            => 'contacts',
        'file_path'         => 'imports/progress.csv',
        'original_filename' => 'contacts_progress.csv',
        'file_type'         => 'csv',
        'status'            => 'importing',
        'total_rows'        => 100,
        'valid_rows'        => 100,
        'imported_rows'     => 45,
        'skipped_rows'      => 2,
        'error_rows'        => 3,
    ]);

    $response = $this->getJson("/api/v1/imports/{$job->id}/status");

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => [
                     'id', 'status', 'total_rows', 'valid_rows',
                     'imported_rows', 'skipped_rows', 'error_rows', 'progress_percent',
                 ],
             ]);

    expect($response->json('data.imported_rows'))->toBe(45);
    expect($response->json('data.progress_percent'))->toBe(45);
});
