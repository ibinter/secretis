<?php

declare(strict_types=1);

namespace App\Services\Sara;

use App\Services\LicenceService;

/**
 * Point d'entrée unique de la surface 6 (SARA) sur la licence.
 * Cahier IBIG SOFT v1.1, section 12.5.
 *
 * Les contrôleurs SARA n'ont besoin que de trois gestes, dans cet ordre :
 *
 *   1. autorisee()     — SARA a-t-elle le droit d'exister pour cet appelant ?
 *   2. courtCircuit()  — la question relève-t-elle de la licence ? Si oui, elle
 *                        n'atteint jamais le modèle : l'outil répond seul.
 *   3. filtrer()       — tout ce qui sort du modèle est relu avant diffusion.
 *
 * L'ORDRE N'EST PAS DÉCORATIF
 * Le contrôle d'autorisation vient EN PREMIER, avant toute construction de
 * contexte et avant tout appel réseau. Chaque appel au fournisseur d'IA coûte
 * de l'argent réel (section 3.4) : masquer la bulle côté client sans fermer
 * l'API laisse une facture ouverte à quiconque connaît l'URL.
 */
class SaraLicence
{
    public function __construct(
        private LicenceService $licence,
        private OutilLicence $outil,
        private GardeFouLicence $gardeFou,
    ) {
    }

    // ─── 1. Autorisation ────────────────────────────────────────────────────

    /**
     * SARA est-elle ouverte pour cet appelant ?
     *
     * Le droit `sara` de LicenceService::droits() fait foi, et lui seul. La
     * table des droits ferme SARA en DEMO, en FREE et en EXPIRED.
     *
     * UN APPELANT NON AUTHENTIFIÉ N'EST PAS UN CAS PARTICULIER : il est au
     * mieux en Démo publique, où SARA est fermée. On refuse donc, au lieu de
     * laisser une porte ouverte sur un service facturé au jeton.
     *
     * @param object|null $user L'utilisateur authentifié, ou null.
     */
    public function autorisee(?object $user): bool
    {
        $orgId = $user->organization_id ?? null;

        if (! $user || ! $orgId) {
            return false;
        }

        try {
            return $this->licence->peut((int) $orgId, 'sara');
        } catch (\Throwable $e) {
            // Un moteur de licence en défaut ne doit pas ouvrir SARA par accident.
            report($e);
            return false;
        }
    }

    /** L'état courant, pour l'expliquer à l'appelant sans le deviner. */
    public function etat(?object $user): ?string
    {
        $orgId = $user->organization_id ?? null;

        if (! $user || ! $orgId) {
            return null;
        }

        try {
            return $this->licence->etat((int) $orgId);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Message officiel affiché quand SARA est fermée.
     * Aucun terme banni, aucun chiffre non lu dans la configuration.
     */
    public function messageIndisponible(?object $user = null): string
    {
        $config  = $this->licence->config();
        $gratuit = $config['gratuit']['nom'] ?? '';
        $etat    = $this->etat($user);

        if ($etat === 'EXPIRED') {
            return sprintf(
                "L'assistant IA SARA n'est pas ouvert lorsque l'abonnement est échu. "
                . "Vos données restent consultables en %s. Activez une %s pour rouvrir SARA.",
                mb_strtolower($config['glossaire']['lecture_seule'] ?? 'Lecture seule'),
                mb_strtolower($config['glossaire']['formule'] ?? 'Formule')
            );
        }

        return sprintf(
            "L'assistant IA SARA fait partie de l'%s et des %ss payantes. "
            . "Il n'est pas ouvert au palier %s ni en %s. "
            . "Toutes les autres fonctions de %s restent à votre disposition.",
            $config['glossaire']['essai'] ?? 'Essai',
            mb_strtolower($config['glossaire']['formule'] ?? 'Formule'),
            $gratuit,
            mb_strtolower($config['glossaire']['demo_publique'] ?? 'Démo publique'),
            $this->licence->nomSolution()
        );
    }

    /** Charge utile JSON du refus, forme stable pour tous les points d'appel. */
    public function refus(?object $user = null): array
    {
        return [
            'success'  => false,
            'error'    => 'sara_indisponible',
            'droit'    => 'sara',
            'etat'     => $this->etat($user),
            'message'  => $this->messageIndisponible($user),
            'response' => $this->messageIndisponible($user),
            'reply'    => $this->messageIndisponible($user),
        ];
    }

    // ─── 2. Court-circuit licence ───────────────────────────────────────────

    /**
     * Réponse déterministe à une question de licence, ou null.
     *
     * Quand cette méthode retourne un texte, AUCUN appel au fournisseur d'IA
     * n'a lieu. C'est la garantie la plus forte du chantier : sur les dix
     * questions de la section 12.9, le modèle n'a pas voix au chapitre.
     */
    public function courtCircuit(string $question): ?array
    {
        $reponse = $this->outil->repondre($question);

        if ($reponse === null) {
            return null;
        }

        // La fiche passe elle aussi par le filtre : si un jour une fiche mal
        // générée contenait un terme banni, elle serait retenue comme le reste.
        $filtre = $this->gardeFou->filtrer($reponse['reponse'], $question);

        return [
            'reponse' => $filtre['reponse'],
            'cle'     => $reponse['cle'],
            'source'  => $reponse['source'],
            'certain' => $reponse['certain'] && $filtre['sur'],
            'motifs'  => $filtre['motifs'],
        ];
    }

    // ─── 3. Filtre de sortie ────────────────────────────────────────────────

    /** Relit une réponse du modèle avant diffusion. */
    public function filtrer(string $reponse, string $question = ''): string
    {
        return $this->gardeFou->filtrer($reponse, $question)['reponse'];
    }

    // ─── Invite système ─────────────────────────────────────────────────────

    public function invite(): string
    {
        return $this->outil->invite();
    }

    public function outil(): OutilLicence
    {
        return $this->outil;
    }
}
