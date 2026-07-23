<?php

/**
 * BackupTest — Tests Feature du module Backup & Restore
 *
 * Couvre : liste, déclenchement, restore, path traversal, RBAC, sécurité stockage.
 */

use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seedForTests();
    Queue::fake();
    Storage::fake('backups');
});

// =============================================================================
// Liste des backups
// =============================================================================

it('superadmin can list backups', function () {
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    // Simuler des fichiers de backup existants
    Storage::disk('backups')->put('backup-2026-01-15-120000.zip', 'fake-backup');
    Storage::disk('backups')->put('backup-2026-01-14-120000.zip', 'fake-backup-2');

    $response = $this->getJson('/api/v1/admin/backups');

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => [
                     '*' => ['filename', 'size', 'created_at'],
                 ],
             ]);

    expect(count($response->json('data')))->toBeGreaterThanOrEqual(2);
});

it('list is ordered by most recent first', function () {
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    Storage::disk('backups')->put('backup-2026-01-10-120000.zip', 'old');
    Storage::disk('backups')->put('backup-2026-01-20-120000.zip', 'recent');

    $response = $this->getJson('/api/v1/admin/backups');
    $response->assertStatus(200);

    $filenames = collect($response->json('data'))->pluck('filename')->toArray();

    // L'entrée la plus récente doit être en premier
    expect($filenames[0])->toContain('2026-01-20');
});

// =============================================================================
// Déclenchement manuel
// =============================================================================

it('superadmin can trigger a backup', function () {
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    $response = $this->postJson('/api/v1/admin/backups/trigger');

    $response->assertStatus(202)
             ->assertJsonStructure(['message', 'job_id']);

    Queue::assertPushed(\App\Jobs\CreateBackupJob::class);
});

// =============================================================================
// Restore
// =============================================================================

it('restore job is dispatched with valid filename', function () {
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    $filename = 'backup-2026-01-15-120000.zip';
    Storage::disk('backups')->put($filename, 'fake-backup-content');

    $response = $this->postJson('/api/v1/admin/backups/restore', [
        'filename' => $filename,
    ]);

    $response->assertStatus(202)
             ->assertJsonStructure(['message']);

    Queue::assertPushed(\App\Jobs\RestoreBackupJob::class, function ($job) use ($filename) {
        return $job->filename === $filename;
    });
});

it('restore fails when file does not exist', function () {
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    $this->postJson('/api/v1/admin/backups/restore', [
        'filename' => 'backup-inexistant-xyz.zip',
    ])->assertStatus(422);
});

// =============================================================================
// Path traversal
// =============================================================================

it('path traversal in filename is rejected', function () {
    $superAdmin = $this->createSuperAdmin();
    $this->actingAs($superAdmin);

    $maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\SAM',
        'backup-2026%2F..%2F..%2Fetc%2Fpasswd',
        'backup-2026-01-15-120000.zip; rm -rf /',
        '/absolute/path/backup.zip',
    ];

    foreach ($maliciousFilenames as $filename) {
        $this->postJson('/api/v1/admin/backups/restore', [
            'filename' => $filename,
        ])->assertStatus(422);
    }
});

// =============================================================================
// Contrôle d'accès RBAC
// =============================================================================

it('non-superadmin cannot access backup endpoints', function () {
    $org  = $this->createOrganization(['slug' => 'backup-rbac-' . uniqid()], 'active');
    $this->createActiveLicense($org);

    foreach (['admin_org', 'gestionnaire', 'agent', 'viewer'] as $role) {
        $user = $this->createUserWithRole($org, $role);
        $this->actingAs($user);

        $this->getJson('/api/v1/admin/backups')
             ->assertStatus(403);

        $this->postJson('/api/v1/admin/backups/trigger')
             ->assertStatus(403);
    }
});

it('unauthenticated user cannot access backup endpoints', function () {
    $this->getJson('/api/v1/admin/backups')
         ->assertStatus(401);
});

// =============================================================================
// Sécurité stockage
// =============================================================================

it('backup file is not in public directory', function () {
    // Le disque backups ne doit jamais être le disque public
    $backupDisk = config('backup.backup.destination.disks', ['backups']);

    expect($backupDisk)->not->toContain('public');
    expect($backupDisk)->not->toContain('local-public');

    // Vérifier que le path de backup n'est pas dans le dossier public
    $backupPath = Storage::disk('backups')->path('');
    expect($backupPath)->not->toContain(public_path());
});
