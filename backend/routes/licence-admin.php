<?php
/*
 * NOTE DE RACCORDEMENT — collision de noms résolue au montage.
 *
 * Ce fichier visait `superadmin/licences` sous le nom `superadmin.licences.*`.
 * Or `routes/web.php` déclare DÉJÀ six routes sous ces noms, servies par
 * `SuperAdminLicenseController` — la console historique. Laravel refuse deux
 * routes portant le même nom : `route:cache` échouait, donc TOUTE la
 * production serait tombée au premier déploiement.
 *
 * Monté ici sous `superadmin/licences-etats`. Les deux consoles coexistent
 * donc, ce qui est une incohérence assumée et temporaire : la console
 * historique crée des licences sans passer par le moteur à six états, ce que
 * la section 12.6 interdit. Sa dépose change des URL existantes — c'est une
 * décision d'exploitation, pas un détail technique, et elle est signalée
 * plutôt que prise ici.
 */

use App\Http\Controllers\SuperAdmin\LicencesController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CONSOLE SUPERADMIN — LICENCES (cahier IBIG SOFT v1.1, section 12.6)
|--------------------------------------------------------------------------
|
| RACCORDEMENT — ce fichier n'est chargé nulle part.
| `routes/web.php` n'a pas été touché (plusieurs chantiers y travaillent en
| parallèle). Pour l'activer, une seule ligne à ajouter dans le fournisseur de
| routes, ou en fin de `routes/web.php` :
|
|     require __DIR__ . '/licence-admin.php';
|
| PROTECTION — identique au groupe `superadmin` existant de `routes/web.php` :
|
|     auth:sanctum · verified · license · tenant · throttle:web · role:super_admin
|
| Le middleware `license` est bien présent malgré l'apparent paradoxe d'une
| console de licences protégée par un contrôle de licence : `CheckLicense`
| laisse passer les rôles `super_admin` / `superadmin` sans vérification. Un
| superadmin dont l'espace serait expiré garde donc accès à la console — ce qui
| est précisément le moment où il en a besoin.
|
| Le préfixe d'URL est `superadmin/licences` et les noms de routes commencent
| par `superadmin.licences.` : la console reste rangée avec le reste de
| l'administration centrale, sans collision avec les routes existantes
| `superadmin.organisations.*`.
|
*/

Route::middleware([
    'auth:sanctum',
    'verified',
    'license',
    'tenant',
    'throttle:web',
    'role:super_admin',
])
    ->prefix('superadmin/licences-etats')
    ->name('superadmin.licences-etats.')
    ->group(function () {

        // ------------------------------------------------------------------
        // Consultation
        // ------------------------------------------------------------------

        // Tableau de bord : répartition des 6 états, conversion essai → payant,
        // espaces à l'échéance, alerte commerciale, incohérences.
        Route::get('/', [LicencesController::class, 'index'])->name('index');

        // Fiche d'un espace : quotas, journal des transitions, actions.
        Route::get('/{organisation}', [LicencesController::class, 'show'])
            ->whereNumber('organisation')
            ->name('show');

        // ------------------------------------------------------------------
        // Actions (section 12.6)
        // ------------------------------------------------------------------
        //
        // Aucune route ne permet :
        //   - de créer une licence sans date de fin — la date est calculée à
        //     partir de la formule, jamais transmise ;
        //   - de fixer une durée d'essai au cas par cas — aucune route
        //     n'accepte de durée, et `refuserChampsImposes()` rejette en 422
        //     toute requête qui en porterait une ;
        //   - de relever un plafond individuellement — il n'existe aucune
        //     route de quota en écriture ; passer à une formule est le seul
        //     chemin ;
        //   - de supprimer un espace sans journalisation ni sauvegarde froide
        //     — la purge exige les deux, et n'efface rien elle-même.

        Route::post('/{organisation}/essai', [LicencesController::class, 'demarrerEssai'])
            ->whereNumber('organisation')
            ->name('essai');

        Route::post('/{organisation}/prolongation', [LicencesController::class, 'prolonger'])
            ->whereNumber('organisation')
            ->name('prolongation');

        Route::post('/{organisation}/activation', [LicencesController::class, 'activer'])
            ->whereNumber('organisation')
            ->name('activation');

        Route::get('/{organisation}/export', [LicencesController::class, 'exporter'])
            ->whereNumber('organisation')
            ->name('export');

        Route::post('/{organisation}/purge', [LicencesController::class, 'purger'])
            ->whereNumber('organisation')
            ->name('purge');
    });
