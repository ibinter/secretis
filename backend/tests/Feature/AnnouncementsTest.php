<?php

/**
 * AnnouncementsTest — Tests Feature du module Annonces plateforme
 *
 * Couvre : liste active, filtres plan/org, dismiss idempotent, expiration.
 */

use App\Models\Announcement;
use App\Models\AnnouncementDismissal;
use Carbon\Carbon;

beforeEach(function () {
    $this->seedForTests();
});

// =============================================================================
// Annonces actives
// =============================================================================

it('returns active announcements for current user', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    // Annonce globale active
    Announcement::factory()->create([
        'target'    => 'all',
        'is_active' => true,
        'starts_at' => now()->subHour(),
        'ends_at'   => now()->addDay(),
    ]);

    $response = $this->getJson('/api/v1/announcements');

    $response->assertStatus(200)
             ->assertJsonStructure([
                 'data' => [
                     '*' => ['id', 'type', 'display', 'target', 'is_dismissible'],
                 ],
             ]);

    expect(count($response->json('data')))->toBeGreaterThanOrEqual(1);
});

it('does not return inactive announcements', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    Announcement::factory()->create([
        'target'    => 'all',
        'is_active' => false,
        'starts_at' => now()->subHour(),
        'ends_at'   => now()->addDay(),
    ]);

    $response = $this->getJson('/api/v1/announcements');
    $response->assertStatus(200);

    $inactiveIds = Announcement::where('is_active', false)->pluck('id');
    $returnedIds = collect($response->json('data'))->pluck('id');

    foreach ($inactiveIds as $id) {
        expect($returnedIds)->not->toContain($id);
    }
});

// =============================================================================
// Filtres par plan
// =============================================================================

it('filters announcements by plan', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $planId = $org->plan_id ?? 1;

    // Annonce pour le plan de l'org
    $announcementForMyPlan = Announcement::factory()->create([
        'target'     => 'plan',
        'target_ids' => [$planId],
        'is_active'  => true,
        'starts_at'  => now()->subHour(),
        'ends_at'    => now()->addDay(),
    ]);

    // Annonce pour un autre plan
    $announcementOtherPlan = Announcement::factory()->create([
        'target'     => 'plan',
        'target_ids' => [99999],
        'is_active'  => true,
        'starts_at'  => now()->subHour(),
        'ends_at'    => now()->addDay(),
    ]);

    $response = $this->getJson('/api/v1/announcements');
    $response->assertStatus(200);

    $returnedIds = collect($response->json('data'))->pluck('id');

    expect($returnedIds)->toContain($announcementForMyPlan->id);
    expect($returnedIds)->not->toContain($announcementOtherPlan->id);
});

// =============================================================================
// Filtres par organisation
// =============================================================================

it('filters announcements by organization', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    // Annonce ciblant cette org
    $announcementForMyOrg = Announcement::factory()->create([
        'target'     => 'org',
        'target_ids' => [$org->id],
        'is_active'  => true,
        'starts_at'  => now()->subHour(),
        'ends_at'    => now()->addDay(),
    ]);

    // Annonce ciblant une autre org
    $announcementOtherOrg = Announcement::factory()->create([
        'target'     => 'org',
        'target_ids' => [88888],
        'is_active'  => true,
        'starts_at'  => now()->subHour(),
        'ends_at'    => now()->addDay(),
    ]);

    $response = $this->getJson('/api/v1/announcements');
    $response->assertStatus(200);

    $returnedIds = collect($response->json('data'))->pluck('id');
    expect($returnedIds)->toContain($announcementForMyOrg->id);
    expect($returnedIds)->not->toContain($announcementOtherOrg->id);
});

// =============================================================================
// Dismiss
// =============================================================================

it('user can dismiss an announcement', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $announcement = Announcement::factory()->create([
        'target'         => 'all',
        'is_active'      => true,
        'is_dismissible' => true,
        'starts_at'      => now()->subHour(),
        'ends_at'        => now()->addDay(),
    ]);

    $response = $this->postJson("/api/v1/announcements/{$announcement->id}/dismiss");

    $response->assertStatus(200)
             ->assertJson(['success' => true]);

    $this->assertDatabaseHas('announcement_dismissals', [
        'announcement_id' => $announcement->id,
        'user_id'         => $user->id,
    ]);
});

it('dismissed announcements are not returned for that user', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $announcement = Announcement::factory()->create([
        'target'         => 'all',
        'is_active'      => true,
        'is_dismissible' => true,
        'starts_at'      => now()->subHour(),
        'ends_at'        => now()->addDay(),
    ]);

    // Dismiss direct en base
    AnnouncementDismissal::create([
        'announcement_id' => $announcement->id,
        'user_id'         => $user->id,
        'dismissed_at'    => now(),
    ]);

    $response = $this->getJson('/api/v1/announcements');
    $returnedIds = collect($response->json('data'))->pluck('id');
    expect($returnedIds)->not->toContain($announcement->id);
});

// =============================================================================
// Idempotence du dismiss
// =============================================================================

it('dismiss is idempotent', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    $announcement = Announcement::factory()->create([
        'target'         => 'all',
        'is_active'      => true,
        'is_dismissible' => true,
        'starts_at'      => now()->subHour(),
        'ends_at'        => now()->addDay(),
    ]);

    // Premier dismiss
    $this->postJson("/api/v1/announcements/{$announcement->id}/dismiss")
         ->assertStatus(200);

    // Deuxième dismiss — ne doit pas créer un doublon ni erreur
    $this->postJson("/api/v1/announcements/{$announcement->id}/dismiss")
         ->assertStatus(200);

    $count = AnnouncementDismissal::where([
        'announcement_id' => $announcement->id,
        'user_id'         => $user->id,
    ])->count();

    expect($count)->toBe(1);
});

// =============================================================================
// Annonces expirées
// =============================================================================

it('expired announcements are not returned', function () {
    ['org' => $org, 'user' => $user] = actingAsOrg('agent');

    // Annonce expirée (ends_at dans le passé)
    $expired = Announcement::factory()->create([
        'target'    => 'all',
        'is_active' => true,
        'starts_at' => now()->subDays(7),
        'ends_at'   => now()->subDay(), // expirée hier
    ]);

    // Annonce future (pas encore débutée)
    $future = Announcement::factory()->create([
        'target'    => 'all',
        'is_active' => true,
        'starts_at' => now()->addDay(),
        'ends_at'   => now()->addDays(7),
    ]);

    $response = $this->getJson('/api/v1/announcements');
    $response->assertStatus(200);

    $returnedIds = collect($response->json('data'))->pluck('id');
    expect($returnedIds)->not->toContain($expired->id);
    expect($returnedIds)->not->toContain($future->id);
});
