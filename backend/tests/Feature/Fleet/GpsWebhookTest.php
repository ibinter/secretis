<?php

/**
 * GpsWebhookTest — Tests Feature des webhooks GPS (Traccar / Vague 11)
 *
 * Couvre : réception position valide, rejet token invalide,
 *          alerte vitesse excessive, entrée/sortie géofence.
 */

use App\Models\Organization;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleGeofence;
use App\Models\VehicleGpsLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();

    $this->org  = $this->createOrganization(['slug' => 'gps-wh-' . uniqid()], 'active');
    $this->user = $this->createUserWithRole($this->org, 'admin_org');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);

    $this->deviceToken = 'GPS-TOKEN-' . strtoupper(bin2hex(random_bytes(8)));

    $this->vehicle = Vehicle::factory()->create([
        'organization_id' => $this->org->id,
        'plate_number'    => 'CI-1234-AB',
        'brand'           => 'Toyota',
        'model'           => 'Hilux',
        'device_token'    => $this->deviceToken,
        'current_lat'     => 5.3599,
        'current_lng'     => -4.0083,
        'current_speed'   => 0,
        'engine_on'       => true,
    ]);
});

// =============================================================================
// RÉCEPTION POSITION VALIDE
// =============================================================================

it('accepts valid traccar webhook', function () {
    $payload = [
        'device_token' => $this->deviceToken,
        'lat'          => 5.3610,
        'lng'          => -4.0090,
        'speed'        => 45.0,
        'heading'      => 180,
        'altitude'     => 12,
        'engine_on'    => true,
        'odometer'     => 12_500,
        'recorded_at'  => Carbon::now()->toIso8601String(),
    ];

    $response = $this->postJson(route('api.fleet.gps.webhook'), $payload);

    $response->assertStatus(200);

    // La position doit être persistée
    expect(
        VehicleGpsLog::where('vehicle_id', $this->vehicle->id)
            ->where('latitude', 5.3610)
            ->exists()
    )->toBeTrue();

    // Position courante du véhicule mise à jour
    $this->vehicle->refresh();
    expect($this->vehicle->current_lat)->toBe(5.3610)
        ->and($this->vehicle->current_speed)->toBe(45.0);
});

// =============================================================================
// REJET TOKEN INVALIDE
// =============================================================================

it('rejects webhook with invalid device token', function () {
    $payload = [
        'device_token' => 'FAUX-TOKEN-XYZ',
        'lat'          => 5.3610,
        'lng'          => -4.0090,
        'speed'        => 30.0,
        'recorded_at'  => Carbon::now()->toIso8601String(),
    ];

    $response = $this->postJson(route('api.fleet.gps.webhook'), $payload);

    $response->assertStatus(401);
});

// =============================================================================
// ALERTE VITESSE EXCESSIVE
// =============================================================================

it('triggers overspeed alert above 120kmh', function () {
    $payload = [
        'device_token' => $this->deviceToken,
        'lat'          => 5.4000,
        'lng'          => -4.1000,
        'speed'        => 135.0,  // > 120 km/h
        'heading'      => 90,
        'engine_on'    => true,
        'recorded_at'  => Carbon::now()->toIso8601String(),
    ];

    $this->postJson(route('api.fleet.gps.webhook'), $payload)
        ->assertStatus(200);

    // Une notification de vitesse excessive doit être envoyée
    Notification::assertSentOnDemand(
        \App\Notifications\FleetSpeedAlert::class,
        function ($notification, $channels, $notifiable) {
            return $notification->speed === 135.0
                && $notification->vehicleId === $this->vehicle->id;
        }
    );
});

// =============================================================================
// DÉTECTION ENTRÉE GÉOFENCE
// =============================================================================

it('detects geofence entry and notifies', function () {
    // Géofence centrée sur (5.3610, -4.0090), rayon 1 km, alert_on_enter=true
    $geofence = VehicleGeofence::factory()->create([
        'organization_id' => $this->org->id,
        'name'            => 'Zone bureau principal',
        'type'            => 'circle',
        'center_lat'      => 5.3610,
        'center_lng'      => -4.0090,
        'radius_km'       => 1.0,
        'alert_on_enter'  => true,
        'alert_on_exit'   => false,
    ]);

    // Véhicule était en dehors (5.3599, -4.0083 ≈ ~200m — à l'intérieur)
    // Simuler un déplacement vers 5.3611, -4.0091 (toujours dans la zone)
    // mais le dernier log connu était à l'EXTÉRIEUR
    $this->vehicle->update([
        'current_lat'       => 5.4000, // extérieur de la géofence
        'current_lng'       => -4.1000,
        'last_geofence_ids' => json_encode([]),
    ]);

    $payload = [
        'device_token' => $this->deviceToken,
        'lat'          => 5.3611,  // maintenant DANS la géofence
        'lng'          => -4.0091,
        'speed'        => 10.0,
        'engine_on'    => true,
        'recorded_at'  => Carbon::now()->toIso8601String(),
    ];

    $this->postJson(route('api.fleet.gps.webhook'), $payload)
        ->assertStatus(200);

    Notification::assertSentOnDemand(
        \App\Notifications\FleetGeofenceAlert::class,
        function ($notification) use ($geofence) {
            return $notification->geofenceId === $geofence->id
                && $notification->event === 'entry';
        }
    );
});

// =============================================================================
// DÉTECTION SORTIE GÉOFENCE
// =============================================================================

it('detects geofence exit and notifies', function () {
    $geofence = VehicleGeofence::factory()->create([
        'organization_id' => $this->org->id,
        'name'            => 'Zone entrepôt',
        'type'            => 'circle',
        'center_lat'      => 5.3599,
        'center_lng'      => -4.0083,
        'radius_km'       => 0.5,
        'alert_on_enter'  => false,
        'alert_on_exit'   => true,
    ]);

    // Véhicule est actuellement DANS la géofence
    $this->vehicle->update([
        'current_lat'       => 5.3599,
        'current_lng'       => -4.0083,
        'last_geofence_ids' => json_encode([$geofence->id]),
    ]);

    // Se déplace vers l'EXTÉRIEUR
    $payload = [
        'device_token' => $this->deviceToken,
        'lat'          => 5.4200,  // très loin du centre
        'lng'          => -4.2000,
        'speed'        => 60.0,
        'engine_on'    => true,
        'recorded_at'  => Carbon::now()->toIso8601String(),
    ];

    $this->postJson(route('api.fleet.gps.webhook'), $payload)
        ->assertStatus(200);

    Notification::assertSentOnDemand(
        \App\Notifications\FleetGeofenceAlert::class,
        function ($notification) use ($geofence) {
            return $notification->geofenceId === $geofence->id
                && $notification->event === 'exit';
        }
    );
});
