<?php

namespace App\Http\Middleware;

use App\Services\LicenceService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * CheckLicense — contrôle d'accès par état de licence.
 *
 * CE MIDDLEWARE PRÉCÉDAIT LE MODÈLE À SIX ÉTATS, et le contredisait sur trois
 * points qui rendaient le palier Découverte inutilisable :
 *
 *  1. UN ESPACE SANS LICENCE ÉTAIT RENVOYÉ VERS L'ÉCRAN D'EXPIRATION, y compris
 *     en LECTURE (« Aucune licence active »). Or un espace Découverte n'a
 *     précisément pas de licence payante : tout le palier gratuit était donc
 *     fermé avant d'avoir servi. La section 2 interdit explicitement « tout
 *     blocage sec en écriture ET en lecture ».
 *
 *  2. IL LISAIT `status === 'grace'`, valeur qui n'existe dans aucune
 *     énumération du projet (`trial|active|suspended|expired|cancelled`). Cette
 *     branche n'a jamais pu s'exécuter ; la période de grâce n'était honorée
 *     que par la seconde branche, plus bas, avec une durée tirée d'une
 *     configuration différente de celle du cahier.
 *
 *  3. LA DURÉE DE GRÂCE VENAIT DE `config('payment.grace_period_days', 7)`,
 *     une seconde source de vérité concurrente de licence.config.json.
 *
 * Il ne décide donc plus rien par lui-même : l'état vient du moteur, qui est
 * la seule autorité. Ce middleware ne fait plus qu'appliquer une règle simple —
 * la lecture reste ouverte partout, l'écriture se ferme en lecture seule.
 */
class CheckLicense
{
    /** Méthodes qui ne modifient rien. La lecture n'est jamais refusée. */
    private const LECTURE = ['GET', 'HEAD', 'OPTIONS'];

    /**
     * Chemins qui restent ouverts même en lecture seule.
     *
     * Fermer le paiement à un espace échu en ferait une impasse : l'utilisateur
     * ne pourrait plus payer pour en sortir. C'est la première chose à laisser
     * ouverte, pas la dernière.
     */
    private const TOUJOURS_OUVERTS = [
        'abonnement', 'subscription', 'payment', 'paiement',
        'licence', 'logout', 'deconnexion', 'superadmin',
        'profil', 'profile', 'notifications',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        // Super-admin de l'éditeur : jamais soumis à la licence. Sans cette
        // exception, l'expiration d'un espace fermerait la console qui sert à
        // la corriger.
        if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['super_admin', 'superadmin'])) {
            return $next($request);
        }

        $orgId = $user->organization_id;

        if (! $orgId) {
            return $next($request);   // parcours d'inscription
        }

        // La lecture reste ouverte, quel que soit l'état. Toujours.
        if (in_array($request->method(), self::LECTURE, true)) {
            return $next($request);
        }

        if ($this->cheminToujoursOuvert($request)) {
            return $next($request);
        }

        $licence = app(LicenceService::class);
        $etat    = $licence->etat($orgId);

        if ($licence->droits($etat)['ecriture'] ?? true) {
            return $next($request);
        }

        return $this->refuserEcriture($request, $licence, $etat);
    }

    private function cheminToujoursOuvert(Request $request): bool
    {
        $chemin = ltrim($request->path(), '/');

        foreach (self::TOUJOURS_OUVERTS as $prefixe) {
            if ($chemin === $prefixe || str_starts_with($chemin, $prefixe . '/')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Refus d'écriture en lecture seule.
     *
     * Le message vient du moteur : il dit jusqu'à quand les données sont
     * conservées. On n'écrit ni « compte suspendu », ni « accès révoqué », ni
     * « données supprimées » — trois termes bannis par le glossaire, et trois
     * façons de faire croire à une perte qui n'a pas lieu.
     */
    private function refuserEcriture(Request $request, LicenceService $licence, string $etat): Response
    {
        $message = $licence->etatComplet($request->user()->organization_id)['message']
            ?? 'Votre espace est en lecture seule. Vos données sont conservées.';

        if ($request->expectsJson()) {
            return response()->json([
                'error'   => $message,
                'code'    => 'ETAT_LECTURE_SEULE',
                'etat'    => $etat,
                'action'  => 'voir_les_formules',
            ], 403);
        }

        return back()->withErrors(['licence' => $message]);
    }
}
