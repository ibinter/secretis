# Base de recette

## Pourquoi elle n'existait pas

`phpunit.xml` laissait `DB_CONNECTION` et `DB_DATABASE` **en commentaire**. Les
tests visaient donc la base indiquée par `.env` — c'est-à-dire `secretis_prod`.
Le premier test utilisant `RefreshDatabase` aurait effacé la production.

C'est pourquoi aucun test « Feature » n'avait jamais été exécuté : il n'y avait
pas de manière sûre de le faire.

## Mise en place

```bash
createdb -O secretis_db secretis_test
DB_DATABASE=secretis_test php artisan migrate --force
```

C'est tout. `phpunit.xml` déclare désormais la base explicitement, avec
`force="true"` pour qu'aucune variable d'environnement déjà posée — y compris
celle qui désigne la production — ne puisse l'emporter.

**PostgreSQL est obligatoire, SQLite ne convient pas.** Les migrations
contiennent du PostgreSQL explicite : `ALTER TABLE … NOT VALID`, des fonctions
et déclencheurs PL/pgSQL, `ON CONFLICT … RETURNING`. Une recette sur SQLite ne
testerait pas le schéma réellement déployé — elle testerait une approximation,
et donnerait le pire des résultats : un rapport vert sans valeur.

## Le garde-fou

`tests/TestCase.php` refuse de démarrer si la base visée porte `prod`,
`production` ou `live` dans son nom, ou si elle ne porte ni `test` ni `recette`.

Il **arrête** la suite au lieu de la sauter : un test ignoré passe inaperçu dans
un rapport vert, un test en échec ne passe pas inaperçu.

Vérifié :

```
$ DB_DATABASE=secretis_prod vendor/bin/phpunit
REFUS D'EXÉCUTION : les tests visent la base « secretis_prod »,
dont le nom désigne un environnement de production.
```

## État de la suite

```
OK (41 tests, 298 assertions)
```

- `tests/Unit/Licence/DocumentsJuridiquesTest` — les documents juridiques ne
  contiennent aucune durée ni aucun plafond en dur.
- `tests/Feature/Licence/TransitionsEtatsTest` — les neuf transitions d'état,
  les interdits, et l'absence de licence perpétuelle.
- `tests/Feature/Licence/PlafondCourriersTest` — le plafond du palier
  Découverte, à l'écriture.

## Ce que la base de recette a trouvé dès le premier passage

Deux contraintes qui rendaient une **installation neuve inutilisable**, sans
que rien ne le laisse voir en production — parce que la production les avait
relâchées à la main, il y a longtemps, sans que le dépôt en sache rien.

1. `users.first_name` et `users.last_name` étaient `NOT NULL` alors que le code
   n'écrit que `name`. Créer le moindre utilisateur était impossible.
2. `licenses.ends_at` était `NOT NULL` alors que le modèle à six états exige
   qu'il soit nul pour DEMO et FREE. **Le palier Découverte n'aurait pas pu
   exister.** C'était un défaut de mon propre travail sur la licence, invisible
   tant qu'on ne reconstruisait pas la base.

C'est la raison d'être de cet environnement : trouver ce qui dépend de
l'historique d'une base plutôt que de ce que le dépôt décrit.

## Ce qui reste connu

**75 colonnes** sont `NOT NULL` selon les migrations et nullables en
production, sans valeur par défaut. Elles n'ont pas été traitées en bloc, et
c'est délibéré : pour la plupart la contrainte est **juste**
(`purchase_requests.organization_id` doit être obligatoire) et c'est la
production qui est laxiste. Les relâcher toutes dégraderait le schéma pour
faire taire un écart.

Chacune demande de savoir ce que le code y écrit réellement. Le script
`comparer-nullabilite.php` produit la liste.

Aucune ne bloque la suite actuelle. Elles se manifesteront au fur et à mesure
que la couverture s'étendra — ce qui est la bonne façon de les découvrir : une
par une, avec un test qui dit laquelle.
