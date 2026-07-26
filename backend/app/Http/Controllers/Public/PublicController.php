<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\OfferToken;
use App\Services\NewsletterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Throwable;

/**
 * PublicController — Pages et endpoints publics SECRETIS
 *
 * Routes (sans middleware auth) :
 *   GET  /offer/accepted/{token}    → page Inertia confirmation d'offre acceptée
 *   POST /api/public/demo-request   → demande de démonstration
 *   POST /api/public/newsletter     → inscription newsletter
 */
class PublicController extends Controller
{
    public function __construct(
        private readonly NewsletterService $newsletter,
    ) {}

    // =========================================================================
    // Pages Inertia publiques
    // =========================================================================

    /**
     * Page de confirmation après acceptation d'une offre commerciale.
     *
     * GET /offer/accepted/{token}
     *
     * Le token est signé côté SuperAdmin CRM lors de l'envoi de l'offre.
     * On n'affiche que des données non-sensibles via le token.
     */
    public function offerAccepted(string $token): InertiaResponse
    {
        // Chercher l'offre associée au token (table offer_tokens ou champ sur la table offers)
        $offer = OfferToken::with('offer:id,prospect_name,plan_name,amount,currency,valid_until')
            ->where('token', $token)
            ->where('expires_at', '>', now())
            ->first();

        if (! $offer) {
            return Inertia::render('Public/OfferExpired');
        }

        return Inertia::render('Public/OfferAccepted', [
            'prospect' => $offer->offer?->prospect_name ?? 'votre organisation',
            'plan'     => $offer->offer?->plan_name     ?? 'SECRETIS Pro',
            'amount'   => $offer->offer?->amount        ?? null,
            'currency' => $offer->offer?->currency      ?? 'XOF',
        ]);
    }

    // =========================================================================
    // API publique — sans auth
    // =========================================================================

    /**
     * Soumettre une demande de démonstration.
     *
     * POST /api/public/demo-request
     *
     * Corps attendu :
     *  - name         string  Nom complet du demandeur
     *  - email        string  Email professionnel
     *  - company      string  Nom de l'organisation
     *  - phone        string  (optionnel)
     *  - country      string  (optionnel)
     *  - team_size    string  Taille de l'équipe (optionnel)
     *  - message      string  Message libre (optionnel)
     *  - preferred_date date  Date souhaitée (optionnel)
     */
    public function demoRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:150',
            'email'          => 'required|email:rfc,dns|max:255',
            'company'        => 'required|string|max:200',
            'phone'          => 'sometimes|string|max:30',
            'country'        => 'sometimes|string|max:100',
            'team_size'      => 'sometimes|string|max:50',
            'message'        => 'sometimes|string|max:2000',
            'preferred_date' => 'sometimes|date|after:today',
        ]);

        try {
            // Enregistrer la demande en base (table demo_requests)
            $demo = \DB::table('demo_requests')->insertGetId([
                'name'           => $validated['name'],
                'email'          => $validated['email'],
                'company'        => $validated['company'],
                'phone'          => $validated['phone']          ?? null,
                'country'        => $validated['country']        ?? null,
                'team_size'      => $validated['team_size']      ?? null,
                'message'        => $validated['message']        ?? null,
                'preferred_date' => $validated['preferred_date'] ?? null,
                'status'         => 'pending',
                'source'         => $request->header('Referer') ?? 'direct',
                'ip_address'     => $request->ip(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            // Notifier l'équipe commerciale SuperAdmin
            if (config('mail.superadmin_email')) {
                Mail::raw(
                    "Nouvelle demande de démo :\n\n"
                    . "Nom : {$validated['name']}\n"
                    . "Email : {$validated['email']}\n"
                    . "Société : {$validated['company']}\n"
                    . "Message : " . ($validated['message'] ?? '—'),
                    fn ($m) => $m->to(config('mail.superadmin_email'))
                                 ->subject('[SECRETIS] Nouvelle demande de démo')
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Votre demande a bien été reçue. Notre équipe vous contactera dans les 24 heures.',
                'ref'     => $demo,
            ], 201);
        } catch (Throwable $e) {
            Log::error('demo_request_failed', ['error' => $e->getMessage(), 'email' => $validated['email']]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement.',
            ], 500);
        }
    }

    /**
     * Inscription à la newsletter SECRETIS.
     *
     * POST /api/public/newsletter
     *
     * Corps attendu :
     *  - email  string  Adresse email
     *  - source string  (optionnel) page d'origine
     */
    public function newsletter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'  => 'required|email:rfc,dns|max:255',
            'source' => 'sometimes|string|max:100',
        ]);

        try {
            $this->newsletter->subscribe(
                email:  $validated['email'],
                source: $validated['source'] ?? $request->header('Referer') ?? 'api',
            );

            return response()->json([
                'success' => true,
                'message' => 'Merci ! Vous êtes bien inscrit(e) à la newsletter SECRETIS.',
            ], 201);
        } catch (\App\Exceptions\AlreadySubscribedException) {
            return response()->json([
                'success' => true,
                'message' => 'Cette adresse est déjà inscrite à notre newsletter.',
            ]);
        } catch (Throwable $e) {
            Log::error('newsletter_subscribe_failed', [
                'error' => $e->getMessage(),
                'email' => $validated['email'],
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de votre inscription.',
            ], 500);
        }
    }
}
