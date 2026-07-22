<?php

/**
 * FleetServiceTest — Tests unitaires du module Parc Auto Avancé
 *
 * Couvre : calcul Haversine, géofences circulaires et polygonales,
 *          maintenance prédictive (km + date), consommation carburant.
 */

use App\Models\Vehicle;
use App\Models\VehicleFuelLog;
use App\Models\VehicleGeofence;
use App\Models\VehicleMaintenanceSchedule;
use App\Services\FleetService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Mockery;

beforeEach(function () {
    $this->notifications = Mockery::mock(NotificationService::class);
    $this->notifications->shouldReceive('send')->andReturn(null)->byDefault();

    $this->service = new FleetService($this->notifications);

    $this->org  = $this->createOrganization(['slug' => 'fleet-' . uniqid()], 'active');
    $this->user = $this->createUserWithRole($this->org, 'gestionnaire');
    $this->createActiveLicense($this->org);
    app()->instance('current_organization', $this->org);
});

// =============================================================================
// DISTANCE HAVERSINE
// =============================================================================

it('calculates haversine distance correctly', function () {
    // Abidjan (5.3599°N, 4.0083°W) → Yamoussoukro (6.8276°N, 5.2893°W)
    // Distance réelle ≈ 213 km
    $distanceKm = $this->service->haversineDistance(
        lat1: 5.3599,
        lng1: -4.0083,
        lat2: 6.8276,
        lng2: -5.2893,
    );

    expect($distanceKm)->toBeFloat()
        ->and($distanceKm)->toBeGreaterThan(200.0)
        ->and($distanceKm)->toBeLessThan(230.0);
});

it('returns zero distance for same coordinates', function () {
    $distance = $this->service->haversineDistance(
        lat1: 5.3599,
        lng1: -4.0083,
        lat2: 5.3599,
        lng2: -4.0083,
    );

    expect($distance)->toBeLessThan(0.001);
});

// =============================================================================
// GÉOFENCES CIRCULAIRES
// =============================================================================

it('detects point inside circular geofence', function () {
    // Centre : Plateau Abidjan (5.3250°N, 4.0050°W), rayon 2 km
    // Point : 5.3260°N, 4.0040°W → ~150 m du centre → INSIDE

    $isInside = $this->service->isInsideCircularGeofence(
        pointLat:   5.3260,
        pointLng:  -4.0040,
        centerLat:  5.3250,
        centerLng: -4.0050,
        radiusKm:   2.0,
    );

    expect($isInside)->toBeTrue();
});

it('detects point outside circular geofence', function () {
    // Point : 5.3599°N, 4.0083°W → ~4 km du centre → OUTSIDE

    $isInside = $this->service->isInsideCircularGeofence(
        pointLat:   5.3599,
        pointLng:  -4.0083,
        centerLat:  5.3250,
        centerLng: -4.0050,
        radiusKm:   2.0,
    );

    expect($isInside)->toBeFalse();
});

// =============================================================================
// GÉOFENCE POLYGONALE — RAY CASTING
// =============================================================================

it('detects polygon geofence using ray casting', function () {
    // Polygone simple : carré autour de (0,0) de côté 2°
    $polygon = [
        ['lat' => -1.0, 'lng' => -1.0],
        ['lat' => -1.0, 'lng' =>  1.0],
        ['lat' =>  1.0, 'lng' =>  1.0],
        ['lat' =>  1.0, 'lng' => -1.0],
    ];

    // Point au centre → INSIDE
    $insideResult = $this->service->isInsidePolygonGeofence(
        pointLat:  0.0,
        pointLng:  0.0,
        polygon:   $polygon,
    );
    expect($insideResult)->toBeTrue();

    // Point à l'extérieur → OUTSIDE
    $outsideResult = $this->service->isInsidePolygonGeofence(
        pointLat:  5.0,
        pointLng:  5.0,
        polygon:   $polygon,
    );
    expect($outsideResult)->toBeFalse();
});

// =============================================================================
// MAINTENANCE PRÉDICTIVE — SEUIL KM
// =============================================================================

it('predicts maintenance based on km threshold', function () {
    $vehicle = Vehicle::factory()->create([
        'organization_id' => $this->org->id,
        'odometer_km'     => 49_600,
    ]);

    // Prochaine vidange à 50 000 km → il reste 400 km → alerte < 500 km
    $schedule = VehicleMaintenanceSchedule::factory()->create([
        'vehicle_id'       => $vehicle->id,
        'maintenance_type' => 'vidange',
        'trigger_type'     => 'km',
        'next_km'          => 50_000,
        'alert_km_before'  => 500,
    ]);

    $alerts = $this->service->getPredictiveMaintenanceAlerts($vehicle);

    expect($alerts)->toBeArray()
        ->and($alerts)->not->toBeEmpty();

    $types = collect($alerts)->pluck('maintenance_type')->toArray();
    expect($types)->toContain('vidange');
});

it('does not trigger km alert when far from threshold', function () {
    $vehicle = Vehicle::factory()->create([
        'organization_id' => $this->org->id,
        'odometer_km'     => 45_000,
    ]);

    $schedule = VehicleMaintenanceSchedule::factory()->create([
        'vehicle_id'       => $vehicle->id,
        'maintenance_type' => 'vidange',
        'trigger_type'     => 'km',
        'next_km'          => 50_000,
        'alert_km_before'  => 500,
    ]);

    $alerts = $this->service->getPredictiveMaintenanceAlerts($vehicle);

    $kmAlerts = collect($alerts)->where('trigger_type', 'km')->toArray();
    expect($kmAlerts)->toBeEmpty();
});

// =============================================================================
// MAINTENANCE PRÉDICTIVE — SEUIL DATE
// =============================================================================

it('predicts maintenance based on date threshold', function () {
    Carbon::setTestNow(Carbon::parse('2026-07-22'));

    $vehicle = Vehicle::factory()->create([
        'organization_id' => $this->org->id,
    ]);

    // Contrôle technique dans 10 jours → alerte si < 15 jours
    $schedule = VehicleMaintenanceSchedule::factory()->create([
        'vehicle_id'           => $vehicle->id,
        'maintenance_type'     => 'ct',
        'trigger_type'         => 'date',
        'next_date'            => Carbon::parse('2026-08-01'),
        'alert_days_before'    => 15,
    ]);

    $alerts = $this->service->getPredictiveMaintenanceAlerts($vehicle);

    expect($alerts)->not->toBeEmpty();
    $types = collect($alerts)->pluck('maintenance_type')->toArray();
    expect($types)->toContain('ct');
});

it('does not trigger date alert when deadline is far', function () {
    Carbon::setTestNow(Carbon::parse('2026-07-22'));

    $vehicle = Vehicle::factory()->create([
        'organization_id' => $this->org->id,
    ]);

    $schedule = VehicleMaintenanceSchedule::factory()->create([
        'vehicle_id'        => $vehicle->id,
        'maintenance_type'  => 'assurance',
        'trigger_type'      => 'date',
        'next_date'         => Carbon::parse('2026-12-31'),
        'alert_days_before' => 15,
    ]);

    $alerts = $this->service->getPredictiveMaintenanceAlerts($vehicle);
    $dateAlerts = collect($alerts)->where('maintenance_type', 'assurance')->toArray();
    expect($dateAlerts)->toBeEmpty();
});

// =============================================================================
// CONSOMMATION CARBURANT
// =============================================================================

it('calculates fuel consumption liters per 100km', function () {
    // Plein 1 : 45 200 km / 40 L
    // Plein 2 : 45 800 km / 52 L
    // Consommation : 52 L / 600 km × 100 = 8.67 L/100km

    $log1 = VehicleFuelLog::factory()->make([
        'odometer_km'        => 45_200,
        'quantity_liters'    => 40.0,
        'full_tank'          => true,
    ]);

    $log2 = VehicleFuelLog::factory()->make([
        'odometer_km'        => 45_800,
        'quantity_liters'    => 52.0,
        'full_tank'          => true,
    ]);

    $consumption = $this->service->calculateFuelConsumption($log1, $log2);

    expect($consumption)->toBeFloat()
        ->and(round($consumption, 2))->toBe(round(52.0 / 600.0 * 100, 2));
});

// =============================================================================
// DÉTECTION CONSOMMATION ANORMALE
// =============================================================================

it('detects abnormal fuel consumption', function () {
    // Moyenne flotte : 9 L/100km
    // Consommation actuelle : 11 L/100km → +22% → alerte (seuil 20%)

    $isAbnormal = $this->service->isAbnormalConsumption(
        currentLper100: 11.0,
        averageLper100: 9.0,
        thresholdPercent: 20.0,
    );

    expect($isAbnormal)->toBeTrue();
});

it('does not flag normal fuel consumption', function () {
    // Moyenne : 9 L/100km, actuel : 9.5 L/100km → +5.5% → pas d'alerte

    $isAbnormal = $this->service->isAbnormalConsumption(
        currentLper100: 9.5,
        averageLper100: 9.0,
        thresholdPercent: 20.0,
    );

    expect($isAbnormal)->toBeFalse();
});
