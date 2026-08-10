<?php

namespace App\Services;

use Illuminate\Support\Facades\Auth;

/**
 * FiligraneService — décide, pour un espace donné, si un document généré doit
 * porter la mention de pied de page du cahier IBIG SOFT v1.1.
 *
 *   · section 3.5  « Tous les documents générés (factures, reçus, quittances,
 *                    bulletins, rapports, exports d'écran) portent en pied de
 *                    page : "Généré avec {SOLUTION} — ibigsoft.com" »
 *   · section 11.5 « … retiré automatiquement dès le premier paiement. »
 *
 * Trois règles gouvernent cette classe :
 *
 *  1. **Le texte n'est jamais écrit ici.** Il vient de
 *     `LicenceService::filigrane()`, qui le compose à partir de
 *     `licence.config.json`. Écrire « Généré avec Secretis ERP » quelque part
 *     serait un défaut même si la chaîne est juste aujourd'hui.
 *
 *  2. **Le droit fait foi, pas un réglage.** C'est `droits($etat)['filigrane']`
 *     qui décide, donc DEMO, Découverte et EXPIRED marquent, TRIAL / ACTIVE /
 *     GRACE ne marquent pas. Aucune case à cocher, aucune option
 *     d'organisation : le premier paiement bascule l'état, et le filigrane
 *     disparaît de lui-même à la génération suivante.
 *
 *  3. **L'organisation est déduite côté serveur.** Jamais d'un paramètre de
 *     requête. Soit le code appelant la fournit explicitement (services et
 *     files d'attente, où il n'y a pas d'utilisateur authentifié), soit elle
 *     est lue sur l'utilisateur connecté. Sans organisation identifiable —
 *     page publique, document de l'éditeur — il n'y a pas d'état à appliquer,
 *     donc pas de filigrane.
 */
class FiligraneService
{
    /**
     * Organisations imposées par le code appelant.
     *
     * Une pile, et non une simple valeur : la génération d'un PDF peut en
     * déclencher une autre (une facture jointe à un rapport), et restituer
     * « l'organisation précédente » est la seule façon de ne pas laisser fuir
     * le contexte d'un locataire sur le document d'un autre.
     *
     * @var list<int>
     */
    private array $pile = [];

    public function __construct(private LicenceService $licence) {}

    /** Impose l'organisation d'un document le temps d'un traitement. */
    public function empiler(int $orgId): void
    {
        $this->pile[] = $orgId;
    }

    public function depiler(): void
    {
        array_pop($this->pile);
    }

    /**
     * Exécute un traitement au nom d'une organisation précise.
     *
     * @template T
     * @param  callable():T $traitement
     * @return T
     */
    public function dans(int $orgId, callable $traitement): mixed
    {
        $this->empiler($orgId);

        try {
            return $traitement();
        } finally {
            $this->depiler();
        }
    }

    /**
     * Organisation à considérer : celle imposée, sinon celle de l'utilisateur
     * authentifié. Jamais une valeur reçue du navigateur.
     */
    public function organisation(?int $impose = null): ?int
    {
        if ($impose) {
            return $impose;
        }

        if ($this->pile !== []) {
            return $this->pile[array_key_last($this->pile)];
        }

        $orgId = Auth::user()?->organization_id;

        return $orgId ? (int) $orgId : null;
    }

    /** Le droit est-il ouvert pour cet espace ? */
    public function requis(?int $impose = null): bool
    {
        $orgId = $this->organisation($impose);

        if ($orgId === null) {
            return false;
        }

        return (bool) ($this->licence->droits($this->licence->etat($orgId))['filigrane'] ?? false);
    }

    /**
     * Texte à apposer, ou null si l'espace en est dispensé.
     *
     * C'est la seule méthode que les points de génération appellent.
     */
    public function texte(?int $impose = null): ?string
    {
        return $this->requis($impose) ? $this->licence->filigrane() : null;
    }
}
