<?php

declare(strict_types=1);

namespace App\Services\Sara;

use App\Services\LicenceService;

/**
 * OUTIL DÉDIÉ — la seule voie par laquelle SARA connaît la licence.
 * Cahier IBIG SOFT v1.1, section 12.5.2.
 *
 * « SARA ne calcule, n'estime et n'invente jamais une durée, un prix, un plafond
 *   ni une règle de licence. Elle lit licence.config.json via un outil dédié. »
 *
 * CE QUE CET OUTIL GARANTIT
 *  - Il ne fait aucune arithmétique sur les durées : il restitue les entiers de
 *    licence.config.json tels quels, via LicenceService.
 *  - Il ne connaît aucun prix. Les prix vivent dans la table `plans` et l'outil
 *    ne les cite pas : il renvoie vers la page tarifs. Un prix récité de mémoire
 *    est le premier chiffre à diverger.
 *  - Quand il n'a pas la fiche, il renvoie le texte officiel de renvoi. Jamais
 *    une approximation, jamais un « environ », jamais un « généralement ».
 *
 * CE QU'IL NE PEUT PAS GARANTIR SEUL
 *  Un modèle de langage reste libre d'écrire ce qu'il veut. C'est pourquoi
 *  l'outil est branché AVANT le modèle (court-circuit : la question de licence
 *  n'atteint jamais le modèle) et le GardeFouLicence passe APRÈS.
 */
class OutilLicence
{
    public const NOM = 'licence.lire';

    public function __construct(
        private LicenceService $licence,
        private BaseConnaissanceLicence $base,
    ) {
    }

    // ─── Détection ──────────────────────────────────────────────────────────

    /**
     * Mots qui font d'une question une question de licence.
     *
     * Volontairement large : mieux vaut router vers l'outil déterministe une
     * question qui n'en avait pas besoin, que laisser le modèle improviser une
     * durée. Le pire cas d'un faux positif est une réponse exacte hors sujet.
     */
    private const LEXIQUE = [
        'licence', 'licence', 'abonnement', 'formule', 'tarif', 'prix', 'coute', 'cout',
        'essai', 'trial', 'gratuit', 'decouverte', 'plafond', 'quota', 'limite',
        'grace', 'lecture seule', 'filigrane', 'watermark', 'expire', 'expiration',
        'echeance', 'renouveler', 'renouvellement', 'souscri', 'payer', 'paiement',
        'carte bancaire', 'conservation', 'conservees', 'purge', 'a vie', 'perpetuelle',
        'prolong', 'remise', 'reduction', 'palier', 'espace',
        'demo publique', 'exporter', 'export', 'combien de courriers', 'combien coute',
    ];

    /** La question relève-t-elle de la licence ? */
    public function concerne(string $question): bool
    {
        $normalise = $this->normaliser($question);

        foreach (self::LEXIQUE as $mot) {
            if (str_contains($normalise, $this->normaliser($mot))) {
                return true;
            }
        }

        return false;
    }

    // ─── Réponse ────────────────────────────────────────────────────────────

    /**
     * Répond à une question de licence, ou renvoie null si elle n'en est pas une.
     *
     * @return array{reponse: string, cle: string, source: string, certain: bool}|null
     */
    public function repondre(string $question): ?array
    {
        if (! $this->concerne($question)) {
            return null;
        }

        $fiche = $this->base->chercher($question);

        if ($fiche === null) {
            // Information absente de la base : renvoi, jamais approximation.
            return [
                'reponse' => $this->renvoi(),
                'cle'     => 'renvoi',
                'source'  => 'config/licence.config.json',
                'certain' => false,
            ];
        }

        return [
            'reponse' => $fiche['reponse'],
            'cle'     => $fiche['cle'],
            'source'  => 'config/licence.config.json',
            'certain' => true,
        ];
    }

    /**
     * Texte officiel de renvoi — section 12.5.2.
     * Aucun chiffre : c'est tout l'intérêt.
     */
    public function renvoi(): string
    {
        return sprintf(
            "Je n'ai pas cette information de façon certaine, et je préfère ne pas l'approximer : "
            . "sur les questions de %s, un chiffre approché vaut moins que pas de chiffre du tout. "
            . "La page tarifs de %s donne la réponse exacte, et le support %s répond aux cas particuliers.",
            mb_strtolower($this->licence->config()['glossaire']['formule'] ?? 'Formule'),
            $this->licence->nomSolution(),
            $this->licence->config()['domaine_editeur'] ?? ''
        );
    }

    // ─── Valeurs brutes (pour l'invite système et la recette) ───────────────

    /**
     * Les seules valeurs de licence que SARA a le droit de citer.
     * Sert aussi de liste blanche numérique au GardeFouLicence.
     */
    public function valeurs(): array
    {
        $config  = $this->licence->config();
        $gratuit = $config['gratuit'] ?? [];

        return [
            'solution'            => $this->licence->nomSolution(),
            'editeur'             => $config['editeur'] ?? null,
            'domaine_editeur'     => $config['domaine_editeur'] ?? null,
            'essai_jours'         => $this->licence->essaiJours(),
            'grace_jours'         => $this->licence->graceJours(),
            'retention_jours'     => $this->licence->retentionJours(),
            'prolongation_jours'  => (int) ($config['prolongation_jours'] ?? 0),
            'prolongation_max'    => (int) ($config['prolongation_max'] ?? 0),
            'tolerance_hors_ligne_jours' => (int) ($config['tolerance_hors_ligne_jours'] ?? 0),
            'palier_gratuit'      => $gratuit['nom'] ?? null,
            'plafonds'            => $this->licence->plafonds(),
            'plafond_resume'      => $this->licence->resumePlafond(),
            'utilisateurs_gratuit'=> (int) ($gratuit['utilisateurs'] ?? 0),
            'stockage_mo_gratuit' => (int) ($gratuit['stockage_mo'] ?? 0),
            'filigrane'           => $this->licence->filigrane(),
            'glossaire'           => $config['glossaire'] ?? [],
            'termes_bannis'       => $config['termes_bannis'] ?? [],
            'droits_par_etat'     => $config['droits_par_etat'] ?? [],
            'demo_actif'          => (bool) ($config['demo']['actif'] ?? false),
        ];
    }

    /**
     * Tous les entiers que SARA peut légitimement écrire dans une phrase de
     * licence. Tout autre nombre dans un contexte de licence est une invention.
     */
    public function nombresAutorises(): array
    {
        $v = $this->valeurs();

        $nombres = [
            $v['essai_jours'],
            $v['grace_jours'],
            $v['retention_jours'],
            $v['prolongation_jours'],
            $v['prolongation_max'],
            $v['tolerance_hors_ligne_jours'],
            $v['utilisateurs_gratuit'],
            $v['stockage_mo_gratuit'],
            0,  // le prix du palier gratuit
        ];

        foreach ($v['plafonds'] as $plafond) {
            $nombres[] = (int) $plafond;
        }

        return array_values(array_unique(array_filter($nombres, fn ($n) => $n !== null)));
    }

    // ─── Description de l'outil pour un modèle à appels de fonctions ────────

    /**
     * Schéma JSON de l'outil, au format OpenAI/Groq `tools`.
     *
     * Le fournisseur actuel (Groq, complétion simple) n'appelle pas d'outils :
     * le court-circuit de SaraLicence rend l'appel inutile aujourd'hui. Ce
     * schéma existe pour le jour où l'on bascule sur un modèle à outils — la
     * règle sera alors la même : la licence passe par cet outil ou par rien.
     */
    public function schema(): array
    {
        return [
            'type'     => 'function',
            'function' => [
                'name'        => self::NOM,
                'description' => "Lit la source unique de vérité de la licence (licence.config.json). "
                    . "OBLIGATOIRE pour toute question de durée d'essai, de plafond, de période de grâce, "
                    . "de conservation des données, de filigrane ou de palier gratuit. "
                    . "Ne jamais répondre à ces questions sans appeler cet outil.",
                'parameters'  => [
                    'type'       => 'object',
                    'properties' => [
                        'question' => [
                            'type'        => 'string',
                            'description' => "La question de l'utilisateur, telle quelle.",
                        ],
                    ],
                    'required'   => ['question'],
                ],
            ],
        ];
    }

    // ─── Fragment d'invite système ──────────────────────────────────────────

    /**
     * Le bloc de règles licence à injecter dans toute invite système SARA.
     *
     * Ce bloc est une CONSIGNE, pas un garde-fou : un modèle peut la
     * contredire. Le garde-fou réel est le court-circuit en amont et le
     * GardeFouLicence en aval.
     */
    public function invite(): string
    {
        $v = $this->valeurs();

        $glossaire = implode(' · ', array_values($v['glossaire']));
        $bannis    = implode(' », « ', $v['termes_bannis']);

        return <<<INVITE

        ══ RÈGLES DE LICENCE — NON NÉGOCIABLES ══
        Tu ne calcules, n'estimes et n'inventes JAMAIS une durée, un prix, un plafond
        ni une règle de licence. Ces informations ne sont pas dans ta mémoire : elles
        sont lues dans licence.config.json par l'outil dédié « {$this->nomOutil()} ».
        Si une question porte sur l'essai, une formule, un tarif, un plafond, la
        période de grâce, la conservation des données ou le filigrane, et que la
        réponse de l'outil ne t'a pas été fournie, tu ne réponds PAS de mémoire :
        tu renvoies vers la page tarifs de {$v['solution']} ou vers le support
        {$v['domaine_editeur']}.

        Tu ne promets JAMAIS : ni remise, ni réduction, ni geste commercial, ni
        prolongation d'essai, ni exception, ni dérogation, ni contournement de
        plafond. Tu n'as aucun pouvoir commercial. Ces demandes vont au support.

        Vocabulaire imposé, un seul mot par notion : {$glossaire}.
        Termes interdits, dans toutes tes réponses : « {$bannis} », ainsi que
        « trial » et « free » employés en français, et « illimité » hors d'une
        formule payante réellement illimitée.

        Tu ne dis jamais qu'une donnée est perdue ou supprimée : à l'échéance,
        l'accès passe en Lecture seule et les données sont conservées.
        ══════════════════════════════════════════

        INVITE;
    }

    private function nomOutil(): string
    {
        return self::NOM;
    }

    private function normaliser(string $texte): string
    {
        return mb_strtolower(str_replace(
            ['é', 'è', 'ê', 'ë', 'à', 'â', 'ä', 'ù', 'û', 'ü', 'î', 'ï', 'ô', 'ö', 'ç', "'", '’', '-'],
            ['e', 'e', 'e', 'e', 'a', 'a', 'a', 'u', 'u', 'u', 'i', 'i', 'o', 'o', 'c', ' ', ' ', ' '],
            $texte
        ));
    }
}
