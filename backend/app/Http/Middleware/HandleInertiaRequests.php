<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return "1.0.0";
    }

    public function share(Request $request): array
    {
        $user = Auth::user();

        return array_merge(parent::share($request), [
            'auth' => [
                'user' => $user ? [
                    'id'              => $user->id,
                    'name'            => $user->name,
                    'email'           => $user->email,
                    'role'            => $user->role ?? null,
                    'organization_id' => $user->organization_id ?? null,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
            ],

            // Droits de licence utiles à l'affichage. CALCULÉS CÔTÉ SERVEUR à
            // chaque requête : le navigateur ne fait que recevoir, il ne décide
            // rien. Masquer la bulle SARA sans le droit ne ferme pas l'API —
            // c'est pourquoi le trait ExigeSara la ferme aussi côté contrôleur.
            'licence' => fn () => $this->licence($request),
        ]);
    }

    /**
     * L'état de licence partagé avec l'interface.
     *
     * PRODUCTEUR UNIQUE de la prop `licence`. Deux middlewares la produisaient
     * auparavant, sous deux formes différentes, et l'ordre d'exécution
     * décidait de celle qui arrivait au navigateur.
     *
     * L'état est CALCULÉ CÔTÉ SERVEUR à chaque requête : le navigateur reçoit,
     * il ne décide rien. Masquer un bouton ne ferme pas une API — les droits
     * sont aussi appliqués dans la couche métier.
     */
    private function licence(Request $request): array
    {
        $user = Auth::user();

        try {
            $moteur = app(\App\Services\LicenceService::class);

            // L'offre est publique : la page d'inscription et la grille
            // tarifaire s'affichent SANS utilisateur connecté et ont besoin de
            // la durée d'essai. Sans cela elles la réécrivaient en dur — c'est
            // exactement ainsi que le dépôt s'est mis à annoncer deux durées
            // différentes selon la page.
            $offre = [
                'solution'         => $moteur->solution(),
                'nom'              => $moteur->nomSolution(),
                'essai_jours'      => $moteur->essaiJours(),
                'grace_jours'      => $moteur->graceJours(),
                'retention_jours'  => $moteur->retentionJours(),
                'palier'           => $moteur->config()['gratuit'] ?? [],
                'formule_suivante' => $moteur->formuleSuivante(),
                'filigrane'        => $moteur->filigrane(),
            ];

            if (! $user || ! ($user->organization_id ?? null)) {
                return ['etat' => null, 'droits' => null, 'offre' => $offre];
            }

            return $moteur->etatComplet((int) $user->organization_id) + ['offre' => $offre];
        } catch (\Throwable $e) {
            // Un moteur en défaut ne doit rien ouvrir par accident : sans
            // droits, l'interface ferme tout ce qui est conditionnel.
            report($e);

            return ['etat' => null, 'droits' => null, 'offre' => null];
        }
    }
}
