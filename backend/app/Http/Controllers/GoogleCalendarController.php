<?php

namespace App\Http\Controllers;

use App\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * GoogleCalendarController — Endpoints OAuth2 et synchronisation Google Calendar.
 *
 * Routes :
 *   GET  /integrations/google/auth       → redirige vers Google OAuth
 *   GET  /integrations/google/callback   → traite le retour OAuth
 *   POST /integrations/google/sync       → synchronisation manuelle
 *   DELETE /integrations/google/disconnect → révoque les tokens
 */
class GoogleCalendarController extends Controller
{
    public function __construct(
        private readonly GoogleCalendarService $googleCalendar
    ) {}

    // -------------------------------------------------------------------------
    // GET /integrations/google/auth
    // -------------------------------------------------------------------------

    /**
     * Redirige l'utilisateur vers la page d'autorisation Google OAuth2.
     */
    public function redirectToGoogle(Request $request): RedirectResponse
    {
        $userId = $request->user()->id;

        $url = $this->googleCalendar->getAuthUrl($userId);

        // Stocker le user_id en session pour le callback
        $request->session()->put('google_oauth_user_id', $userId);

        return redirect()->away($url);
    }

    // -------------------------------------------------------------------------
    // GET /integrations/google/callback
    // -------------------------------------------------------------------------

    /**
     * Traite le retour OAuth2 de Google.
     * En cas de succès : redirige vers les paramètres avec message de succès.
     * En cas d'erreur : redirige avec message d'erreur.
     */
    public function handleCallback(Request $request): RedirectResponse
    {
        // Vérification que l'utilisateur n'a pas refusé
        if ($request->has('error')) {
            Log::warning('Google Calendar OAuth refusé', [
                'error'   => $request->get('error'),
                'user_id' => $request->session()->get('google_oauth_user_id'),
            ]);

            return redirect()->route('parametres.integrations')
                ->with('error', 'Connexion Google Calendar refusée.');
        }

        $code   = $request->get('code');
        $userId = $request->session()->pull('google_oauth_user_id');

        if (! $code || ! $userId) {
            return redirect()->route('parametres.integrations')
                ->with('error', 'Paramètres OAuth invalides.');
        }

        try {
            $this->googleCalendar->handleCallback($code, $userId);

            return redirect()->route('parametres.integrations')
                ->with('success', 'Google Calendar connecté avec succès !');
        } catch (\Exception $e) {
            Log::error('Erreur callback Google Calendar', [
                'user_id' => $userId,
                'error'   => $e->getMessage(),
            ]);

            return redirect()->route('parametres.integrations')
                ->with('error', 'Erreur de connexion Google Calendar : ' . $e->getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // POST /integrations/google/sync
    // -------------------------------------------------------------------------

    /**
     * Synchronisation manuelle bidirectionnelle.
     * Importe d'abord depuis Google, puis pousse les événements locaux non synchronisés.
     */
    public function sync(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->google_calendar_token) {
            return response()->json([
                'success' => false,
                'message' => 'Google Calendar non connecté.',
            ], 422);
        }

        try {
            // Import depuis Google (priorité Google en cas de conflit)
            $imported = $this->googleCalendar->syncFromGoogle($user->id);

            return response()->json([
                'success'        => true,
                'message'        => 'Synchronisation réussie.',
                'imported_count' => count($imported),
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur synchronisation Google Calendar', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la synchronisation : ' . $e->getMessage(),
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // DELETE /integrations/google/disconnect
    // -------------------------------------------------------------------------

    /**
     * Révoque les tokens Google et supprime la liaison.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $user = $request->user();

        try {
            $this->googleCalendar->disconnect($user);

            return response()->json([
                'success' => true,
                'message' => 'Google Calendar déconnecté.',
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur déconnexion Google Calendar', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la déconnexion.',
            ], 500);
        }
    }
}
