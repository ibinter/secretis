<?php

declare(strict_types=1);

use App\Http\Controllers\Api\LicenceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API de licence — cahier IBIG SOFT v1.1, section 9.4
|--------------------------------------------------------------------------
|
| RACCORDEMENT — À FAIRE PAR LE CHANTIER CENTRAL, PAS ICI.
| Ce fichier n'est chargé par personne tant qu'une ligne n'a pas été ajoutée
| au PREMIER NIVEAU de routes/api.php (hors de tout groupe `prefix`) :
|
|     require __DIR__ . '/licence-api.php';
|
| Placé ainsi, le préfixe `/api` posé par bootstrap/app.php s'applique et les
| chemins obtenus sont exactement ceux de la section 9.4 :
|
|     GET  /api/licence/etat
|     POST /api/licence/verifier
|     POST /api/licence/essai
|     POST /api/licence/activer
|     GET  /api/quotas/{compteur}
|     POST /api/paiement/callback
|
| Ces chemins ne sont volontairement PAS versionnés en `/api/v1` : le cahier
| les fixe sans version, et une instance on-premise déjà installée ne saura
| jamais qu'on a changé de préfixe.
|
| Après raccordement sur le serveur : `php8.3 artisan route:cache` — sans quoi
| le cache de routes fige l'ancienne table et ces routes restent introuvables.
|
|--------------------------------------------------------------------------
| Ce que chaque groupe protège
|--------------------------------------------------------------------------
|
| 1. Routes authentifiées (auth:sanctum) — l'espace vient de l'utilisateur
|    connecté, jamais du corps de la requête (section 9.8).
|
| 2. POST /licence/verifier — PUBLIQUE, et c'est délibéré : elle sert aux
|    instances on-premise (section 9.7), qui n'ont pas de session sur cette
|    instance. Elle ne divulgue rien à qui ne détient pas déjà une clé, et ne
|    modifie rien. Débit bridé pour rendre le balayage de clés inintéressant.
|
| 3. POST /paiement/callback — PUBLIQUE, sécurité entièrement portée par la
|    signature HMAC (`X-Licence-Signature`, comparaison en temps constant).
|    Aucune session : une passerelle ne s'authentifie pas.
|
| Les fenêtres de débit ci-dessous sont des garde-fous techniques, pas des
| règles de licence : aucune durée ni plafond métier n'apparaît dans ce
| fichier, ils vivent tous dans config/licence.config.json.
*/

Route::middleware('auth:sanctum')->group(function () {

    // Appelé au chargement de l'application et toutes les 15 minutes : la
    // fenêtre doit tolérer plusieurs onglets ouverts sur le même compte.
    Route::get('/licence/etat', [LicenceController::class, 'etat'])
        ->middleware('throttle:60,1')
        ->name('licence.etat');

    Route::post('/licence/essai', [LicenceController::class, 'essai'])
        ->middleware('throttle:5,1')
        ->name('licence.essai');

    Route::post('/licence/activer', [LicenceController::class, 'activer'])
        ->middleware('throttle:10,1')
        ->name('licence.activer');

    Route::get('/quotas/{compteur}', [LicenceController::class, 'quota'])
        ->where('compteur', '[a-z0-9_]+')
        ->middleware('throttle:60,1')
        ->name('licence.quota');
});

// Vérification de clé — publique, on-premise (section 9.7).
Route::post('/licence/verifier', [LicenceController::class, 'verifier'])
    ->middleware('throttle:20,1')
    ->name('licence.verifier');

// Webhook passerelle — signature HMAC obligatoire (section 9.4).
Route::post('/paiement/callback', [LicenceController::class, 'callbackPaiement'])
    ->middleware('throttle:30,1')
    ->name('licence.paiement.callback');
