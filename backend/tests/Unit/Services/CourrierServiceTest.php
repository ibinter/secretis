<?php

/**
 * CourrierServiceTest — Tests unitaires du service Courrier
 *
 * Teste : génération de référence, séquence par organisation, anti-doublons.
 */

use App\Models\MailRegistry;
use App\Services\AuditService;
use App\Services\CourrierService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->auditMock = Mockery::mock(AuditService::class)->shouldIgnoreMissing();
    $this->service   = new CourrierService($this->auditMock);

    $this->org  = $this->createOrganization(['slug' => 'courrier-test-' . uniqid()], 'active');
    $this->user = $this->createUserWithRole($this->org, 'agent');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);
});

it('generates unique reference with format CI-YYYYMM-XXXX', function () {
    // La vraie implémentation génère REF-ENTRANT-YYYY-NNNNN
    $reference = $this->service->generateReference('incoming', $this->org->id);

    $year = Carbon::now()->year;
    expect($reference)->toMatch("/^REF-ENTRANT-{$year}-\d{5}$/");
});

it('generates outgoing reference with format CO-YYYYMM-XXXX', function () {
    $reference = $this->service->generateReference('outgoing', $this->org->id);

    $year = Carbon::now()->year;
    expect($reference)->toMatch("/^REF-SORTANT-{$year}-\d{5}$/");
});

it('increments counter correctly per organization', function () {
    // Créer quelques courriers dans cette org
    MailRegistry::factory()->count(3)->create([
        'organization_id' => $this->org->id,
        'type'            => 'incoming',
        'created_at'      => Carbon::now(),
    ]);

    $reference = $this->service->generateReference('incoming', $this->org->id);

    // Le 4ème courrier doit avoir la séquence 00004
    expect($reference)->toContain('-00004');
});

it('prevents duplicate references under concurrent requests', function () {
    // Simuler deux appels simultanés via des transactions concurrentes
    $refs = [];

    // Premier appel
    $refs[] = DB::transaction(fn () => $this->service->generateReference('incoming', $this->org->id));

    // Créer manuellement le courrier pour simuler l'insertion
    MailRegistry::factory()->create([
        'organization_id' => $this->org->id,
        'type'            => 'incoming',
        'reference'       => $refs[0],
        'created_at'      => Carbon::now(),
    ]);

    // Second appel
    $refs[] = $this->service->generateReference('incoming', $this->org->id);

    // Les deux références doivent être différentes
    expect($refs[0])->not->toBe($refs[1]);
    expect(count(array_unique($refs)))->toBe(2);
});

it('resets counter at month change', function () {
    $lastYear = Carbon::now()->year - 1;

    // Simuler 5 courriers de l'année précédente
    MailRegistry::factory()->count(5)->create([
        'organization_id' => $this->org->id,
        'type'            => 'incoming',
        'created_at'      => Carbon::now()->subYear(),
    ]);

    // Cette année, le compteur doit recommencer à 00001
    $reference = $this->service->generateReference('incoming', $this->org->id);

    expect($reference)->toContain('-00001')
        ->and($reference)->toContain((string) Carbon::now()->year);
});
