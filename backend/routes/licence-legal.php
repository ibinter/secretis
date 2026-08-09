<?php

use App\Http\Controllers\LegalPagesController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| DOCUMENTS JURIDIQUES DE LICENCE (cahier IBIG SOFT v1.1, section 11)
|--------------------------------------------------------------------------
|
| RACCORDEMENT — ce fichier n'est chargé nulle part.
| `routes/web.php` n'a pas été touché (plusieurs chantiers y travaillent en
| parallèle). Pour l'activer, une seule ligne à ajouter en fin de
| `routes/web.php`, ou dans le fournisseur de routes :
|
|     require __DIR__ . '/licence-legal.php';
|
| CE QUI MANQUAIT
| ---------------
| `routes/web.php` expose déjà dix-huit pages juridiques, mais pas les
| CONDITIONS GÉNÉRALES DE VENTE : le slug `cgv` existe pourtant en base depuis
| `LegalPagesSeeder`, et c'est le document qui porte la période de grâce, le
| passage en lecture seule, l'absence de licence perpétuelle et la licence sur
| site à durée limitée (section 11.3). Il était engendré et stocké, mais
| inatteignable depuis un navigateur.
|
| Le seeder et la constante du contrôleur emploient par ailleurs deux slugs
| différents pour le même document de confidentialité — `politique-confidentialite`
| en base, `confidentialite` dans la constante. Les deux adresses sont exposées
| ici pour qu'aucune ne renvoie 404 selon que la base est peuplée ou non.
|
| PROTECTION — aucune : ce sont des documents publics, comme les dix-huit
| autres pages juridiques de `routes/web.php`. Un prospect doit pouvoir lire les
| CGV avant de créer un espace, et un client dont l'espace est en lecture seule
| doit pouvoir relire la politique de résiliation qui lui est appliquée.
|
| CONTENU — aucun de ces documents n'est écrit à la main : ils sont engendrés
| par `App\Support\LicenceDocuments` à partir de `config/licence.config.json`.
| Aucune durée, aucun plafond, aucun prix n'y est saisi.
|
*/

Route::get('/cgv', [LegalPagesController::class, 'show'])
    ->defaults('slug', 'cgv')
    ->name('legal.cgv');

Route::get('/politique-confidentialite', [LegalPagesController::class, 'show'])
    ->defaults('slug', 'politique-confidentialite')
    ->name('legal.politique-confidentialite');
