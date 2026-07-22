<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Services\FleetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * GpsWebhookController — Réception des données GPS des trackers
 *
 * Supporte :
 *  - Traccar  (HTTP GET/POST JSON) via /fleet/gps-webhook/traccar
 *  - Wialon   (format propre)       via /fleet/gps-webhook/wialon
 *  - Generic  (JSON standard)       via /fleet/gps-webhook
 *
 * Authentification : token unique par device (colonne gps_device_id + token dans header X-Device-Token)
 */
class GpsWebhookController extends Controller
{
    public function __construct(
        private readonly FleetService $fleet,
    ) {}

    // =========================================================================
    // WEBHOOK GÉNÉRIQUE
    // =========================================================================

    /**
     * POST /fleet/gps-webhook
     * Header : X-Device-Token: <token>
     * Body JSON : { device_id, lat, lng, speed, heading, altitude, accuracy, engine_on, fuel_percent, odometer, timestamp }
     */
    public function generic(Request $request): JsonResponse
    {
        $token   = $request->header('X-Device-Token') ?? $request->query('token');
        $vehicle = $this->resolveVehicleByToken($token);

        if (!$vehicle) {
            Log::warning('GPS Webhook: token invalide', ['token' => substr($token ?? '', 0, 12)]);
            return response()->json(['error' => 'Device non autorisé'], 401);
        }

        $data = $request->all();

        $this->processPosition($vehicle, [
            'lat'        => $data['lat'] ?? $data['latitude'] ?? null,
            'lng'        => $data['lng'] ?? $data['longitude'] ?? null,
            'speed'      => $data['speed'] ?? $data['speed_kmh'] ?? 0,
            'heading'    => $data['heading'] ?? $data['course'] ?? 0,
            'altitude'   => $data['altitude'] ?? 0,
            'accuracy'   => $data['accuracy'] ?? 0,
            'engine_on'  => (bool) ($data['engine_on'] ?? $data['ignition'] ?? false),
            'fuel_percent'=> $data['fuel_percent'] ?? $data['fuel_level'] ?? null,
            'odometer'   => $data['odometer'] ?? $data['odometer_km'] ?? null,
            'recorded_at'=> isset($data['timestamp'])
                ? date('Y-m-d H:i:s', (int) $data['timestamp'])
                : now()->toDateTimeString(),
            'source'     => 'gps_device',
        ]);

        return response()->json(['status' => 'ok']);
    }

    // =========================================================================
    // WEBHOOK TRACCAR
    // =========================================================================

    /**
     * POST /fleet/gps-webhook/traccar
     *
     * Traccar envoie les événements en HTTP POST avec JSON.
     * Ref : https://www.traccar.org/api-reference/#tag/Events
     *
     * Body : { deviceId, position: { latitude, longitude, speed, course, altitude, accuracy, attributes: { ignition, fuel, odometer } } }
     */
    public function traccar(Request $request): JsonResponse
    {
        $payload = $request->all();

        // Traccar peut envoyer le deviceId comme identifiant interne ou IMEI
        $deviceId = $payload['deviceId'] ?? $payload['device']['uniqueId'] ?? null;

        if (!$deviceId) {
            return response()->json(['error' => 'deviceId manquant'], 422);
        }

        $vehicle = Vehicle::where('gps_device_id', $deviceId)->first();

        if (!$vehicle) {
            Log::debug("GPS Traccar: device inconnu {$deviceId}");
            return response()->json(['status' => 'ignored']);
        }

        $position   = $payload['position'] ?? $payload;
        $attributes = $position['attributes'] ?? [];

        $this->processPosition($vehicle, [
            'lat'         => $position['latitude'] ?? null,
            'lng'         => $position['longitude'] ?? null,
            'speed'       => isset($position['speed']) ? round($position['speed'] * 1.852, 1) : 0, // knots → km/h
            'heading'     => $position['course'] ?? $position['heading'] ?? 0,
            'altitude'    => $position['altitude'] ?? 0,
            'accuracy'    => $position['accuracy'] ?? 0,
            'engine_on'   => (bool) ($attributes['ignition'] ?? false),
            'fuel_percent'=> isset($attributes['fuel1Level']) ? (int) $attributes['fuel1Level'] : null,
            'odometer'    => isset($attributes['odometer']) ? (int) ($attributes['odometer'] / 1000) : null, // mètres → km
            'recorded_at' => isset($position['deviceTime'])
                ? date('Y-m-d H:i:s', strtotime($position['deviceTime']))
                : now()->toDateTimeString(),
            'source'      => 'gps_device',
        ]);

        return response()->json(['status' => 'ok']);
    }

    // =========================================================================
    // WEBHOOK WIALON
    // =========================================================================

    /**
     * POST /fleet/gps-webhook/wialon
     *
     * Wialon envoie des notifications via webhooks configurés dans l'interface.
     * Le format varie selon la configuration ; ici on supporte le format SDK Wialon Hosting.
     *
     * Body : { unit_id, pos: { x (lng), y (lat), s (speed km/h), c (course) }, p: { ... params } }
     */
    public function wialon(Request $request): JsonResponse
    {
        $payload = $request->all();

        // Authentification Wialon via token dans le header ou param
        $token   = $request->header('X-Wialon-Token') ?? $request->query('token');
        $vehicle = $this->resolveVehicleByToken($token);

        if (!$vehicle) {
            // Fallback : résolution par unit_id (ID Wialon stocké dans gps_device_id)
            $unitId  = $payload['unit_id'] ?? $payload['unit']['id'] ?? null;
            $vehicle = $unitId ? Vehicle::where('gps_device_id', (string) $unitId)->first() : null;
        }

        if (!$vehicle) {
            return response()->json(['error' => 'Unité non reconnue'], 401);
        }

        $pos    = $payload['pos'] ?? [];
        $params = $payload['p'] ?? $payload['params'] ?? [];

        $this->processPosition($vehicle, [
            'lat'         => $pos['y'] ?? null,  // Wialon : y = latitude
            'lng'         => $pos['x'] ?? null,  // Wialon : x = longitude
            'speed'       => $pos['s'] ?? 0,
            'heading'     => $pos['c'] ?? 0,
            'altitude'    => $pos['z'] ?? 0,
            'accuracy'    => 0,
            'engine_on'   => (bool) ($params['engine_on'] ?? $params['ignition'] ?? false),
            'fuel_percent'=> $params['fuel_percent'] ?? null,
            'odometer'    => isset($params['mileage']) ? (int) $params['mileage'] : null,
            'recorded_at' => isset($payload['t'])
                ? date('Y-m-d H:i:s', (int) $payload['t'])
                : now()->toDateTimeString(),
            'source'      => 'gps_device',
        ]);

        return response()->json(['status' => 'ok']);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Traite une position GPS, valide les données et délègue au FleetService.
     */
    private function processPosition(Vehicle $vehicle, array $data): void
    {
        if (!isset($data['lat'], $data['lng'])) {
            Log::warning("GPS Webhook: coordonnées manquantes pour vehicle #{$vehicle->id}");
            return;
        }

        // Validation des coordonnées
        $lat = (float) $data['lat'];
        $lng = (float) $data['lng'];

        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            Log::warning("GPS Webhook: coordonnées invalides lat={$lat} lng={$lng}");
            return;
        }

        try {
            $this->fleet->logGpsPosition($vehicle->id, $data);
        } catch (\Throwable $e) {
            Log::error("GPS Webhook: erreur traitement position", [
                'vehicle_id' => $vehicle->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * Résout un véhicule depuis un token de device.
     * On stocke le token dans le champ gps_device_id sous la forme "TOKEN:xxxx"
     * ou dans un cache Redis/DB si la sécurité l'exige.
     *
     * Architecture simple : gps_provider = custom, gps_device_id = token
     */
    private function resolveVehicleByToken(?string $token): ?Vehicle
    {
        if (!$token) return null;
        return Vehicle::where('gps_device_id', $token)->first();
    }
}
