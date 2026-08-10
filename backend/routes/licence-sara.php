<?php

declare(strict_types=1);

use App\Http\Middleware\SaraAutorisee;
use App\Services\Sara\BaseConnaissanceLicence;
use App\Services\Sara\SaraLicence;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/**
 * SURFACE 6 — SARA. Routes de la couche licence.
 * Cahier IBIG SOFT v1.1, section 12.5.
 *
 * RACCORDEMENT — À FAIRE PAR LE CHANTIER CENTRAL
 * Ce fichier n'est chargé nulle part : bootstrap/app.php, routes/web.php et
 * routes/api.php sont hors du périmètre de ce chantier. Pour l'activer, ajouter
 * dans bootstrap/app.php, à l'intérieur de `withRouting(then: ...)` :
 *
 *     Route::middleware('web')->group(base_path('routes/licence-sara.php'));
 *
 * Rien de ce qui est ici n'est indispensable à la fermeture de SARA : le droit
 * `sara` est déjà appliqué dans les contrôleurs (trait ExigeSara), donc sur les
 * routes existantes. Ces routes servent au diagnostic et à l'affichage.
 */

Route::middleware(['web', 'auth'])->prefix('api/licence/sara')->name('licence.sara.')->group(function () {

    /**
     * GET /api/licence/sara/etat
     *
     * Volontairement HORS du middleware SaraAutorisee : c'est la route que
     * l'interface interroge pour savoir s'il faut afficher SARA. La fermer
     * derrière le droit qu'elle sert à lire n'aurait pas de sens.
     * Elle ne consomme aucun jeton et ne divulgue rien de plus que l'état.
     */
    Route::get('/etat', function (Request $request, SaraLicence $sara) {
        $autorisee = $sara->autorisee($request->user());

        return response()->json([
            'autorisee' => $autorisee,
            'etat'      => $sara->etat($request->user()),
            'message'   => $autorisee ? null : $sara->messageIndisponible($request->user()),
        ]);
    })->name('etat');

    /**
     * POST /api/licence/sara/question
     *
     * Réponse déterministe à une question de licence, lue dans
     * licence.config.json. Aucun appel au fournisseur d'IA, donc aucun jeton
     * consommé — mais la route reste fermée par le droit `sara` : SARA ne doit
     * pas répondre là où elle ne doit pas s'afficher.
     */
    Route::post('/question', function (Request $request, SaraLicence $sara) {
        $valide = $request->validate([
            'question' => ['required', 'string', 'min:2', 'max:500'],
        ]);

        $fiche = $sara->courtCircuit($valide['question']);

        if ($fiche === null) {
            return response()->json([
                'licence'  => false,
                'reponse'  => null,
                'message'  => "Cette question ne relève pas de la licence.",
            ]);
        }

        return response()->json([
            'licence' => true,
            'reponse' => $fiche['reponse'],
            'fiche'   => $fiche['cle'],
            'source'  => $fiche['source'],
            'certain' => $fiche['certain'],
        ]);
    })->middleware(SaraAutorisee::class)->name('question');

    /**
     * GET /api/licence/sara/base
     *
     * Diagnostic : la base de connaissances est-elle à jour ? Une base périmée
     * ne sert plus aucune réponse (elle se vide d'elle-même), il faut donc
     * pouvoir la repérer sans attendre qu'un prospect s'en aperçoive.
     */
    Route::get('/base', function (BaseConnaissanceLicence $base) {
        $brut = $base->brut();

        return response()->json([
            'existe'      => $base->existe(),
            'perimee'     => $base->perimee(),
            'utilisable'  => $base->fiches() !== [],
            'fiches'      => count($base->fiches()),
            'genere_le'   => $brut['genere_le'] ?? null,
            'commande'    => 'php artisan sara:reindexer-licence',
        ]);
    })->name('base');
});
