<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * UserPreferenceController — Préférences de l'utilisateur courant
 *
 * Persiste le thème / l'apparence (colonne JSON `preferences`) et la langue
 * (colonne `locale`) de l'utilisateur authentifié.
 *
 * Pas d'org-scoping : il s'agit toujours de l'utilisateur lui-même (Auth::user()).
 */
class UserPreferenceController extends Controller
{
    /**
     * Locales supportées par le frontend (voir hooks/useTranslation.js).
     * On valide contre cette liste plutôt que fr/en seulement pour ne pas
     * casser le multilingue déjà en place.
     */
    private const SUPPORTED_LOCALES = [
        'fr', 'en', 'ar', 'ar-MA', 'ar-TN', 'pt-BR', 'pt-ST', 'pt-MZ', 'sw', 'ha',
    ];

    private const VALID_THEMES = ['light', 'dark', 'system'];

    /**
     * GET /api/user/preferences
     * Retourne les préférences UI de l'utilisateur.
     */
    public function getPreferences(Request $request): JsonResponse
    {
        $user        = $request->user();
        $preferences = $this->normalizePreferences($user->preferences ?? []);

        return response()->json([
            'preferences' => $preferences,
            'theme'       => $preferences['theme'] ?? null,
            'locale'      => $user->locale,
        ]);
    }

    /**
     * PUT/PATCH /api/user/preferences  (et PUT /api/profile/preferences)
     * Valide et fusionne les préférences UI. Accepte aussi `locale`
     * (utilisé par LanguageSwitcher via /api/profile/preferences).
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'theme'        => ['sometimes', 'nullable', Rule::in(self::VALID_THEMES)],
            'accent_color' => ['sometimes', 'nullable', 'string', 'max:32'],
            'font_size'    => ['sometimes', 'nullable', 'string', 'max:32'],
            'density'      => ['sometimes', 'nullable', 'string', 'max:32'],
            'locale'       => ['sometimes', 'nullable', Rule::in(self::SUPPORTED_LOCALES)],
            // Bac à sable libre pour d'autres préférences UI éventuelles.
            'preferences'  => ['sometimes', 'array'],
        ]);

        // Si une locale est fournie via cet endpoint, on la persiste sur la colonne.
        if (array_key_exists('locale', $validated) && $validated['locale'] !== null) {
            $user->locale = $validated['locale'];
        }

        // Fusion des préférences UI existantes avec les nouvelles valeurs.
        $current = $this->normalizePreferences($user->preferences ?? []);

        $incoming = array_filter(
            [
                'theme'        => $validated['theme']        ?? null,
                'accent_color' => $validated['accent_color'] ?? null,
                'font_size'    => $validated['font_size']    ?? null,
                'density'      => $validated['density']      ?? null,
            ],
            static fn ($v) => $v !== null,
        );

        // Bloc `preferences` explicite (fusion profonde de premier niveau).
        if (! empty($validated['preferences'])) {
            $incoming = array_merge($incoming, $validated['preferences']);
        }

        $user->preferences = array_merge($current, $incoming);
        $user->save();

        $preferences = $this->normalizePreferences($user->preferences);

        return response()->json([
            'message'     => 'Préférences enregistrées.',
            'preferences' => $preferences,
            'theme'       => $preferences['theme'] ?? null,
            'locale'      => $user->locale,
        ]);
    }

    /**
     * GET /api/user/locale
     * Retourne la langue de l'utilisateur.
     */
    public function getLocale(Request $request): JsonResponse
    {
        return response()->json([
            'locale' => $request->user()->locale,
        ]);
    }

    /**
     * PUT/PATCH /api/user/locale
     * Valide et enregistre la langue.
     */
    public function updateLocale(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'locale' => ['required', Rule::in(self::SUPPORTED_LOCALES)],
        ]);

        $user->locale = $validated['locale'];
        $user->save();

        return response()->json([
            'message' => 'Langue enregistrée.',
            'locale'  => $user->locale,
        ]);
    }

    /**
     * Garantit un tableau associatif (la colonne peut contenir null,
     * une chaîne JSON, ou déjà un tableau selon le cast).
     */
    private function normalizePreferences(mixed $preferences): array
    {
        if (is_string($preferences)) {
            $decoded = json_decode($preferences, true);

            return is_array($decoded) ? $decoded : [];
        }

        return is_array($preferences) ? $preferences : [];
    }
}
