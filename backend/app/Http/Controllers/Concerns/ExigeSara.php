<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use App\Services\Sara\SaraLicence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Fermeture serveur de SARA — cahier IBIG SOFT v1.1, section 12.5.2.
 *
 * Ce contrôle vit dans le contrôleur plutôt que dans un middleware de route
 * pour une raison précise : les routes SARA sont éparpillées dans
 * routes/api.php et routes/web.php, deux fichiers que ce chantier n'a pas le
 * droit de modifier. Un garde posé sur une seule des deux surfaces n'en est pas
 * un. Posé ici, il protège toutes les routes existantes, présentes et futures,
 * ainsi que tout appel direct au contrôleur.
 *
 * Il s'exécute AVANT la construction du contexte et AVANT tout appel réseau :
 * un refus ne doit consommer aucun jeton.
 */
trait ExigeSara
{
    /**
     * Retourne une réponse de refus si SARA n'est pas ouverte, sinon null.
     *
     * Usage : `if ($refus = $this->refusSiSaraFermee($request)) { return $refus; }`
     */
    protected function refusSiSaraFermee(Request $request): JsonResponse|\Illuminate\Http\RedirectResponse|null
    {
        $sara = app(SaraLicence::class);
        $user = $request->user();

        if ($sara->autorisee($user)) {
            return null;
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json($sara->refus($user), 403);
        }

        return redirect('/abonnement')->with('error', $sara->messageIndisponible($user));
    }

    /** Le service licence de SARA, pour le court-circuit et le filtre. */
    protected function saraLicence(): SaraLicence
    {
        return app(SaraLicence::class);
    }
}
