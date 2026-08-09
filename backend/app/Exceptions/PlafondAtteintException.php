<?php

namespace App\Exceptions;

use App\Services\LicenceService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Plafond du palier Découverte atteint (cahier IBIG SOFT v1.1, section 3.7).
 *
 * Levée depuis la COUCHE MÉTIER, avant l'écriture. Elle porte le texte officiel
 * de la section 8.5, produit par `LicenceService::messageRefus()` : le message
 * n'est jamais réécrit au point d'appel, sans quoi une formulation varierait
 * d'un écran à l'autre et donnerait l'impression de règles qui varient.
 *
 * L'exception se rend elle-même : Laravel appelle `render()` s'il la trouve.
 * Cela évite de toucher au `withExceptions()` de bootstrap/app.php, fichier
 * partagé par plusieurs chantiers.
 */
class PlafondAtteintException extends \RuntimeException
{
    public function __construct(
        public readonly string $compteur,
        ?string $message = null,
    ) {
        parent::__construct($message ?? app(LicenceService::class)->messageRefus($compteur));
    }

    public function render(Request $request): Response
    {
        $licence = app(LicenceService::class);
        $orgId   = (int) ($request->user()?->organization_id ?? 0);

        $charge = [
            'message' => $this->getMessage(),
            'quota'   => $orgId ? $licence->quota($orgId, $this->compteur) : null,
            // Le message « propose » autant qu'il « interdit » : la formule
            // immédiatement supérieure accompagne toujours le refus (8.5).
            'formule_suivante' => $licence->formuleSuivante(),
        ];

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json($charge, 403);
        }

        return back()
            ->withInput()
            ->withErrors(['plafond' => $this->getMessage()])
            ->with('error', $this->getMessage())
            ->with('licence_plafond', $charge);
    }
}
