<?php

/**
 * DataSubjectRequestTest — Tests Feature RGPD (Vague 9)
 *
 * Couvre : export ZIP, anonymisation irréversible, conservation données comptables,
 *          politique de rétention, audit trail.
 */

use App\Models\AuditLog;
use App\Models\GdprRequest;
use App\Models\JournalEntry;
use App\Models\Organization;
use App\Models\User;
use App\Services\GdprService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');

    $this->org  = $this->createOrganization(['slug' => 'gdpr-' . uniqid()], 'active');
    $this->user = $this->createUserWithRole($this->org, 'admin_org');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    $this->subject = User::factory()->create([
        'organization_id' => $this->org->id,
        'first_name'      => 'Aminata',
        'last_name'       => 'Touré',
        'email'           => 'aminata.toure@corp.ci',
        'phone'           => '+22507000001',
    ]);

    $this->service = app(GdprService::class);
});

// =============================================================================
// EXPORT DES DONNÉES
// =============================================================================

it('exports all user data as zip', function () {
    $request = GdprRequest::factory()->create([
        'organization_id' => $this->org->id,
        'subject_user_id' => $this->subject->id,
        'type'            => 'access',
        'status'          => 'pending',
        'requested_by'    => $this->user->id,
    ]);

    $zipPath = $this->service->exportUserData($request);

    expect(Storage::exists($zipPath))->toBeTrue();

    // Vérifier que le ZIP contient un fichier JSON
    $zip = new ZipArchive();
    $zip->open(Storage::path($zipPath));
    $found = false;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        if (str_ends_with($zip->getNameIndex($i), '.json')) {
            $found = true;
            break;
        }
    }
    $zip->close();

    expect($found)->toBeTrue()
        ->and($request->fresh()->status)->toBe('completed');
});

// =============================================================================
// ANONYMISATION
// =============================================================================

it('anonymizes user data irreversibly', function () {
    $request = GdprRequest::factory()->create([
        'organization_id' => $this->org->id,
        'subject_user_id' => $this->subject->id,
        'type'            => 'erasure',
        'status'          => 'pending',
        'requested_by'    => $this->user->id,
    ]);

    $this->service->anonymizeUser($request);

    $anonymized = $this->subject->fresh();

    expect($anonymized->first_name)->not->toBe('Aminata')
        ->and($anonymized->last_name)->not->toBe('Touré')
        ->and($anonymized->email)->not->toBe('aminata.toure@corp.ci')
        ->and($anonymized->phone)->toBeNull();

    // L'email anonymisé doit être un format non identifiant
    expect($anonymized->email)->toMatch('/^anon-[a-f0-9]+@deleted\.invalid$/');
});

// =============================================================================
// CONSERVATION DES DONNÉES COMPTABLES
// =============================================================================

it('preserves accounting data after anonymization', function () {
    // Créer des écritures comptables liées à l'utilisateur
    $entry = JournalEntry::factory()->create([
        'organization_id' => $this->org->id,
        'created_by'      => $this->subject->id,
        'description'     => 'Facture client — anonymisation test',
    ]);

    $request = GdprRequest::factory()->create([
        'organization_id' => $this->org->id,
        'subject_user_id' => $this->subject->id,
        'type'            => 'erasure',
        'status'          => 'pending',
        'requested_by'    => $this->user->id,
    ]);

    $this->service->anonymizeUser($request);

    // L'écriture comptable doit toujours exister (obligation légale 10 ans)
    expect(JournalEntry::find($entry->id))->not->toBeNull()
        ->and(JournalEntry::find($entry->id)->description)->toBe('Facture client — anonymisation test');
});

// =============================================================================
// POLITIQUE DE RÉTENTION
// =============================================================================

it('processes retention policy correctly', function () {
    Carbon::setTestNow(Carbon::parse('2026-07-22'));

    // Données à supprimer : créées il y a 4 ans, rétention = 3 ans
    $oldUser = User::factory()->create([
        'organization_id' => $this->org->id,
        'created_at'      => Carbon::parse('2022-01-01'),
        'last_login_at'   => Carbon::parse('2022-06-01'),
        'is_gdpr_marked_for_deletion' => true,
        'gdpr_deletion_scheduled_at'  => Carbon::parse('2025-06-01'),
    ]);

    $deleted = $this->service->processRetentionPolicy(
        organizationId:   $this->org->id,
        retentionMonths:  36,
    );

    expect($deleted)->toBeArray()
        ->and(collect($deleted)->pluck('id')->toArray())->toContain($oldUser->id);

    // L'utilisateur doit être anonymisé ou supprimé
    expect(User::find($oldUser->id)?->email)->not->toBe($oldUser->email);
});

// =============================================================================
// AUDIT TRAIL RGPD
// =============================================================================

it('logs all gdpr actions in audit trail', function () {
    $request = GdprRequest::factory()->create([
        'organization_id' => $this->org->id,
        'subject_user_id' => $this->subject->id,
        'type'            => 'access',
        'status'          => 'pending',
        'requested_by'    => $this->user->id,
    ]);

    $this->service->exportUserData($request);

    // Au moins un log d'audit RGPD doit être créé
    $logs = AuditLog::where('organization_id', $this->org->id)
        ->where('action', 'like', 'gdpr.%')
        ->where('target_type', 'GdprRequest')
        ->where('target_id', $request->id)
        ->get();

    expect($logs)->not->toBeEmpty()
        ->and($logs->first()->action)->toStartWith('gdpr.');
});
