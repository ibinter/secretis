<?php

namespace App\Http\Controllers;

use App\Services\MicrosoftAuthService;
use App\Services\OutlookCalendarService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * OutlookController — Endpoints de l'intégration Outlook Calendar
 *
 * Routes :
 *   GET  /integrations/outlook/auth          → Redirige vers Microsoft OAuth2
 *   GET  /integrations/outlook/callback      → Traite le retour OAuth2
 *   POST /integrations/outlook/sync          → Synchronise les calendriers
 *   DELETE /integrations/outlook/disconnect  → Déconnecte le compte Microsoft
 *   GET  /integrations/outlook/availability  → Créneaux disponibles d'un utilisateur
 */
class OutlookController extends Controller
{
    public function __construct(
        private readonly MicrosoftAuthService    $authService,
        private readonly OutlookCalendarService  $calendarService
    ) {}

    // -------------------------------------------------------------------------
    // OAuth2 — Initiation
    // -------------------------------------------------------------------------

    /**
     * Redirige l'utilisateur vers la page d'autorisation Microsoft.
     *
     * GET /integrations/outlook/auth
     */
    public function auth(Request $request): RedirectResponse
    {
        $user     = Auth::user();
        $scopes   = $request->input('scopes', MicrosoftAuthService::AVAILABLE_SCOPES);

        // Valider les scopes demandés
        $validScopes = array_intersect($scopes, MicrosoftAuthService::AVAILABLE_SCOPES);

        $authUrl = $this->authService->getAuthUrl($user->id, $validScopes);

        return redirect()->away($authUrl);
    }

    // -------------------------------------------------------------------------
    // OAuth2 — Callback
    // -------------------------------------------------------------------------

    /**
     * Traite le callback OAuth2 de Microsoft.
     *
     * GET /integrations/outlook/callback?code=...&state=...
     */
    public function callback(Request $request): RedirectResponse
    {
        // Vérifier si Microsoft a retourné une erreur
        if ($request->has('error')) {
            $error       = $request->input('error');
            $description = $request->input('error_description', 'Erreur inconnue');

            Log::warning('OutlookController: Erreur callback OAuth2 Microsoft', [
                'error'       => $error,
                'description' => $description,
                'user_id'     => Auth::id(),
            ]);

            return redirect()->route('parametres.microsoft365')
                ->with('error', "Connexion Microsoft refusée : {$description}");
        }

        $code  = $request->input('code');
        $state = $request->input('state');

        if (! $code || ! $state) {
            return redirect()->route('parametres.microsoft365')
                ->with('error', 'Paramètres OAuth2 manquants dans la réponse Microsoft.');
        }

        try {
            $this->authService->handleCallback($code, $state);

            return redirect()->route('parametres.microsoft365')
                ->with('success', 'Compte Microsoft connecté avec succès !');
        } catch (\RuntimeException $e) {
            Log::error('OutlookController: Échec callback OAuth2', [
                'error'   => $e->getMessage(),
                'user_id' => Auth::id(),
            ]);

            return redirect()->route('parametres.microsoft365')
                ->with('error', $e->getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Synchronisation
    // -------------------------------------------------------------------------

    /**
     * Synchronise le calendrier Outlook de l'utilisateur connecté.
     *
     * POST /integrations/outlook/sync
     *
     * @return JsonResponse { imported: int, message: string }
     */
    public function sync(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user->microsoft_access_token) {
            return response()->json([
                'error' => 'Aucun compte Microsoft connecté. Veuillez vous connecter d\'abord.',
            ], 422);
        }

        try {
            $imported = $this->calendarService->syncFromOutlook($user);

            return response()->json([
                'success'  => true,
                'imported' => count($imported),
                'message'  => count($imported) . ' événement(s) importé(s) depuis Outlook.',
            ]);
        } catch (\RuntimeException $e) {
            Log::error('OutlookController: Échec synchronisation', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Échec de la synchronisation : ' . $e->getMessage(),
            ], 500);
        }
    }

    // -------------------------------------------------------------------------
    // Déconnexion
    // -------------------------------------------------------------------------

    /**
     * Révoque les tokens Microsoft et déconnecte le compte.
     *
     * DELETE /integrations/outlook/disconnect
     */
    public function disconnect(): JsonResponse
    {
        $user = Auth::user();

        $this->authService->disconnect($user);

        return response()->json([
            'success' => true,
            'message' => 'Compte Microsoft déconnecté avec succès.',
        ]);
    }

    // -------------------------------------------------------------------------
    // Disponibilité — Free/Busy
    // -------------------------------------------------------------------------

    /**
     * Retourne les créneaux disponibles d'un ou plusieurs utilisateurs.
     *
     * GET /integrations/outlook/availability
     *
     * Paramètres :
     *   - date      : Date au format YYYY-MM-DD (défaut: aujourd'hui)
     *   - user_ids  : IDs des utilisateurs SECRETIS (tableau, défaut: utilisateur courant)
     *   - start_at  : Début de période ISO 8601 (alternatif à date)
     *   - end_at    : Fin de période ISO 8601 (alternatif à date)
     *
     * @return JsonResponse { availability: { userId: [slots] } }
     */
    public function availability(Request $request): JsonResponse
    {
        $request->validate([
            'date'      => 'nullable|date',
            'user_ids'  => 'nullable|array',
            'user_ids.*'=> 'integer',
            'start_at'  => 'nullable|date',
            'end_at'    => 'nullable|date',
        ]);

        $currentUser = Auth::user();

        // Déterminer les utilisateurs à interroger
        $userIds = $request->input('user_ids', [$currentUser->id]);
        $users   = \App\Models\User::whereIn('id', $userIds)
            ->where('organization_id', $currentUser->organization_id)
            ->get();

        // Déterminer la plage temporelle
        if ($request->filled('start_at') && $request->filled('end_at')) {
            $start = Carbon::parse($request->input('start_at'));
            $end   = Carbon::parse($request->input('end_at'));
        } else {
            $date  = $request->filled('date')
                ? Carbon::parse($request->input('date'))
                : Carbon::today();
            $start = $date->copy()->startOfDay();
            $end   = $date->copy()->endOfDay();
        }

        $availability = [];

        foreach ($users as $user) {
            if (! $user->microsoft_access_token) {
                $availability[$user->id] = ['error' => 'Compte Microsoft non connecté'];
                continue;
            }

            try {
                $slots = $this->calendarService->getAvailableSlots($user, $start);
                $availability[$user->id] = [
                    'name'   => $user->name,
                    'email'  => $user->microsoft_email ?? $user->email,
                    'slots'  => $slots,
                ];
            } catch (\Throwable $e) {
                $availability[$user->id] = ['error' => $e->getMessage()];
            }
        }

        return response()->json([
            'availability' => $availability,
            'period'       => [
                'start' => $start->toIso8601String(),
                'end'   => $end->toIso8601String(),
            ],
        ]);
    }
}
