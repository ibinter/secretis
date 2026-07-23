<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserPrivacyConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * PrivacyController — Gestion des consentements cookies RGPD.
 *
 * Routes attendues (à ajouter dans routes/api.php sous le groupe auth):
 *   POST   /api/v1/privacy/consent  → saveConsent
 *   GET    /api/v1/privacy/consent  → getConsent
 */
class PrivacyController extends Controller
{
    /**
     * Enregistre (ou met à jour) les préférences de consentement de l'utilisateur.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function saveConsent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'categories'             => 'required|array',
            'categories.preferences' => 'sometimes|boolean',
            'categories.statistics'  => 'sometimes|boolean',
            'categories.marketing'   => 'sometimes|boolean',
            'categories.ai_sara'     => 'sometimes|boolean',
        ]);

        $categories = $validated['categories'];

        UserPrivacyConsent::updateOrCreate(
            ['user_id' => Auth::id()],
            [
                'preferences' => (bool) ($categories['preferences'] ?? false),
                'statistics'  => (bool) ($categories['statistics']  ?? false),
                'marketing'   => (bool) ($categories['marketing']   ?? false),
                'ai_sara'     => (bool) ($categories['ai_sara']     ?? false),
                'consented_at' => now(),
                'ip_address'  => $request->ip(),
            ]
        );

        return response()->json([
            'message' => 'Préférences enregistrées',
        ]);
    }

    /**
     * Retourne les préférences de consentement de l'utilisateur courant.
     *
     * @return JsonResponse
     */
    public function getConsent(): JsonResponse
    {
        $consent = UserPrivacyConsent::where('user_id', Auth::id())->first();

        if (! $consent) {
            return response()->json([
                'categories' => [
                    'necessary'   => true,
                    'preferences' => false,
                    'statistics'  => false,
                    'marketing'   => false,
                    'ai_sara'     => false,
                ],
                'consented_at' => null,
            ]);
        }

        return response()->json([
            'categories' => [
                'necessary'   => true,
                'preferences' => (bool) $consent->preferences,
                'statistics'  => (bool) $consent->statistics,
                'marketing'   => (bool) $consent->marketing,
                'ai_sara'     => (bool) $consent->ai_sara,
            ],
            'consented_at' => $consent->consented_at?->toIso8601String(),
        ]);
    }
}
