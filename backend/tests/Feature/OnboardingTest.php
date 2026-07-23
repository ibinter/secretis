<?php

/**
 * OnboardingTest — Tests Feature du module Onboarding
 *
 * Couvre : étapes avec statut, complétion, idempotence, progression, skip.
 */

use App\Models\OnboardingStep;
use App\Models\OnboardingCompletion;

beforeEach(function () {
    $this->seedForTests();
});

// =============================================================================
// Liste des étapes
// =============================================================================

it('returns onboarding steps with completion status', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('admin_org');

    $response = $this->getJson('/api/v1/onboarding/steps');

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => [
                     '*' => [
                         'id', 'key', 'title', 'description', 'points',
                         'is_completed', 'completed_at',
                     ],
                 ],
             ]);

    // Toutes les étapes doivent être non complétées pour un nouvel utilisateur
    $steps = $response->json('data');
    expect($steps)->not->toBeEmpty();
    collect($steps)->each(fn ($s) => expect($s['is_completed'])->toBeFalse());
});

it('completed steps appear as completed in the list', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('admin_org');

    // Marquer la première étape comme complétée manuellement
    $step = OnboardingStep::first();
    if ($step) {
        OnboardingCompletion::create([
            'onboarding_step_id' => $step->id,
            'user_id'            => $user->id,
            'organization_id'    => $org->id,
            'completed_at'       => now(),
        ]);
    }

    $response = $this->getJson('/api/v1/onboarding/steps');
    $response->assertStatus(200);

    if ($step) {
        $stepData = collect($response->json('data'))->firstWhere('id', $step->id);
        expect($stepData['is_completed'])->toBeTrue();
        expect($stepData['completed_at'])->not->toBeNull();
    }
});

// =============================================================================
// Complétion d'une étape
// =============================================================================

it('user can complete an onboarding step', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('admin_org');

    $step = OnboardingStep::first();
    if (! $step) {
        // Créer une étape de test si aucune n'existe
        $step = OnboardingStep::create([
            'key'         => 'test_profile_complete',
            'title'       => ['fr' => 'Compléter le profil'],
            'description' => ['fr' => 'Renseignez vos informations'],
            'points'      => 10,
            'sort_order'  => 1,
        ]);
    }

    $response = $this->postJson("/api/v1/onboarding/steps/{$step->key}/complete");

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => ['step_key', 'points_earned', 'total_points', 'progress_percent'],
             ]);

    expect($response->json('data.step_key'))->toBe($step->key);
    expect($response->json('data.points_earned'))->toBeInt()->toBeGreaterThan(0);

    $this->assertDatabaseHas('onboarding_completions', [
        'onboarding_step_id' => $step->id,
        'user_id'            => $user->id,
        'organization_id'    => $org->id,
    ]);
});

// =============================================================================
// Idempotence
// =============================================================================

it('completing same step twice is idempotent', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('admin_org');

    $step = OnboardingStep::firstOrCreate(
        ['key' => 'idempotent_test_step'],
        [
            'title'       => ['fr' => 'Test idempotence'],
            'description' => ['fr' => 'Étape de test'],
            'points'      => 5,
            'sort_order'  => 99,
        ]
    );

    // Première complétion
    $this->postJson("/api/v1/onboarding/steps/{$step->key}/complete")
         ->assertStatus(200);

    // Deuxième complétion — ne doit pas créer de doublon ni erreur 5xx
    $this->postJson("/api/v1/onboarding/steps/{$step->key}/complete")
         ->assertStatus(200);

    $count = OnboardingCompletion::where([
        'onboarding_step_id' => $step->id,
        'user_id'            => $user->id,
        'organization_id'    => $org->id,
    ])->count();

    expect($count)->toBe(1);
});

// =============================================================================
// Progression et points
// =============================================================================

it('progress returns correct percentage and points', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('admin_org');

    // Créer des étapes connues et en compléter quelques-unes
    $step1 = OnboardingStep::firstOrCreate(['key' => 'prog_step_1'], [
        'title'       => ['fr' => 'Étape 1'],
        'description' => ['fr' => 'Première étape'],
        'points'      => 10,
        'sort_order'  => 1,
    ]);
    $step2 = OnboardingStep::firstOrCreate(['key' => 'prog_step_2'], [
        'title'       => ['fr' => 'Étape 2'],
        'description' => ['fr' => 'Deuxième étape'],
        'points'      => 20,
        'sort_order'  => 2,
    ]);

    OnboardingCompletion::firstOrCreate([
        'onboarding_step_id' => $step1->id,
        'user_id'            => $user->id,
        'organization_id'    => $org->id,
    ], ['completed_at' => now()]);

    $response = $this->getJson('/api/v1/onboarding/progress');

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => [
                     'total_steps', 'completed_steps', 'progress_percent',
                     'total_points', 'earned_points',
                 ],
             ]);

    $data = $response->json('data');
    expect($data['completed_steps'])->toBeGreaterThanOrEqual(1);
    expect($data['earned_points'])->toBeGreaterThanOrEqual(10);
    expect($data['progress_percent'])->toBeFloat()
                                     ->toBeGreaterThanOrEqual(0.0)
                                     ->toBeLessThanOrEqual(100.0);
});

// =============================================================================
// Skip onboarding
// =============================================================================

it('user can skip onboarding', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('admin_org');

    $response = $this->postJson('/api/v1/onboarding/skip');

    $response->assertStatus(200)
             ->assertJson(['success' => true]);

    // Vérifier que la préférence de skip est persistée
    $user->refresh();
    expect($user->settings['onboarding_skipped'] ?? false)->toBeTrue();
});

it('skipped users do not see onboarding steps list', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('admin_org');

    // Marquer le skip dans les settings utilisateur
    $user->update(['settings' => array_merge($user->settings ?? [], ['onboarding_skipped' => true])]);

    $response = $this->getJson('/api/v1/onboarding/steps');
    $response->assertStatus(200);

    // La réponse doit indiquer que l'onboarding est skippé
    expect($response->json('skipped'))->toBeTrue();
});
