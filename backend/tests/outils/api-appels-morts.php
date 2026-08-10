<?php
/**
 * Quels appels d'API du frontend tombent sur un 404 ?
 *
 * Les tentatives précédentes partaient des fichiers de routes non chargés et
 * cherchaient si le frontend « mentionnait » quelque chose. Trois inférences
 * successives, trois résultats faux : 117, puis 33, puis 36 — et une
 * vérification a montré que le frontend n'appelait même pas ces chemins.
 *
 * On part donc de la seule source fiable : les URL LITTÉRALEMENT écrites dans
 * le code frontend. On les dispatche dans l'application et on lit le code de
 * retour. Aucune inférence.
 *
 * Seul 404 compte. 403 ou 422 signifient que la route existe.
 */
require '/var/www/secretis/backend/vendor/autoload.php';
$app = require_once '/var/www/secretis/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

$u = User::where('email', 'superadmin@ibigsoft.com')->first();
Auth::login($u);

$urls = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(
    '/var/www/secretis/frontend/resources/js', FilesystemIterator::SKIP_DOTS
));

foreach ($it as $f) {
    if (! preg_match('/\.(jsx?|tsx?)$/', $f->getFilename())) {
        continue;
    }

    $src = file_get_contents($f->getPathname());

    // Chaînes commençant par /api/ — guillemets simples, doubles ou gabarits.
    preg_match_all('#[\'"`](/api/[^\'"`\s]*)[\'"`]#', $src, $m);

    foreach ($m[1] as $url) {
        // Interpolations `${...}` -> un identifiant plausible.
        $propre = preg_replace('#\$\{[^}]*\}#', '1', $url);
        $propre = preg_replace('#\{[^}]*\}#', '1', $propre);
        $propre = explode('?', $propre)[0];
        $propre = rtrim($propre, '/');

        if ($propre === '' || str_contains($propre, '$')) {
            continue;
        }

        $urls[$propre][] = basename($f->getPathname());
    }
}

ksort($urls);
$quatreCentQuatre = [];

foreach ($urls as $url => $fichiers) {
    $trouve = false;

    foreach (['GET', 'POST', 'PUT', 'DELETE'] as $methode) {
        try {
            $req = Request::create($url, $methode);
            $req->setUserResolver(fn () => $u);
            $code = app()->handle($req)->getStatusCode();
        } catch (\Throwable $e) {
            $code = 500;
        }

        if ($code !== 404 && $code !== 405) {
            $trouve = true;
            break;
        }
    }

    if (! $trouve) {
        $quatreCentQuatre[$url] = array_unique($fichiers);
    }
}

printf("URL d'API distinctes ecrites dans le frontend : %d\n", count($urls));
printf("Celles qui n'existent sous AUCUNE methode      : %d\n\n", count($quatreCentQuatre));

foreach ($quatreCentQuatre as $url => $fichiers) {
    printf("  %-52s %s\n", $url, implode(', ', array_slice($fichiers, 0, 2)));
}
