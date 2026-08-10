<?php

namespace App\Exceptions;

use App\Services\LicenceService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Droit fermé par l'état de licence (cahier IBIG SOFT v1.1, sections 3.3 et 3.4).
 *
 * Export, API, multi-utilisateur, WhatsApp/SMS, SARA : ce sont les leviers de
 * conversion du palier Découverte. Ils ne sont pas « cassés », ils sont fermés,
 * et la nuance doit s'entendre dans le message : on explique CE QUI est fermé,
 * POURQUOI les données ne sont pas perdues, et COMMENT rouvrir.
 *
 * L'exception se rend elle-même, pour ne pas avoir à toucher au
 * `withExceptions()` de bootstrap/app.php.
 */
class DroitFermeException extends \RuntimeException
{
    public function __construct(
        public readonly string $droit,
        ?string $message = null,
    ) {
        parent::__construct($message ?? self::texte($droit));
    }

    /**
     * Texte de refus : explique et propose, jamais seulement interdire.
     *
     * Aucun chiffre, aucune durée, aucun prix n'est écrit ici : le nom du
     * palier et celui de la formule supérieure viennent du moteur.
     */
    public static function texte(string $droit): string
    {
        $licence = app(LicenceService::class);
        $palier  = $licence->config()['gratuit']['nom'] ?? 'Découverte';
        $suivante = $licence->formuleSuivante()['nom'] ?? null;

        $quoi = match ($droit) {
            'export'            => "L'export CSV, Excel et PDF n'est pas ouvert au palier {$palier}.",
            'api'              => "L'API et les intégrations ne sont pas ouvertes au palier {$palier}.",
            'multi_utilisateur' => "Le multi-utilisateur et la gestion des rôles ne sont pas ouverts au palier {$palier}.",
            'whatsapp'          => "Les relances automatiques WhatsApp ne sont pas ouvertes au palier {$palier}.",
            'sms'               => "Les relances automatiques SMS ne sont pas ouvertes au palier {$palier}.",
            'sara'              => "L'assistant IA SARA n'est pas ouvert au palier {$palier}.",
            default             => "Cette fonction n'est pas ouverte au palier {$palier}.",
        };

        // Ce qui reste vrai dans tous les cas, et qu'il faut dire en premier
        // après le refus : rien n'est perdu.
        $rassure = match ($droit) {
            'export' => 'Vos données restent intégralement consultables à l\'écran, '
                . 'et une copie peut vous être transmise sur demande à support@ibigsoft.com.',
            default  => 'Vos données restent intégralement consultables et modifiables.',
        };

        $propose = $suivante
            ? "Pour l'ouvrir, activez la formule {$suivante}."
            : 'Pour l\'ouvrir, activez une formule payante.';

        return "{$quoi} {$rassure} {$propose}";
    }

    public function render(Request $request): Response
    {
        $orgId   = (int) ($request->user()?->organization_id ?? 0);
        $licence = app(LicenceService::class);

        $charge = [
            'message'          => $this->getMessage(),
            'droit'            => $this->droit,
            'licence'          => $orgId ? $licence->etatComplet($orgId) : null,
            'formule_suivante' => $licence->formuleSuivante(),
        ];

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json($charge, 403);
        }

        return back()
            ->withErrors(['licence' => $this->getMessage()])
            ->with('error', $this->getMessage())
            ->with('licence_droit', $charge);
    }
}
