<?php

/**
 * CertificateTest — Tests de fonctionnalité Formation / Certificats
 *
 * Teste : génération à 100% complétion, UUID unique, vérification publique, expiration.
 */

use Carbon\Carbon;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->org  = $this->createOrganization(['slug' => 'training-test-' . uniqid()], 'active');
    $this->user = $this->createUserWithRole($this->org, 'agent');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    $this->actingAs($this->user);

    // Créer une formation de test
    $this->trainingResp = $this->postJson(route('training.courses.store'), [
        'title'       => 'Formation SECRETIS ERP',
        'description' => 'Prise en main complète du système',
        'duration_h'  => 8,
        'modules'     => [
            ['title' => 'Agenda & Planning', 'order' => 1, 'duration_min' => 60],
            ['title' => 'Courrier entrant',   'order' => 2, 'duration_min' => 45],
            ['title' => 'GED & Documents',   'order' => 3, 'duration_min' => 90],
        ],
    ]);

    $this->courseId = $this->trainingResp->json('data.id');
});

it('generates certificate on 100 percent completion', function () {
    // Marquer tous les modules comme complétés
    $modules = $this->trainingResp->json('data.modules');
    foreach ($modules as $module) {
        $this->postJson(route('training.progress.update'), [
            'course_id' => $this->courseId,
            'module_id' => $module['id'],
            'completed' => true,
        ]);
    }

    // Vérifier la progression = 100%
    $progressResp = $this->getJson(route('training.progress.show', $this->courseId));
    expect($progressResp->json('data.completion_percentage'))->toBe(100);

    // Le certificat doit être généré automatiquement
    $certResp = $this->getJson(route('training.certificates.show', [
        'course'  => $this->courseId,
        'learner' => $this->user->id,
    ]));

    expect($certResp->status())->toBe(200)
        ->and($certResp->json('data.issued_to'))->toBe($this->user->name)
        ->and($certResp->json('data.completion_percentage'))->toBe(100);
});

it('certificate token is unique UUID', function () {
    // Compléter la formation
    $modules = $this->trainingResp->json('data.modules');
    foreach ($modules as $module) {
        $this->postJson(route('training.progress.update'), [
            'course_id' => $this->courseId,
            'module_id' => $module['id'],
            'completed' => true,
        ]);
    }

    // Générer le certificat
    $cert1 = $this->getJson(route('training.certificates.show', [
        'course'  => $this->courseId,
        'learner' => $this->user->id,
    ]));

    $token = $cert1->json('data.verification_token');

    // Le token doit être un UUID v4 valide
    expect($token)->toMatch('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i');

    // Générer un second certificat pour un autre utilisateur
    $user2 = $this->createUserWithRole($this->org, 'agent');
    $this->actingAs($user2);

    foreach ($modules as $module) {
        $this->postJson(route('training.progress.update'), [
            'course_id' => $this->courseId,
            'module_id' => $module['id'],
            'completed' => true,
        ]);
    }

    $cert2 = $this->getJson(route('training.certificates.show', [
        'course'  => $this->courseId,
        'learner' => $user2->id,
    ]));

    $token2 = $cert2->json('data.verification_token');

    // Les tokens doivent être différents
    expect($token)->not->toBe($token2);
});

it('public verification works without auth', function () {
    // Compléter et obtenir un certificat
    $modules = $this->trainingResp->json('data.modules');
    foreach ($modules as $module) {
        $this->postJson(route('training.progress.update'), [
            'course_id' => $this->courseId,
            'module_id' => $module['id'],
            'completed' => true,
        ]);
    }

    $cert = $this->getJson(route('training.certificates.show', [
        'course'  => $this->courseId,
        'learner' => $this->user->id,
    ]));

    $token = $cert->json('data.verification_token');

    // Se déconnecter
    auth()->logout();

    // Vérification publique sans authentification
    $publicResp = $this->getJson(route('certificates.verify', ['token' => $token]));

    expect($publicResp->status())->toBe(200)
        ->and($publicResp->json('valid'))->toBeTrue()
        ->and($publicResp->json('certificate.issued_to'))->toBe($this->user->name);
});

it('expired certificate shows correct status', function () {
    // Créer directement un certificat expiré (via factory ou DB)
    $expiredToken = (string) Str::uuid();

    \Illuminate\Support\Facades\DB::table('training_certificates')->insert([
        'id'                   => (string) Str::uuid(),
        'course_id'            => $this->courseId,
        'user_id'              => $this->user->id,
        'organization_id'      => $this->org->id,
        'verification_token'   => $expiredToken,
        'issued_at'            => Carbon::now()->subYear(),
        'expires_at'           => Carbon::now()->subDays(30), // Expiré !
        'completion_percentage' => 100,
        'created_at'           => Carbon::now()->subYear(),
        'updated_at'           => Carbon::now()->subYear(),
    ]);

    auth()->logout();

    $publicResp = $this->getJson(route('certificates.verify', ['token' => $expiredToken]));

    expect($publicResp->status())->toBe(200)
        ->and($publicResp->json('valid'))->toBeFalse()
        ->and($publicResp->json('status'))->toBe('expired');
});
