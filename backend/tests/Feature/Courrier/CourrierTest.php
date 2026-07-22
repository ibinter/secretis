<?php

use App\Models\MailRegistry;
use App\Services\CourrierService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    $this->seedForTests();
    Storage::fake('private');

    $this->org           = $this->createOrganization(['slug' => 'org-courrier'], 'trial');
    $this->user          = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->courrierService = app(CourrierService::class);

    $this->actingAsUserInOrganization($this->user);
});

// =============================================================================
// ENREGISTREMENT COURRIER ENTRANT — Référence auto-générée unique
// =============================================================================

test('enregistrement courrier entrant génère une référence unique', function () {
    $response = $this->postJson('/api/courrier/incoming', [
        'sender_name' => 'Ministère de l\'Éducation',
        'sender_org'  => 'Gouvernement CI',
        'subject'     => 'Circulaire 2026-01 relative aux examens',
        'received_at' => now()->toIso8601String(),
        'urgency'     => 'normal',
    ]);

    $response->assertStatus(201)
             ->assertJsonStructure([
                 'data' => ['id', 'reference', 'type', 'subject', 'status'],
             ]);

    $reference = $response->json('data.reference');

    // Format : REF-ENTRANT-ANNÉE-SÉQUENCE
    expect($reference)->toMatch('/^REF-ENTRANT-\d{4}-\d{5}$/');

    // Vérifier en BDD
    $this->assertDatabaseHas('mail_registry', [
        'reference'       => $reference,
        'type'            => 'incoming',
        'organization_id' => $this->org->id,
        'status'          => 'pending',
    ]);
});

test('deux courriers entrants ont des références séquentielles différentes', function () {
    $ref1 = $this->courrierService->generateReference('incoming', $this->org->id);

    // Créer un enregistrement avec cette référence pour incrémenter le compteur
    MailRegistry::create([
        'organization_id' => $this->org->id,
        'type'            => 'incoming',
        'reference'       => $ref1,
        'subject'         => 'Test 1',
        'status'          => 'pending',
        'created_by_id'   => $this->user->id,
    ]);

    $ref2 = $this->courrierService->generateReference('incoming', $this->org->id);

    expect($ref1)->not->toBe($ref2);

    // La séquence est incrémentée
    $seq1 = (int) substr($ref1, -5);
    $seq2 = (int) substr($ref2, -5);
    expect($seq2)->toBe($seq1 + 1);
});

// =============================================================================
// ENREGISTREMENT COURRIER SORTANT
// =============================================================================

test('enregistrement courrier sortant retourne 201 avec statut processed', function () {
    $response = $this->postJson('/api/courrier/outgoing', [
        'recipient_name' => 'Direction Régionale de Bouaké',
        'recipient_org'  => 'DR Bouaké',
        'subject'        => 'Rapport annuel 2025',
        'sent_at'        => now()->toIso8601String(),
        'urgency'        => 'high',
    ]);

    $response->assertStatus(201);

    $reference = $response->json('data.reference');
    expect($reference)->toMatch('/^REF-SORTANT-\d{4}-\d{5}$/');

    $this->assertDatabaseHas('mail_registry', [
        'type'   => 'outgoing',
        'status' => 'processed', // Courrier sortant = directement processed
    ]);
});

// =============================================================================
// ASSIGNATION COURRIER — Notification envoyée
// =============================================================================

test('assignation courrier à un agent déclenche une notification', function () {
    Notification::fake();

    $agent = $this->createUserWithRole($this->org, 'agent');

    $mail = MailRegistry::create([
        'organization_id' => $this->org->id,
        'type'            => 'incoming',
        'reference'       => 'REF-ENTRANT-2026-00001',
        'subject'         => 'Courrier à assigner',
        'status'          => 'pending',
        'created_by_id'   => $this->user->id,
    ]);

    $response = $this->postJson("/api/courrier/{$mail->id}/assign", [
        'user_id' => $agent->id,
    ]);

    $response->assertStatus(200);

    // Le courrier est maintenant assigné à l'agent
    $mail->refresh();
    expect($mail->assigned_to_id)->toBe($agent->id);
    expect($mail->status)->toBe('processing');

    // La notification a été envoyée à l'agent
    Notification::assertSentTo($agent, \App\Notifications\CourrierAssignedNotification::class);
});

// =============================================================================
// WORKFLOW — Transitions de statut
// =============================================================================

test('changement de statut valide : pending → processing', function () {
    $mail = MailRegistry::create([
        'organization_id' => $this->org->id,
        'type'            => 'incoming',
        'reference'       => 'REF-ENTRANT-2026-00002',
        'subject'         => 'Test workflow',
        'status'          => 'pending',
        'created_by_id'   => $this->user->id,
    ]);

    $response = $this->patchJson("/api/courrier/{$mail->id}/status", [
        'status' => 'processing',
    ]);

    $response->assertStatus(200);

    $mail->refresh();
    expect($mail->status)->toBe('processing');
});

test('changement de statut invalide : archived → processing retourne 422', function () {
    $mail = MailRegistry::create([
        'organization_id' => $this->org->id,
        'type'            => 'incoming',
        'reference'       => 'REF-ENTRANT-2026-00003',
        'subject'         => 'Test transition invalide',
        'status'          => 'archived', // État final
        'created_by_id'   => $this->user->id,
    ]);

    $response = $this->patchJson("/api/courrier/{$mail->id}/status", [
        'status' => 'processing', // Transition interdite depuis archived
    ]);

    $response->assertStatus(422);

    // Le statut n'a pas changé
    $mail->refresh();
    expect($mail->status)->toBe('archived');
});

test('toutes les transitions valides du workflow fonctionnent', function () {
    $validTransitions = [
        ['from' => 'pending', 'to' => 'processing'],
        ['from' => 'processing', 'to' => 'processed'],
        ['from' => 'processed', 'to' => 'archived'],
    ];

    foreach ($validTransitions as $transition) {
        $mail = MailRegistry::create([
            'organization_id' => $this->org->id,
            'type'            => 'incoming',
            'reference'       => 'REF-ENTRANT-2026-' . str_pad(rand(10, 99999), 5, '0', STR_PAD_LEFT),
            'subject'         => "Test {$transition['from']} → {$transition['to']}",
            'status'          => $transition['from'],
            'created_by_id'   => $this->user->id,
        ]);

        $response = $this->patchJson("/api/courrier/{$mail->id}/status", [
            'status' => $transition['to'],
        ]);

        $response->assertStatus(200, "Transition {$transition['from']} → {$transition['to']} échouée");
    }
});

// =============================================================================
// EXPORT PDF DU REGISTRE
// =============================================================================

test('export PDF du registre courrier retourne un fichier PDF', function () {
    // Créer quelques courriers
    for ($i = 1; $i <= 3; $i++) {
        MailRegistry::create([
            'organization_id' => $this->org->id,
            'type'            => 'incoming',
            'reference'       => "REF-ENTRANT-2026-" . str_pad($i, 5, '0', STR_PAD_LEFT),
            'subject'         => "Courrier {$i}",
            'status'          => 'pending',
            'created_by_id'   => $this->user->id,
        ]);
    }

    $response = $this->get('/api/courrier/export/pdf?type=incoming&year=2026');

    $response->assertStatus(200)
             ->assertHeader('Content-Type', 'application/pdf');
});

// =============================================================================
// CRON — Alerte courrier en retard
// =============================================================================

test('alerte courrier en retard : les courriers dépassant leur délai sont détectés', function () {
    // Courrier en retard (créé il y a 5 jours, délai = 3 jours)
    $overdueMailId = MailRegistry::create([
        'organization_id'       => $this->org->id,
        'type'                  => 'incoming',
        'reference'             => 'REF-ENTRANT-2026-00100',
        'subject'               => 'Courrier en retard',
        'status'                => 'pending',
        'created_by_id'         => $this->user->id,
        'processing_delay_days' => 3,
        'created_at'            => Carbon::now()->subDays(5),
    ])->id;

    // Courrier dans les délais (créé aujourd'hui)
    $onTimeMailId = MailRegistry::create([
        'organization_id'       => $this->org->id,
        'type'                  => 'incoming',
        'reference'             => 'REF-ENTRANT-2026-00101',
        'subject'               => 'Courrier dans les délais',
        'status'                => 'pending',
        'created_by_id'         => $this->user->id,
        'processing_delay_days' => 3,
        'created_at'            => Carbon::now(),
    ])->id;

    // Appel CRON via l'endpoint Artisan ou le service directement
    $this->courrierService->sendAlertIfOverdue();

    // Vérifier que le courrier en retard est dans le scope overdue
    $overdueMails = MailRegistry::overdue()->get();
    $overdueIds   = $overdueMails->pluck('id')->toArray();

    expect($overdueIds)->toContain($overdueMailId);
    expect($overdueIds)->not->toContain($onTimeMailId);
});

// =============================================================================
// UPLOAD PIÈCE JOINTE — Stockée dans storage privé (pas /public)
// =============================================================================

test('upload pièce jointe stockée dans storage privé, pas dans public', function () {
    $mail = MailRegistry::create([
        'organization_id' => $this->org->id,
        'type'            => 'incoming',
        'reference'       => 'REF-ENTRANT-2026-00200',
        'subject'         => 'Courrier avec PJ',
        'status'          => 'pending',
        'created_by_id'   => $this->user->id,
    ]);

    $file = UploadedFile::fake()->create('document_confidentiel.pdf', 500, 'application/pdf');

    $response = $this->postJson("/api/courrier/{$mail->id}/attachments", [
        'file' => $file,
    ]);

    $response->assertStatus(201)
             ->assertJsonStructure([
                 'data' => ['id', 'filename', 'path', 'size'],
             ]);

    $storedPath = $response->json('data.path');

    // Le chemin ne doit PAS commencer par 'public/'
    expect($storedPath)->not->toStartWith('public/');
    expect($storedPath)->not->toContain('/public/');

    // Le fichier est bien dans le storage privé
    Storage::disk('private')->assertExists($storedPath);

    // Le fichier n'est PAS accessible publiquement
    $publicPath = public_path($storedPath);
    expect(file_exists($publicPath))->toBeFalse();
});

test('pièce jointe non accessible directement via URL publique', function () {
    $mail = MailRegistry::create([
        'organization_id' => $this->org->id,
        'type'            => 'incoming',
        'reference'       => 'REF-ENTRANT-2026-00201',
        'subject'         => 'Courrier PJ accès',
        'status'          => 'pending',
        'created_by_id'   => $this->user->id,
    ]);

    $file = UploadedFile::fake()->create('confidentiel.pdf', 100);

    $upload = $this->postJson("/api/courrier/{$mail->id}/attachments", ['file' => $file]);
    $upload->assertStatus(201);

    // Tentative d'accès direct via URL publique → doit échouer
    $path = $upload->json('data.path');
    $publicUrl = '/storage/' . $path;

    // L'accès direct au fichier via le web doit retourner 404 (pas dans storage/app/public)
    $response = $this->get($publicUrl);
    $response->assertStatus(fn($status) => in_array($status, [403, 404]));
});
