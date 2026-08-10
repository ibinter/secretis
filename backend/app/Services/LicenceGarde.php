<?php

namespace App\Services;

use App\Exceptions\DroitFermeException;
use App\Models\User;

/**
 * LicenceGarde — application des DROITS de licence aux points d'entrée métier.
 *
 * Ce n'est pas un second moteur : toute décision est déléguée à
 * `LicenceService::peut()`. La classe n'existe que pour éviter que chaque
 * contrôleur réécrive la même paire « si le droit est fermé, refuser avec un
 * texte à moi » — c'est ainsi qu'on se retrouve avec huit formulations
 * différentes pour un même refus.
 *
 * Règle 3 du brief : masquer un bouton n'empêche personne d'appeler l'API. Le
 * contrôle vit ici, côté serveur, au point d'entrée.
 */
class LicenceGarde
{
    public function __construct(private LicenceService $licence) {}

    /** Le droit est-il ouvert pour l'espace courant (ou celui donné) ? */
    public function autorise(string $droit, int|User|null $cible = null): bool
    {
        $orgId = $this->organisation($cible);

        if ($orgId === null) {
            // Pas d'espace identifiable : on ne bloque pas ce qu'on ne sait pas
            // rattacher. Les points d'entrée non authentifiés sont hors sujet.
            return true;
        }

        return $this->licence->peut($orgId, $droit);
    }

    /**
     * Exige un droit, ou refuse proprement.
     *
     * @throws DroitFermeException
     */
    public function exiger(string $droit, int|User|null $cible = null): void
    {
        if (! $this->autorise($droit, $cible)) {
            throw new DroitFermeException($droit);
        }
    }

    /** L'espace du superadmin IBIG n'est pas soumis à sa propre licence client. */
    public function estEditeur(?User $user): bool
    {
        return $user !== null
            && method_exists($user, 'hasAnyRole')
            && $user->hasAnyRole(['super_admin', 'superadmin']);
    }

    private function organisation(int|User|null $cible): ?int
    {
        if (is_int($cible)) {
            return $cible ?: null;
        }

        $user = $cible ?? auth()->user();

        if ($this->estEditeur($user)) {
            return null;
        }

        $orgId = $user?->organization_id;

        return $orgId ? (int) $orgId : null;
    }
}
