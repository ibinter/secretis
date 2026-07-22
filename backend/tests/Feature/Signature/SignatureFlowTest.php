<?php

/**
 * SignatureFlowTest — Tests de fonctionnalité Signature Électronique
 *
 * Teste : création demande, ordre séquentiel, complétion, certificat d'audit, annulation.
 */

use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->org = $this->createOrganization(['slug' => 'signature-test-' . uniqid()], 'active');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    // Créer les signataires
    $this->initiator = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->signer1   = $this->createUserWithRole($this->org, 'agent');
    $this->signer2   = $this->createUserWithRole($this->org, 'agent');

    $this->actingAs($this->initiator);

    Notification::fake();
    Storage::fake('private');
});

// =============================================================================
// Création de la demande de signature
// =============================================================================

it('creates signature request and notifies signers', function () {
    $response = $this->postJson(route('signatures.requests.store'), [
        'title'    => 'Contrat de Prestation 2026',
        'document' => \Illuminate\Http\UploadedFile::fake()->create('contrat.pdf', 500, 'application/pdf'),
        'signers'  => [
            ['user_id' => $this->signer1->id, 'order' => 1],
            ['user_id' => $this->signer2->id, 'order' => 2],
        ],
        'message'  => 'Merci de signer ce contrat avant le 31 janvier 2026.',
    ]);

    expect($response->status())->toBe(201)
        ->and($response->json('data.status'))->toBe('pending')
        ->and($response->json('data.signers'))->toHaveCount(2);

    // Les deux signataires doivent être notifiés
    Notification::assertSentTo($this->signer1, \App\Notifications\SignatureRequestedNotification::class);
    Notification::assertSentTo($this->signer2, \App\Notifications\SignatureRequestedNotification::class);
});

// =============================================================================
// Ordre séquentiel des signatures
// =============================================================================

it('processes sequential signature in correct order', function () {
    $response = $this->postJson(route('signatures.requests.store'), [
        'title'    => 'Convention de Partenariat',
        'document' => \Illuminate\Http\UploadedFile::fake()->create('convention.pdf', 300, 'application/pdf'),
        'signers'  => [
            ['user_id' => $this->signer1->id, 'order' => 1],
            ['user_id' => $this->signer2->id, 'order' => 2],
        ],
    ]);

    $requestId = $response->json('data.id');

    // Signer2 ne peut pas signer avant Signer1
    $this->actingAs($this->signer2);
    $earlySign = $this->postJson(route('signatures.sign', $requestId), [
        'signature_data' => base64_encode('signature_image_signer2'),
    ]);
    expect($earlySign->status())->toBe(422); // Pas encore son tour

    // Signer1 signe en premier
    $this->actingAs($this->signer1);
    $sign1 = $this->postJson(route('signatures.sign', $requestId), [
        'signature_data' => base64_encode('signature_image_signer1'),
    ]);
    expect($sign1->status())->toBe(200);
    expect($sign1->json('data.current_signer_order'))->toBe(2); // Maintenant c'est le tour de Signer2

    // Signer2 peut maintenant signer
    $this->actingAs($this->signer2);
    $sign2 = $this->postJson(route('signatures.sign', $requestId), [
        'signature_data' => base64_encode('signature_image_signer2'),
    ]);
    expect($sign2->status())->toBe(200);
});

// =============================================================================
// Complétion de la demande
// =============================================================================

it('completes request when all signed', function () {
    $response = $this->postJson(route('signatures.requests.store'), [
        'title'    => 'Avenant au Contrat',
        'document' => \Illuminate\Http\UploadedFile::fake()->create('avenant.pdf', 200, 'application/pdf'),
        'signers'  => [
            ['user_id' => $this->signer1->id, 'order' => 1],
        ],
    ]);

    $requestId = $response->json('data.id');

    // Signature unique
    $this->actingAs($this->signer1);
    $this->postJson(route('signatures.sign', $requestId), [
        'signature_data' => base64_encode('unique_signature'),
    ]);

    // Vérifier que la demande est complète
    $this->actingAs($this->initiator);
    $statusResp = $this->getJson(route('signatures.requests.show', $requestId));

    expect($statusResp->json('data.status'))->toBe('completed')
        ->and($statusResp->json('data.completed_at'))->not->toBeNull();
});

// =============================================================================
// Certificat d'audit
// =============================================================================

it('generates audit certificate PDF', function () {
    $response = $this->postJson(route('signatures.requests.store'), [
        'title'    => 'Protocole d\'Accord',
        'document' => \Illuminate\Http\UploadedFile::fake()->create('protocole.pdf', 400, 'application/pdf'),
        'signers'  => [
            ['user_id' => $this->signer1->id, 'order' => 1],
        ],
    ]);

    $requestId = $response->json('data.id');

    $this->actingAs($this->signer1);
    $this->postJson(route('signatures.sign', $requestId), [
        'signature_data' => base64_encode('protocole_signature'),
    ]);

    // Télécharger le certificat d'audit
    $this->actingAs($this->initiator);
    $certResp = $this->get(route('signatures.audit-certificate', $requestId));

    expect($certResp->status())->toBe(200)
        ->and($certResp->headers->get('Content-Type'))->toContain('application/pdf');
});

// =============================================================================
// Refus et annulation
// =============================================================================

it('decline triggers cancellation notification', function () {
    $response = $this->postJson(route('signatures.requests.store'), [
        'title'    => 'Contrat Refusé',
        'document' => \Illuminate\Http\UploadedFile::fake()->create('contrat_refus.pdf', 300, 'application/pdf'),
        'signers'  => [
            ['user_id' => $this->signer1->id, 'order' => 1],
            ['user_id' => $this->signer2->id, 'order' => 2],
        ],
    ]);

    $requestId = $response->json('data.id');

    // Signer1 refuse
    $this->actingAs($this->signer1);
    $declineResp = $this->postJson(route('signatures.decline', $requestId), [
        'reason' => 'Clauses non conformes au contrat initial.',
    ]);

    expect($declineResp->status())->toBe(200)
        ->and($declineResp->json('data.status'))->toBe('cancelled');

    // L'initiateur doit être notifié du refus
    Notification::assertSentTo(
        $this->initiator,
        \App\Notifications\SignatureDeclinedNotification::class
    );

    // Signer2 ne peut plus signer (demande annulée)
    $this->actingAs($this->signer2);
    $lateSign = $this->postJson(route('signatures.sign', $requestId), [
        'signature_data' => base64_encode('late_signature'),
    ]);
    expect($lateSign->status())->toBe(422);
});
