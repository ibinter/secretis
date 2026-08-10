<?php

declare(strict_types=1);

namespace App\Services\Sara;

use Illuminate\Support\Facades\Log;

/**
 * FILTRE DE SORTIE — cahier IBIG SOFT v1.1, section 12.5.2.
 *
 * POURQUOI CE FICHIER EXISTE
 * Une consigne dans l'invite système n'est pas un garde-fou. Un modèle de
 * langage la respecte le plus souvent et la contredit parfois, et c'est
 * précisément la fois où il la contredit qui coûte la vente : un prospect à qui
 * SARA promet une remise ou annonce une durée d'essai fantaisiste conclut que
 * l'éditeur ne maîtrise pas son produit.
 *
 * Ce filtre s'applique à CHAQUE réponse sortante, quelle que soit sa provenance
 * (modèle, fiche, message d'erreur). Il ne corrige pas le texte fautif : il le
 * REMPLACE. Rapiécer une phrase qui promettait une remise donne une phrase qui
 * promet à moitié une remise.
 *
 * TROIS CONTRÔLES
 *  1. Termes bannis (12.3)   — toujours actif.
 *  2. Promesses commerciales — toujours actif.
 *  3. Nombres de licence     — actif uniquement en contexte de licence, sinon
 *                              « 3 tâches pour vendredi » deviendrait suspect.
 */
class GardeFouLicence
{
    public function __construct(private OutilLicence $outil)
    {
    }

    /**
     * Motifs de promesse commerciale. SARA n'a aucun pouvoir commercial :
     * toute phrase qui engage l'éditeur sur une faveur est refusée.
     */
    private const PROMESSES = [
        '/\b(remise|réduction|reduction|rabais|ristourne)\b/iu',
        '/\bgeste commercial\b/iu',
        '/\b(à|a) titre (exceptionnel|gracieux)\b/iu',
        '/\bd(é|e)rogation\b/iu',
        '/\bexception (pour vous|peut (é|e)tre faite|est possible)\b/iu',
        '/\bje (peux|pourrais|vais) (vous )?(offrir|accorder|prolonger|(é|e)tendre|d(é|e)bloquer|augmenter|lever)\b/iu',
        '/\bnous (pouvons|pourrions) (vous )?(offrir|accorder|prolonger|faire un geste)\b/iu',
        '/\b(prolonger|rallonger|(é|e)tendre) votre (essai|p(é|e)riode)\b/iu',
        '/\b(contourner|d(é|e)passer|outrepasser|lever) (le|votre|ce) plafond\b/iu',
        '/\bplafond (peut (é|e)tre|sera) (lev(é|e)|augment(é|e)|relev(é|e))\b/iu',
        '/\bgratuitement pour vous\b/iu',
        '/\bsans (payer|frais) (suppl(é|e)mentaire)?s? (pour vous)\b/iu',
    ];

    /**
     * Termes bannis que la configuration ne liste pas explicitement mais que la
     * section 12.3 interdit (anglicismes en français, formulations de perte).
     */
    private const BANNIS_COMPLEMENTAIRES = [
        '/\b(le|votre|en|la) (trial|free)\b/iu',
        '/\bp(é|e)riode de trial\b/iu',
        '/\bversion d(\'|’)(é|e)valuation\b/iu',
        '/\bdonn(é|e)es (sont |seront )?(perdues|effac(é|e)es|supprim(é|e)es)\b/iu',
        '/\bcompte (suspendu|bloqu(é|e)|d(é|e)sactiv(é|e))\b/iu',
        '/\bacc(è|e)s r(é|e)voqu(é|e)\b/iu',
        '/\billimit(é|e)e?s?\b/iu',
    ];

    /**
     * Vérifie une réponse et retourne le texte réellement diffusable.
     *
     * @return array{reponse: string, sur: bool, motifs: array<string>}
     */
    public function filtrer(string $reponse, string $question = ''): array
    {
        $motifs = array_merge(
            $this->termesBannis($reponse),
            $this->promesses($reponse),
            $this->nombresInventes($reponse, $question),
        );

        if ($motifs === []) {
            return ['reponse' => $reponse, 'sur' => true, 'motifs' => []];
        }

        Log::warning('SARA — réponse retenue par le garde-fou licence', [
            'motifs'   => $motifs,
            'question' => mb_substr($question, 0, 200),
            'extrait'  => mb_substr($reponse, 0, 400),
        ]);

        return [
            'reponse' => $this->outil->renvoi(),
            'sur'     => false,
            'motifs'  => $motifs,
        ];
    }

    // ─── 1. Termes bannis (12.3) ────────────────────────────────────────────

    private function termesBannis(string $texte): array
    {
        $motifs = [];

        foreach ($this->outil->valeurs()['termes_bannis'] as $terme) {
            if (mb_stripos($this->deplier($texte), $this->deplier($terme)) !== false) {
                $motifs[] = 'terme_banni:' . $terme;
            }
        }

        foreach (self::BANNIS_COMPLEMENTAIRES as $motif) {
            if (preg_match($motif, $texte, $m)) {
                $motifs[] = 'terme_banni:' . mb_strtolower($m[0]);
            }
        }

        return $motifs;
    }

    // ─── 2. Promesses commerciales ──────────────────────────────────────────

    private function promesses(string $texte): array
    {
        $motifs = [];

        foreach (self::PROMESSES as $motif) {
            if (preg_match($motif, $texte, $m)) {
                $motifs[] = 'promesse:' . mb_strtolower(trim($m[0]));
            }
        }

        return $motifs;
    }

    // ─── 3. Nombres de licence inventés ─────────────────────────────────────

    /**
     * Repère un nombre de durée, de plafond ou de prix qui ne figure pas dans
     * licence.config.json, dans une phrase de licence.
     *
     * Le contrôle ne s'applique qu'en contexte de licence : hors de ce contexte,
     * « votre réunion dure 45 minutes » est une réponse parfaitement légitime.
     */
    private function nombresInventes(string $texte, string $question): array
    {
        if (! $this->outil->concerne($question) && ! $this->outil->concerne($texte)) {
            return [];
        }

        $autorises = $this->outil->nombresAutorises();
        $motifs    = [];

        // Durées : « 30 jours », « 3 mois », « 1 an », « 2 semaines ».
        if (preg_match_all('/\b(\d{1,4})\s*(jours?|mois|ans?|ann(é|e)es?|semaines?)\b/iu', $texte, $m, PREG_SET_ORDER)) {
            foreach ($m as $trouve) {
                $valeur = (int) $trouve[1];
                $unite  = mb_strtolower($trouve[2]);

                // Seuls les jours sont comparables directement à la config.
                // Une durée exprimée dans une autre unité est, par construction,
                // une conversion — donc un calcul, donc interdite (12.5.2).
                if (! str_starts_with($unite, 'jour')) {
                    $motifs[] = 'duree_convertie:' . $trouve[0];
                    continue;
                }

                if (! in_array($valeur, $autorises, true)) {
                    $motifs[] = 'duree_hors_config:' . $trouve[0];
                }
            }
        }

        // Prix : SARA ne cite jamais de montant. Les prix vivent dans `plans`,
        // pas dans la source de vérité de licence — donc pas dans sa bouche.
        if (preg_match('/\b\d[\d\s.,]*\s*(FCFA|XOF|€|EUR|euros?|USD|\$)\b/iu', $texte, $m)) {
            $motifs[] = 'prix_cite:' . trim($m[0]);
        }

        // Plafonds : « 20 courriers », « 10 utilisateurs ».
        $compteurs = array_map(
            fn ($c) => preg_quote(str_replace('_', ' ', preg_replace('/_mois$/', '', $c)), '/'),
            array_keys($this->outil->valeurs()['plafonds'])
        );
        $compteurs[] = 'utilisateurs?';

        $motifCompteur = '/\b(\d{1,6})\s*(' . implode('|', $compteurs) . ')s?\b/iu';

        if (preg_match_all($motifCompteur, $texte, $m, PREG_SET_ORDER)) {
            foreach ($m as $trouve) {
                if (! in_array((int) $trouve[1], $autorises, true)) {
                    $motifs[] = 'plafond_hors_config:' . $trouve[0];
                }
            }
        }

        return $motifs;
    }

    // ─── Utilitaire ─────────────────────────────────────────────────────────

    private function deplier(string $texte): string
    {
        return mb_strtolower(str_replace(
            ['é', 'è', 'ê', 'ë', 'à', 'â', 'ä', 'ù', 'û', 'ü', 'î', 'ï', 'ô', 'ö', 'ç', '’'],
            ['e', 'e', 'e', 'e', 'a', 'a', 'a', 'u', 'u', 'u', 'i', 'i', 'o', 'o', 'c', "'"],
            $texte
        ));
    }
}
