<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Sara\SaraLicence;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ferme SARA côté serveur quand le droit `sara` n'est pas ouvert.
 * Cahier IBIG SOFT v1.1, section 12.5.2 (dernier point) et section 3.4.
 *
 * Le droit `sara` de LicenceService::droits() fait foi : DEMO, FREE et EXPIRED
 * le refusent. Masquer la bulle côté client ne suffirait pas — l'API resterait
 * appelable, et chaque appel au fournisseur d'IA coûte de l'argent réel.
 *
 * ENREGISTREMENT
 * Ce middleware n'a pas d'alias : bootstrap/app.php ne m'appartient pas sur ce
 * chantier. Il s'utilise par son nom de classe complet dans un groupe de
 * routes, comme dans routes/licence-sara.php. Les routes SARA déjà écrites dans
 * routes/api.php et routes/web.php sont fermées à la source, dans les
 * contrôleurs (trait ExigeSara), ce qui protège aussi tout appel direct au
 * contrôleur.
 */
class SaraAutorisee
{
    public function __construct(private SaraLicence $sara)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->sara->autorisee($request->user())) {
            return $next($request);
        }

        $user = $request->user();

        if ($request->expectsJson()) {
            return response()->json($this->sara->refus($user), 403);
        }

        return redirect()
            ->route('abonnement.index')
            ->with('error', $this->sara->messageIndisponible($user));
    }
}
