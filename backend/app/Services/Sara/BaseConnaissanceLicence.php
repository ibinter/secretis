<?php

declare(strict_types=1);

namespace App\Services\Sara;

use App\Services\LicenceService;

/**
 * Base de connaissances licence de SARA — cahier IBIG SOFT v1.1, section 12.5.1.
 *
 * CE FICHIER NE CONTIENT AUCUNE DURÉE, AUCUN PLAFOND, AUCUN PRIX.
 * Toutes les fiches sont GÉNÉRÉES à partir de licence.config.json, lu par
 * LicenceService. Le texte porte des trous ; les valeurs sont injectées.
 *
 * POURQUOI UN ARTEFACT GÉNÉRÉ PLUTÔT QU'UN TABLEAU EN DUR
 * Une base écrite à la main se « complète » — on ajoute la nouvelle durée à côté
 * de l'ancienne, et SARA cite l'ancienne avec la même assurance qu'avant. Ici la
 * base est un fichier reconstruit intégralement : `reconstruire()` SUPPRIME
 * l'ancien avant d'écrire le nouveau. Il n'existe jamais deux générations de
 * fiches en même temps.
 *
 * L'EMPREINTE EST LE VERROU
 * Chaque base porte l'empreinte SHA-256 de licence.config.json au moment de sa
 * génération. Si la configuration change sans réindexation, `fiches()` renvoie
 * un tableau VIDE : SARA n'a plus de fiche à citer et bascule sur le renvoi
 * officiel vers la page tarifs. Une base périmée ne peut donc pas produire une
 * réponse périmée — c'est exactement le défaut que la section 12.5.1 décrit.
 */
class BaseConnaissanceLicence
{
    /** Version du générateur. À incrémenter si la forme des fiches change. */
    public const VERSION = 1;

    public function __construct(private LicenceService $licence)
    {
    }

    // ─── Emplacement ────────────────────────────────────────────────────────

    public function chemin(): string
    {
        return storage_path('app/sara/base-connaissance-licence.json');
    }

    /** Empreinte de la source unique de vérité. */
    public function empreinte(): string
    {
        $chemin = config_path('licence.config.json');

        if (! is_file($chemin)) {
            throw new \RuntimeException('licence.config.json est introuvable : la base de connaissances ne peut pas être générée.');
        }

        return hash('sha256', (string) file_get_contents($chemin));
    }

    // ─── Lecture ────────────────────────────────────────────────────────────

    /**
     * Fiches utilisables. Tableau VIDE si la base est absente ou périmée.
     *
     * Le vide est volontaire : mieux vaut que SARA renvoie vers la page tarifs
     * que citer une durée d'une génération précédente.
     */
    public function fiches(): array
    {
        $base = $this->brut();

        if ($base === null) {
            return [];
        }

        if (($base['empreinte'] ?? null) !== $this->empreinte()) {
            return [];
        }

        if ((int) ($base['version'] ?? 0) !== self::VERSION) {
            return [];
        }

        return $base['fiches'] ?? [];
    }

    /** La base telle qu'elle est sur le disque, périmée ou non. */
    public function brut(): ?array
    {
        if (! is_file($this->chemin())) {
            return null;
        }

        $decode = json_decode((string) file_get_contents($this->chemin()), true);

        return is_array($decode) ? $decode : null;
    }

    public function existe(): bool
    {
        return $this->brut() !== null;
    }

    /** La base existe mais ne correspond plus à la configuration courante. */
    public function perimee(): bool
    {
        $base = $this->brut();

        if ($base === null) {
            return false;   // absente, pas périmée
        }

        return ($base['empreinte'] ?? null) !== $this->empreinte()
            || (int) ($base['version'] ?? 0) !== self::VERSION;
    }

    /**
     * Retrouve la fiche qui répond à une question.
     *
     * Appariement par mots-clés, comme le reste de SARA. Un score minimal de 1
     * mot-clé distinctif suffit : les mots-clés sont choisis pour ne pas se
     * déclencher sur une question de gestion courante.
     */
    public function chercher(string $question): ?array
    {
        $normalise  = $this->normaliser($question);
        $meilleure  = null;
        $meilleurScore = 0;

        foreach ($this->fiches() as $fiche) {
            $score = 0;

            foreach ($fiche['mots_cles'] as $mot) {
                if (str_contains($normalise, $this->normaliser($mot))) {
                    $score++;
                }
            }

            if ($score > $meilleurScore) {
                $meilleurScore = $score;
                $meilleure     = $fiche;
            }
        }

        return $meilleurScore >= 1 ? $meilleure : null;
    }

    // ─── Reconstruction ─────────────────────────────────────────────────────

    /**
     * SUPPRIME l'ancienne base puis en écrit une neuve. Section 12.5.1.
     *
     * @return array{fiches: array, supprimees: int, chemin: string}
     */
    public function reconstruire(): array
    {
        $ancien = $this->brut();
        $supprimees = is_array($ancien) ? count($ancien['fiches'] ?? []) : 0;

        // 1. SUPPRESSION — pas une mise à jour en place.
        if (is_file($this->chemin())) {
            unlink($this->chemin());
        }

        // 2. Génération à partir de la source unique de vérité.
        $fiches = $this->genererFiches();

        // 3. Écriture.
        $dossier = dirname($this->chemin());
        if (! is_dir($dossier)) {
            mkdir($dossier, 0775, true);
        }

        file_put_contents($this->chemin(), json_encode([
            'version'    => self::VERSION,
            'solution'   => $this->licence->solution(),
            'empreinte'  => $this->empreinte(),
            'genere_le'  => now()->toIso8601String(),
            'source'     => 'config/licence.config.json',
            'fiches'     => $fiches,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return ['fiches' => $fiches, 'supprimees' => $supprimees, 'chemin' => $this->chemin()];
    }

    // ─── Génération des fiches ──────────────────────────────────────────────

    /**
     * Les fiches canoniques. Une par question de la section 12.9, plus les
     * notions du glossaire 12.3 que SARA doit savoir nommer.
     *
     * Chaque `reponse` est assemblée à partir de valeurs lues dans
     * licence.config.json. Aucune valeur n'est saisie ici.
     */
    private function genererFiches(): array
    {
        $config    = $this->licence->config();
        $gratuit   = $config['gratuit'] ?? [];
        $nomFormuleGratuite = $gratuit['nom'] ?? '';
        $solution  = $this->licence->nomSolution();
        $editeur   = $config['domaine_editeur'] ?? '';
        $glossaire = $config['glossaire'] ?? [];

        $essai      = $this->licence->essaiJours();
        $grace      = $this->licence->graceJours();
        $retention  = $this->licence->retentionJours();
        $prolongJ   = (int) ($config['prolongation_jours'] ?? 0);
        $prolongMax = (int) ($config['prolongation_max'] ?? 0);
        $resume     = $this->licence->resumePlafond();

        $droitsFree  = $config['droits_par_etat']['FREE'] ?? [];
        $droitsDemo  = $config['droits_par_etat']['DEMO'] ?? [];

        $fiches = [];

        // ── Q1 — durée de l'Essai ────────────────────────────────────────────
        $fiches[] = [
            'cle'       => 'essai.duree',
            'question'  => 'Combien de temps dure l\'essai ?',
            // Racines plutôt que formes fléchies : « dure l'essai », « durée de
            // l'essai » et « combien de jours d'essai » sont la même question.
            'mots_cles' => [
                'duree de l essai', 'duree essai', 'dure l essai', 'combien de temps dure',
                'combien de jours d essai', 'longueur de l essai', 'periode d essai',
                'trial duration', 'how long is the trial',
            ],
            'reponse'   => sprintf(
                "L'%s de %s dure %s. Il ouvre l'export, le multi-utilisateur, l'API et l'assistant IA SARA, et ne demande aucune carte bancaire.",
                $glossaire['essai'] ?? 'Essai',
                $solution,
                $this->jours($essai)
            ),
            'valeurs'   => ['essai_jours' => $essai],
        ];

        // ── Q2 — carte bancaire ──────────────────────────────────────────────
        $fiches[] = [
            'cle'       => 'essai.carte_bancaire',
            'question'  => 'Faut-il une carte bancaire pour essayer ?',
            'mots_cles' => ['carte bancaire', 'carte de credit', 'moyen de paiement pour essayer', 'payer pour essayer', 'credit card'],
            'reponse'   => sprintf(
                "Non. L'%s de %s se démarre sans carte bancaire, sans engagement et sans reconduction automatique. Le palier %s s'ouvre lui aussi sans carte bancaire.",
                $glossaire['essai'] ?? 'Essai',
                $this->jours($essai),
                $nomFormuleGratuite
            ),
            'valeurs'   => ['essai_jours' => $essai],
        ];

        // ── Q3 — fin de l'Essai ──────────────────────────────────────────────
        $fiches[] = [
            'cle'       => 'essai.fin',
            'question'  => 'Que se passe-t-il exactement à la fin de l\'essai ?',
            'mots_cles' => ['fin de l essai', 'apres l essai', 'essai termine', 'essai expire', 'quand l essai se termine', 'a la fin de la periode d essai'],
            'reponse'   => sprintf(
                "À la fin de l'%s, votre %s bascule automatiquement dans le palier %s. Vos données sont conservées : %s restent modifiables, le reste passe en %s. Rien n'est supprimé, rien n'est masqué.",
                $glossaire['essai'] ?? 'Essai',
                mb_strtolower($glossaire['espace'] ?? 'Espace'),
                $nomFormuleGratuite,
                $resume,
                mb_strtolower($glossaire['lecture_seule'] ?? 'Lecture seule')
            ),
            'valeurs'   => ['plafond_resume' => $resume],
        ];

        // ── Q4 — plafond du palier gratuit ───────────────────────────────────
        $fiches[] = [
            'cle'       => 'gratuit.plafond',
            'question'  => sprintf('Combien de %s au palier %s ?', $this->libelleCompteurs($gratuit), $nomFormuleGratuite),
            'mots_cles' => array_merge(
                ['plafond', 'limite', 'quota', 'combien de courriers', 'nombre de courriers', 'cap'],
                array_map(fn ($c) => str_replace('_', ' ', $c), array_keys($gratuit['quotas'] ?? []))
            ),
            'reponse'   => sprintf(
                "Le palier %s permet %s. C'est le %s de la solution. Au-delà, vos données restent accessibles et modifiables : seule la création supplémentaire demande une %s payante.",
                $nomFormuleGratuite,
                $resume,
                mb_strtolower($glossaire['plafond'] ?? 'Plafond'),
                mb_strtolower($glossaire['formule'] ?? 'Formule')
            ),
            'valeurs'   => ['quotas' => $gratuit['quotas'] ?? [], 'plafond_resume' => $resume],
        ];

        // ── Q5 — le palier gratuit expire-t-il ? ─────────────────────────────
        $fiches[] = [
            'cle'       => 'gratuit.expiration',
            'question'  => sprintf('Le palier %s expire-t-il un jour ?', $nomFormuleGratuite),
            'mots_cles' => [
                sprintf('%s expire', mb_strtolower($nomFormuleGratuite)),
                'palier gratuit expire', 'gratuit a vie', 'expire un jour', 'duree du palier',
            ],
            'reponse'   => sprintf(
                "Non. Le palier %s n'a pas d'échéance : il reste ouvert, plafonné à %s. Aucune relance ne le referme.",
                $nomFormuleGratuite,
                $resume
            ),
            'valeurs'   => ['plafond_resume' => $resume],
        ];

        // ── Q6 — export au palier gratuit ────────────────────────────────────
        $fiches[] = [
            'cle'       => 'gratuit.export',
            'question'  => sprintf('Peut-on exporter ses données au palier %s ?', $nomFormuleGratuite),
            'mots_cles' => ['exporter', 'export', 'csv', 'excel', 'telecharger mes donnees', 'sortir mes donnees'],
            'reponse'   => ($droitsFree['export'] ?? false)
                ? sprintf("Oui, l'export est ouvert au palier %s.", $nomFormuleGratuite)
                : sprintf(
                    "L'export CSV, Excel et PDF n'est pas ouvert au palier %s : il fait partie des %ss payantes et de l'%s. Vos données ne sont jamais bloquées pour autant — le support %s peut vous en fournir une copie sur demande.",
                    $nomFormuleGratuite,
                    mb_strtolower($glossaire['formule'] ?? 'Formule'),
                    $glossaire['essai'] ?? 'Essai',
                    $editeur
                ),
            'valeurs'   => ['droits_free_export' => (bool) ($droitsFree['export'] ?? false)],
        ];

        // ── Q7 — conservation après expiration ───────────────────────────────
        $fiches[] = [
            'cle'       => 'expiration.retention',
            'question'  => 'Combien de temps mes données sont-elles conservées après expiration ?',
            'mots_cles' => ['conservation', 'conservees', 'combien de temps mes donnees', 'retention', 'purge', 'apres expiration', 'recuperer mes donnees'],
            'reponse'   => sprintf(
                "Après l'échéance d'un abonnement, l'accès complet est maintenu pendant la %s de %s. Ensuite, votre %s passe en %s et vos données restent conservées %s avant purge. Vous êtes prévenu avant, et vous pouvez demander un export à tout moment.",
                mb_strtolower($glossaire['grace'] ?? 'Période de grâce'),
                $this->jours($grace),
                mb_strtolower($glossaire['espace'] ?? 'Espace'),
                mb_strtolower($glossaire['lecture_seule'] ?? 'Lecture seule'),
                $this->jours($retention)
            ),
            'valeurs'   => ['grace_jours' => $grace, 'retention_jours' => $retention],
        ];

        // ── Q8 — licence à vie ───────────────────────────────────────────────
        $fiches[] = [
            'cle'       => 'formules.pas_de_perpetuelle',
            'question'  => 'Existe-t-il une licence à vie ou perpétuelle ?',
            'mots_cles' => ['a vie', 'perpetuelle', 'lifetime', 'achat definitif', 'une fois pour toutes', 'licence definitive'],
            'reponse'   => sprintf(
                "Non. %s se souscrit par %s à durée déterminée : toute licence payante porte une date de fin. Seul le palier %s est sans échéance, et il est plafonné à %s.",
                $solution,
                mb_strtolower($glossaire['formule'] ?? 'Formule'),
                $nomFormuleGratuite,
                $resume
            ),
            'valeurs'   => [],
        ];

        // ── Q9 — prolongation de l'Essai ─────────────────────────────────────
        $fiches[] = [
            'cle'       => 'essai.prolongation',
            'question'  => 'L\'essai peut-il être prolongé, et combien de fois ?',
            // « prolong » couvre prolonger, prolongé, prolongation.
            'mots_cles' => ['prolong', 'rallonger', 'etendre l essai', 'plus de temps', 'renouveler l essai'],
            'reponse'   => $prolongMax > 0
                ? sprintf(
                    "L'%s peut être prolongé de %s, %s, sur décision de l'éditeur et avec motif enregistré. Je ne peux ni l'accorder ni l'engager : la demande se fait auprès du support %s.",
                    $glossaire['essai'] ?? 'Essai',
                    $this->jours($prolongJ),
                    $this->fois($prolongMax),
                    $editeur
                )
                : sprintf(
                    "L'%s n'est pas prolongeable. À son terme, votre %s bascule dans le palier %s et vos données sont conservées.",
                    $glossaire['essai'] ?? 'Essai',
                    mb_strtolower($glossaire['espace'] ?? 'Espace'),
                    $nomFormuleGratuite
                ),
            'valeurs'   => ['prolongation_jours' => $prolongJ, 'prolongation_max' => $prolongMax],
        ];

        // ── Q10 — retrait du Filigrane ───────────────────────────────────────
        $fiches[] = [
            'cle'       => 'filigrane.retrait',
            'question'  => 'Comment retirer le filigrane des documents ?',
            'mots_cles' => ['filigrane', 'watermark', 'mention sur les documents', 'genere avec', 'retirer la mention'],
            'reponse'   => sprintf(
                "Les documents portent la mention « %s » tant que votre %s est au palier %s, en %s ou échu. Le %s est retiré automatiquement dès le premier paiement d'une %s : aucune manipulation de votre part.",
                $this->licence->filigrane(),
                mb_strtolower($glossaire['espace'] ?? 'Espace'),
                $nomFormuleGratuite,
                mb_strtolower($glossaire['demo_publique'] ?? 'Démo publique'),
                mb_strtolower($glossaire['filigrane'] ?? 'Filigrane'),
                mb_strtolower($glossaire['formule'] ?? 'Formule')
            ),
            'valeurs'   => ['filigrane' => $this->licence->filigrane()],
        ];

        // ── Notions complémentaires du glossaire 12.3 ────────────────────────

        $fiches[] = [
            'cle'       => 'grace.definition',
            'question'  => sprintf('Qu\'est-ce que la %s ?', mb_strtolower($glossaire['grace'] ?? 'période de grâce')),
            'mots_cles' => ['periode de grace', 'grace', 'delai apres echeance', 'impaye', 'retard de paiement'],
            'reponse'   => sprintf(
                "La %s dure %s après l'échéance de votre abonnement. Pendant cette période, l'accès reste complet : rien ne se ferme. Ensuite, votre %s passe en %s.",
                mb_strtolower($glossaire['grace'] ?? 'Période de grâce'),
                $this->jours($grace),
                mb_strtolower($glossaire['espace'] ?? 'Espace'),
                mb_strtolower($glossaire['lecture_seule'] ?? 'Lecture seule')
            ),
            'valeurs'   => ['grace_jours' => $grace],
        ];

        $fiches[] = [
            'cle'       => 'lecture_seule.definition',
            'question'  => sprintf('Que veut dire « %s » ?', $glossaire['lecture_seule'] ?? 'Lecture seule'),
            'mots_cles' => ['lecture seule', 'plus modifier', 'ne peux plus ecrire', 'consultation seulement', 'read only'],
            'reponse'   => sprintf(
                "En %s, tout reste consultable : vos courriers, vos documents et vos historiques sont visibles et non masqués. Seule l'écriture est fermée. Aucune donnée n'est supprimée du fait de la %s.",
                mb_strtolower($glossaire['lecture_seule'] ?? 'Lecture seule'),
                mb_strtolower($glossaire['lecture_seule'] ?? 'Lecture seule')
            ),
            'valeurs'   => [],
        ];

        $fiches[] = [
            'cle'       => 'demo.definition',
            'question'  => sprintf('Qu\'est-ce que la %s ?', mb_strtolower($glossaire['demo_publique'] ?? 'démo publique')),
            'mots_cles' => ['demo publique', 'demonstration', 'tester sans compte', 'sans inscription'],
            'reponse'   => ($config['demo']['actif'] ?? false)
                ? sprintf(
                    "La %s est le vrai logiciel avec des données fictives, sans inscription, remis à zéro chaque nuit : %s",
                    mb_strtolower($glossaire['demo_publique'] ?? 'Démo publique'),
                    (string) ($config['demo']['url'] ?? '')
                )
                : sprintf(
                    "La %s n'est pas ouverte pour le moment. Pour voir %s en conditions réelles, l'%s de %s se démarre sans carte bancaire.",
                    mb_strtolower($glossaire['demo_publique'] ?? 'Démo publique'),
                    $solution,
                    $glossaire['essai'] ?? 'Essai',
                    $this->jours($essai)
                ),
            'valeurs'   => ['demo_actif' => (bool) ($config['demo']['actif'] ?? false)],
        ];

        $fiches[] = [
            'cle'       => 'sara.indisponible_gratuit',
            'question'  => sprintf('SARA est-elle disponible au palier %s ?', $nomFormuleGratuite),
            'mots_cles' => ['sara disponible', 'assistant ia inclus', 'ia incluse', 'sara au palier'],
            'reponse'   => (($droitsFree['sara'] ?? false) || ($droitsDemo['sara'] ?? false))
                ? sprintf("L'assistant IA SARA est ouvert au palier %s.", $nomFormuleGratuite)
                : sprintf(
                    "L'assistant IA SARA fait partie de l'%s et des %ss payantes. Il n'est pas ouvert au palier %s ni en %s.",
                    $glossaire['essai'] ?? 'Essai',
                    mb_strtolower($glossaire['formule'] ?? 'Formule'),
                    $nomFormuleGratuite,
                    mb_strtolower($glossaire['demo_publique'] ?? 'Démo publique')
                ),
            'valeurs'   => ['droits_free_sara' => (bool) ($droitsFree['sara'] ?? false)],
        ];

        return $fiches;
    }

    // ─── Formatage (mise en forme, pas de calcul) ───────────────────────────

    /** Met en forme un nombre de jours lu dans la configuration. */
    private function jours(int $n): string
    {
        return $n <= 1 ? sprintf('%d jour', $n) : sprintf('%d jours', $n);
    }

    private function fois(int $n): string
    {
        return $n <= 1 ? 'une seule fois' : sprintf('%d fois au maximum', $n);
    }

    /** « courriers » à partir du nom du compteur métier, pour libeller Q4. */
    private function libelleCompteurs(array $gratuit): string
    {
        $compteurs = array_keys($gratuit['quotas'] ?? []);

        if ($compteurs === []) {
            return 'unités';
        }

        return implode(' et ', array_map(
            fn ($c) => str_replace('_', ' ', preg_replace('/_mois$/', '', $c)),
            $compteurs
        ));
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
