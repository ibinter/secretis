<?php

namespace App\Http\Middleware;

use App\Services\LicenceService;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * EnforceLicence — application de l'état de licence à chaque requête web.
 *
 * Cahier IBIG SOFT v1.1 :
 *   · section 2   « l'état est calculé côté serveur à chaque requête ;
 *                   le client n'a jamais autorité »
 *   · section 9.8 « toute réponse d'API porte l'état courant ; le front s'y
 *                   conforme »
 *   · section 2   « tout blocage sec en écriture ET en lecture est interdit :
 *                   la lecture reste ouverte partout sauf après purge »
 *
 * Ce middleware fait donc exactement deux choses :
 *
 *  1. il partage l'état complet (`LicenceService::etatComplet()`) en prop
 *     Inertia `licence`, pour que le front n'ait jamais à le deviner ni à le
 *     mémoriser — rien de décisif ne vit dans `localStorage` ;
 *  2. il refuse l'ÉCRITURE (POST/PUT/PATCH/DELETE) quand l'état est EXPIRED.
 *
 * Il ne refuse JAMAIS une lecture, et il n'applique aucun plafond : les
 * plafonds se contrôlent dans la couche métier, à l'écriture, au plus près de
 * l'enregistrement (règle 3 du brief). Un middleware ne sait pas si la requête
 * qu'il laisse passer créera un courrier, dix, ou aucun.
 */
class EnforceLicence
{
    /** Méthodes considérées comme des écritures. */
    private const ECRITURES = ['POST', 'PUT', 'PATCH', 'DELETE'];

    /**
     * Chemins qui restent ouverts en écriture même en lecture seule.
     *
     * Un espace expiré doit pouvoir se déconnecter et surtout PAYER : fermer
     * le chemin du paiement à celui qui veut régulariser transformerait la
     * lecture seule en impasse, et le cahier interdit précisément l'impasse
     * (« EXPIRED -- paiement-> ACTIVE, restauration intégrale »).
     */
    private const CHEMINS_OUVERTS = [
        'logout',
        'abonnement',
        'abonnement/*',
        'payment',
        'payment/*',
        'paiement',
        'paiement/*',
        'subscription',
        'subscription/*',
        'licence',
        'licence/*',
        'license',
        'license/*',
        'superadmin',
        'superadmin/*',
        'api/licence/*',
        'api/paiement/*',
    ];

    public function __construct(private LicenceService $licence) {}

    public function handle(Request $request, Closure $next): Response
    {
        $orgId = $this->organisation($request);

        if ($orgId === null) {
            // Visiteur, onboarding, page publique : aucun espace, donc aucun
            // état à appliquer. On ne devine pas un état par défaut.
            return $next($request);
        }

        // 1. L'état voyage avec chaque réponse Inertia. Closure : évaluée
        //    uniquement quand une réponse Inertia est effectivement rendue.
        // Le partage de la prop `licence` a été RETIRÉ d'ici.
        //
        // Deux middlewares la produisaient : celui-ci via Inertia::share(), et
        // HandleInertiaRequests::share(). Le dernier exécuté écrasait l'autre,
        // et l'ordre d'exécution des middlewares décidait donc de la forme des
        // données reçues par le navigateur — tantôt l'état complet, tantôt un
        // sous-ensemble à plat. Un composant lisant `licence.droits.sara`
        // fonctionnait ou non selon la route.
        //
        // La prop a désormais un seul producteur : HandleInertiaRequests.
        // Ce middleware garde son rôle propre — refuser l'écriture.

        // 2. Lecture seule en EXPIRED — et uniquement en écriture.
        if (! $this->estUneEcriture($request) || $this->cheminOuvert($request)) {
            return $next($request);
        }

        $etat = $this->licence->etat($orgId);

        if (($this->licence->droits($etat)['ecriture'] ?? true) === true) {
            return $next($request);
        }

        return $this->refuser($request, $orgId);
    }

    /**
     * Réponse de refus.
     *
     * Le vocabulaire est celui du glossaire (section 12.3) : « lecture seule »,
     * jamais « compte bloqué » ni « accès révoqué ». Le message dit d'abord ce
     * qui est conservé, ensuite ce qui est fermé, enfin comment rouvrir.
     */
    private function refuser(Request $request, int $orgId): Response
    {
        $etat    = $this->licence->etatComplet($orgId);
        $message = trim(sprintf(
            '%s Vos données restent consultables et ne sont pas supprimées. '
            . 'Activez une formule pour enregistrer de nouveau.',
            $etat['message'] ?? 'Espace en lecture seule.'
        ));

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => $message,
                'licence' => $etat,
            ], 403);
        }

        return back()->withErrors(['licence' => $message])->with('error', $message);
    }

    private function estUneEcriture(Request $request): bool
    {
        return in_array($request->method(), self::ECRITURES, true);
    }

    private function cheminOuvert(Request $request): bool
    {
        return $request->is(self::CHEMINS_OUVERTS);
    }

    /**
     * Organisation courante. Lue sur l'utilisateur authentifié seulement :
     * une valeur d'organisation reçue du navigateur n'a aucune autorité.
     */
    private function organisation(Request $request): ?int
    {
        $orgId = $request->user()?->organization_id;

        return $orgId ? (int) $orgId : null;
    }
}
