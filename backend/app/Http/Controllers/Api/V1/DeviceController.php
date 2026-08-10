<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * Gestion des appareils mobiles pour les push notifications.
 *
 * @OA\Tag(name="Devices", description="Enregistrement des appareils pour les notifications push")
 */
class DeviceController extends ApiController
{
    /**
     * Enregistrer ou mettre à jour un appareil (upsert par device_id).
     *
     * @OA\Post(
     *     path="/devices",
     *     tags={"Devices"},
     *     summary="Enregistrer un appareil mobile",
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"device_id", "platform"},
     *             @OA\Property(property="device_id",   type="string", example="ios_1720000000_abc123"),
     *             @OA\Property(property="platform",    type="string", enum={"ios","android","web"}),
     *             @OA\Property(property="push_token",  type="string", example="ExponentPushToken[xxxx]"),
     *             @OA\Property(property="model",       type="string", example="iPhone 15 Pro"),
     *             @OA\Property(property="os_version",  type="string", example="iOS 17.4"),
     *             @OA\Property(property="app_version", type="string", example="2.0.0"),
     *         )
     *     ),
     *     @OA\Response(response=200, description="Appareil enregistré / mis à jour"),
     *     @OA\Response(response=422, description="Données invalides"),
     * )
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_id'   => ['required', 'string', 'max:255'],
            'platform'    => ['required', Rule::in(['ios', 'android', 'web'])],
            'push_token'  => ['nullable', 'string', 'max:512'],
            'model'       => ['nullable', 'string', 'max:255'],
            'os_version'  => ['nullable', 'string', 'max:100'],
            'app_version' => ['nullable', 'string', 'max:50'],
        ]);

        $device = Device::updateOrCreate(
            [
                'device_id' => $validated['device_id'],
            ],
            [
                'user_id'      => Auth::id(),
                'platform'     => $validated['platform'],
                'push_token'   => $validated['push_token'] ?? null,
                'model'        => $validated['model'] ?? null,
                'os_version'   => $validated['os_version'] ?? null,
                'app_version'  => $validated['app_version'] ?? null,
                'last_seen_at' => now(),
                'is_active'    => true,
            ],
        );

        return $this->success(
            data: [
                'id'        => $device->id,
                'device_id' => $device->device_id,
                'platform'  => $device->platform,
            ],
            message: 'Appareil enregistré avec succès.',
        );
    }

    /**
     * Désactiver un appareil (soft delete via is_active = false).
     *
     * @OA\Delete(
     *     path="/devices/{device_id}",
     *     tags={"Devices"},
     *     summary="Désenregistrer un appareil mobile",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="device_id",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(response=200, description="Appareil désactivé"),
     *     @OA\Response(response=404, description="Appareil introuvable"),
     * )
     */
    public function unregister(Request $request, string $deviceId): JsonResponse
    {
        $device = Device::where('device_id', $deviceId)
            ->where('user_id', Auth::id())
            ->first();

        if (! $device) {
            return $this->notFound('Appareil');
        }

        $device->update([
            'is_active'  => false,
            'push_token' => null,
        ]);

        return $this->noContent('Appareil désenregistré avec succès.');
    }

    /**
     * Liste les appareils actifs de l'utilisateur courant.
     *
     * @OA\Get(
     *     path="/devices",
     *     tags={"Devices"},
     *     summary="Lister les appareils de l'utilisateur",
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Liste des appareils"),
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $devices = Device::where('user_id', Auth::id())
            ->where('is_active', true)
            ->orderByDesc('last_seen_at')
            ->get(['id', 'device_id', 'platform', 'model', 'os_version', 'app_version', 'last_seen_at']);

        return $this->success($devices, 'Appareils récupérés.');
    }
}
