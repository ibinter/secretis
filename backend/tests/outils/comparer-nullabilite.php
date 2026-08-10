<?php
/**
 * Compare la NULLABILITÉ des colonnes entre la production et une base
 * reconstruite par les migrations.
 *
 * La convergence précédente comparait la PRÉSENCE des colonnes. Une colonne
 * présente des deux côtés mais NOT NULL d'un seul suffit pourtant à rendre une
 * installation neuve inutilisable : c'est le cas de `users.first_name`, qui
 * empêche la création du moindre utilisateur alors que le code n'écrit que
 * `name`.
 */
require '/var/www/secretis/backend/vendor/autoload.php';
$app = require_once '/var/www/secretis/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

config(['database.connections.recette' => array_merge(
    config('database.connections.pgsql'), ['database' => 'secretis_test']
)]);

$sql = "SELECT table_name, column_name, is_nullable, column_default
          FROM information_schema.columns WHERE table_schema='public'";

$prod = [];
foreach (DB::select($sql) as $c) {
    $prod[$c->table_name . '.' . $c->column_name] = $c;
}

$plusStrict = [];   // NOT NULL en base neuve, NULL en production
$plusLache  = [];   // l'inverse

foreach (DB::connection('recette')->select($sql) as $c) {
    $cle = $c->table_name . '.' . $c->column_name;

    if (! isset($prod[$cle])) {
        continue;
    }

    $p = $prod[$cle];

    if ($c->is_nullable === 'NO' && $p->is_nullable === 'YES') {
        // Une valeur par défaut rend la contrainte inoffensive à l'insertion.
        $plusStrict[] = $cle . ($c->column_default !== null ? '  (avec défaut)' : '');
    } elseif ($c->is_nullable === 'YES' && $p->is_nullable === 'NO') {
        $plusLache[] = $cle;
    }
}

printf("Colonnes NOT NULL en base neuve mais NULL en production : %d\n", count($plusStrict));
$sansDefaut = array_values(array_filter($plusStrict, fn ($c) => ! str_contains($c, 'défaut')));
printf("  dont SANS valeur par defaut (bloquantes a l'insertion) : %d\n\n", count($sansDefaut));

foreach (array_slice($sansDefaut, 0, 40) as $c) {
    echo "  - $c\n";
}
if (count($sansDefaut) > 40) {
    echo '  … et ' . (count($sansDefaut) - 40) . " autres\n";
}

printf("\nColonnes NULL en base neuve mais NOT NULL en production : %d\n", count($plusLache));
foreach (array_slice($plusLache, 0, 10) as $c) {
    echo "  + $c\n";
}

file_put_contents('/tmp/nullabilite.txt', implode("\n", $sansDefaut));
