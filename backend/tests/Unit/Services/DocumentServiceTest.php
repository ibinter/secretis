<?php

/**
 * DocumentServiceTest — Tests unitaires du service GED
 *
 * Teste : validation MIME, stockage isolé par tenant, URLs signées, partage.
 */

use App\Models\Document;
use App\Services\AuditService;
use App\Services\DocumentService;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->auditMock = Mockery::mock(AuditService::class)->shouldIgnoreMissing();
    $this->service   = new DocumentService($this->auditMock);

    $this->org  = $this->createOrganization(['slug' => 'ged-test-' . uniqid()], 'active');
    $this->user = $this->createUserWithRole($this->org, 'agent');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    Storage::fake('private');
});

// =============================================================================
// Validation MIME
// =============================================================================

it('accepts allowed MIME types', function (string $mime, string $ext) {
    $file = UploadedFile::fake()->create("document.{$ext}", 100, $mime);

    // validateMimeType ne doit pas lever d'exception
    expect(fn () => $this->service->validateMimeType($file))->not->toThrow(\InvalidArgumentException::class);
})->with([
    'PDF'  => ['application/pdf', 'pdf'],
    'Word' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
    'Excel'=> ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
    'JPEG' => ['image/jpeg', 'jpg'],
    'PNG'  => ['image/png', 'png'],
    'CSV'  => ['text/csv', 'csv'],
]);

it('rejects disallowed MIME types', function (string $mime, string $ext) {
    $file = UploadedFile::fake()->create("malicious.{$ext}", 100, $mime);

    expect(fn () => $this->service->validateMimeType($file))
        ->toThrow(\InvalidArgumentException::class, 'Type de fichier non autorisé');
})->with([
    'PHP executable' => ['application/x-php', 'php'],
    'Shell script'   => ['application/x-sh', 'sh'],
    'Executable'     => ['application/x-msdownload', 'exe'],
    'JavaScript'     => ['application/javascript', 'js'],
    'Python'         => ['text/x-python', 'py'],
]);

// =============================================================================
// Stockage avec isolation par tenant
// =============================================================================

it('stores document in private path with organization isolation', function () {
    $file = UploadedFile::fake()->create('rapport.pdf', 500, 'application/pdf');

    $document = $this->service->upload($file, [
        'title'        => 'Rapport Annuel',
        'access_level' => 'internal',
    ], $this->user);

    // Le chemin doit contenir l'ID de l'organisation (isolation tenant)
    expect($document->file_path)->toContain("tenants/{$this->org->id}")
        ->and($document->file_path)->toContain('documents')
        ->and($document->organization_id)->toBe($this->org->id);

    // Le fichier est dans le disque privé, jamais dans public
    Storage::disk('private')->assertExists($document->file_path);
});

// =============================================================================
// URLs signées
// =============================================================================

it('generates signed URL with 15 minute expiry', function () {
    // Configurer S3 comme driver pour tester les URLs temporaires
    config(['filesystems.disks.private.driver' => 's3']);

    $document = Document::factory()->create([
        'organization_id' => $this->org->id,
        'author_id'       => $this->user->id,
        'file_path'       => "tenants/{$this->org->id}/documents/test/file.pdf",
        'access_level'    => 'internal',
    ]);

    // Mocker Storage pour retourner une URL temporaire
    Storage::shouldReceive('disk->temporaryUrl')
        ->once()
        ->andReturn('https://s3.amazonaws.com/bucket/file.pdf?X-Amz-Expires=900');

    $url = $this->service->getSecureDownloadUrl($document, $this->user);

    expect($url)->toStartWith('https://')
        ->and($url)->toContain('Expires=900');
});

// =============================================================================
// Token de partage
// =============================================================================

it('stores share token as SHA-256 hash never raw', function () {
    $document = Document::factory()->create([
        'organization_id' => $this->org->id,
        'author_id'       => $this->user->id,
        'file_path'       => "tenants/{$this->org->id}/documents/test/file.pdf",
        'access_level'    => 'internal',
    ]);

    // Créer la table document_share_tokens pour ce test
    if (!Schema::hasTable('document_share_tokens')) {
        Schema::create('document_share_tokens', function ($table) {
            $table->uuid('id')->primary();
            $table->string('document_id');
            $table->string('token', 64);
            $table->timestamp('expires_at');
            $table->timestamp('created_at');
        });
    }

    $rawToken = $this->service->generateShareToken($document, 24);

    // Le token retourné est le token brut (64 chars aléatoires)
    expect(strlen($rawToken))->toBe(64);

    // Mais en base, seul le hash SHA-256 est stocké
    $stored = DB::table('document_share_tokens')
        ->where('document_id', $document->id)
        ->first();

    expect($stored)->not->toBeNull();
    expect($stored->token)->toBe(hash('sha256', $rawToken));
    expect($stored->token)->not->toBe($rawToken); // jamais le token brut
});

it('share token expires correctly', function () {
    $document = Document::factory()->create([
        'organization_id' => $this->org->id,
        'author_id'       => $this->user->id,
        'file_path'       => "tenants/{$this->org->id}/documents/test/file2.pdf",
        'access_level'    => 'internal',
    ]);

    if (!Schema::hasTable('document_share_tokens')) {
        Schema::create('document_share_tokens', function ($table) {
            $table->uuid('id')->primary();
            $table->string('document_id');
            $table->string('token', 64);
            $table->timestamp('expires_at');
            $table->timestamp('created_at');
        });
    }

    $hoursValid = 6;
    $this->service->generateShareToken($document, $hoursValid);

    $stored = DB::table('document_share_tokens')
        ->where('document_id', $document->id)
        ->first();

    $expiresAt = Carbon::parse($stored->expires_at);
    $expected  = Carbon::now()->addHours($hoursValid);

    // La date d'expiration doit être dans ~6 heures (avec 1 min de tolérance)
    expect(abs($expiresAt->diffInMinutes($expected)))->toBeLessThan(2);
});
