<?php

namespace App\Support;

/**
 * Scanner d'incohérences de licence — cahier IBIG SOFT v1.1, section 12.8.
 *
 * Cette classe est du PHP nu : aucune façade, aucun conteneur, aucune requête.
 * C'est délibéré. L'audit doit pouvoir tourner sur un dépôt qui ne démarre pas
 * (dépendances absentes, base injoignable) : un contrôle qui exige que
 * l'application fonctionne ne sert à rien le jour où elle ne fonctionne plus.
 * La commande `licence:verifier` l'enveloppe et y ajoute les contrôles en base.
 *
 * Elle ne corrige rien. Elle constate, avec fichier, ligne et chaîne trouvée.
 */
final class LicenceAudit
{
    // ─── Règles ──────────────────────────────────────────────────────────────

    public const REGLE_DUREE      = 'DUREE_LITTERALE';
    public const REGLE_PLAFOND    = 'PLAFOND_LITTERAL';
    public const REGLE_PERPETUITE = 'PERPETUITE';
    public const REGLE_BANNI      = 'TERME_BANNI';
    public const REGLE_PRIX       = 'PRIX_LITTERAL';

    /**
     * EXCLUSIONS — chacune est justifiée. Une exclusion trop large rend l'audit
     * inutile : on n'exclut donc jamais un répertoire de code source, seulement
     * du code tiers, des produits de compilation, et les trois fichiers qui ont
     * le droit de contenir les chaînes recherchées.
     *
     * Le motif est comparé au chemin RELATIF à la racine du dépôt, en
     * séparateurs `/`. Un motif qui se termine par `/` exclut une arborescence,
     * les autres excluent un fichier exact ou un suffixe de nom.
     */
    public const EXCLUSIONS = [
        // ── Code tiers : nous ne le corrigerons pas et il parle anglais ──────
        'vendor/',                    // dépendances Composer
        'node_modules/',              // dépendances npm
        '.git/',                      // objets Git (binaires)

        // ── Produits de compilation : le défaut est dans la source, pas ici ──
        // Les signaler doublerait chaque constat sans donner de fichier à
        // corriger, et l'audit deviendrait illisible.
        'public/build/',
        'public/hot',
        // Bundles Vite versionnés par erreur : noms hachés, contenu illisible,
        // et la correction se fait dans `frontend/resources/js`.
        'frontend/public/assets/',
        'dist/',
        'build/',
        '.next/',
        'coverage/',
        'storage/framework/',
        'storage/logs/',
        // Base de connaissances de SARA : ENGENDRÉE depuis licence.config.json
        // par `sara:reindexer-licence`. Elle contient donc les valeurs exactes,
        // par construction. La signaler reviendrait à auditer la sortie de la
        // source de vérité — le défaut, s'il existait, serait dans le
        // générateur, qui lui est bien analysé.
        'storage/app/sara/',
        'bootstrap/cache/',
        '.min.js',
        '.min.css',
        '.map',
        'composer.lock',
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',

        // ── La source unique de vérité ──────────────────────────────────────
        // licence.config.json EST l'endroit où les durées, les plafonds et la
        // liste des termes bannis ont le droit d'être écrits. S'auto-signaler
        // rendrait l'audit rouge en permanence, donc inexploitable.
        // (chemins écrits en suffixe : l'audit tourne aussi bien depuis la
        // racine du dépôt que depuis `backend/` seul, sur le serveur déployé)
        'config/licence.config.json',

        // ── L'audit lui-même ────────────────────────────────────────────────
        // Ces deux fichiers portent les motifs de recherche et la liste des
        // termes bannis : ils contiennent forcément ce qu'ils traquent.
        'app/Support/LicenceAudit.php',
        'app/Console/Commands/LicenceVerifier.php',
        // Même raison pour le contrôleur i18n de la surface 5 : son contenu EST
        // la liste des termes bannis. (Il la recopie au lieu de la lire dans
        // licence.config.json — signalé au compte rendu, pas corrigé ici.)
        'docs/verifier-i18n-licence.mjs',

        // ── Le socle, déjà migré en production ──────────────────────────────
        // La migration porte les intervalles SQL (grâce, rétention) figés au
        // moment de la reprise des 8 lignes existantes, et le nom de contrainte
        // `licenses_jamais_perpetuelle`. Elle est immuable par consigne : la
        // signaler à chaque exécution serait un bruit permanent sans action
        // possible. Aucune AUTRE migration n'est exclue.
        'database/migrations/2026_08_09_000001_licence_six_etats.php',
    ];

    /** Extensions inspectées : code, contenus et documentation (section 12.8). */
    public const EXTENSIONS = [
        'php', 'js', 'jsx', 'ts', 'tsx', 'vue', 'mjs', 'cjs',
        'md', 'txt', 'json', 'html', 'htm', 'blade', 'css', 'yml', 'yaml',
    ];

    /**
     * Au-delà de cette taille un fichier texte est un artefact (dump, export,
     * bundle non minifié). Le seuil est volontairement haut : aucun fichier
     * écrit à la main ne l'atteint.
     */
    public const TAILLE_MAX = 786432; // 768 Ko

    /** @var list<string> chemins relatifs ignorés pour cause de taille */
    private array $tropGros = [];

    private int $fichiersLus = 0;

    /**
     * @param string $racine  racine du dépôt (le dossier qui contient `backend/`)
     * @param array  $config  contenu de licence.config.json
     */
    public function __construct(
        private readonly string $racine,
        private readonly array $config,
    ) {
    }

    public function fichiersLus(): int { return $this->fichiersLus; }
    public function fichiersIgnores(): array { return $this->tropGros; }

    /**
     * Parcourt le dépôt et retourne les constats.
     *
     * @return list<array{regle:string,fichier:string,ligne:int,extrait:string,motif:string}>
     */
    public function scanner(): array
    {
        $constats = [];

        foreach ($this->fichiers() as $chemin => $relatif) {
            $contenu = @file_get_contents($chemin);

            if ($contenu === false || $contenu === '') {
                continue;
            }

            // Un fichier binaire mal nommé (police, image renommée) n'a rien à
            // dire ici et produirait des extraits illisibles.
            if (str_contains(substr($contenu, 0, 4096), "\0")) {
                continue;
            }

            $this->fichiersLus++;

            foreach (preg_split('/\R/u', $contenu) ?: [] as $i => $ligne) {
                if (trim($ligne) === '') {
                    continue;
                }

                foreach ($this->constatsDeLaLigne($ligne) as $constat) {
                    $constats[] = $constat + ['fichier' => $relatif, 'ligne' => $i + 1];
                }
            }
        }

        usort($constats, fn ($a, $b) => [$a['regle'], $a['fichier'], $a['ligne']]
                                    <=> [$b['regle'], $b['fichier'], $b['ligne']]);

        return $constats;
    }

    // ─── Détection ligne à ligne ─────────────────────────────────────────────

    /** @return list<array{regle:string,motif:string,extrait:string}> */
    /**
     * Marqueur d'exemption explicite.
     *
     * Certaines lignes CITENT une valeur interdite parce que c'est leur objet :
     * la question Q8 du cahier contient « licence à vie », les cas de recette du
     * garde-fou SARA contiennent délibérément « l'essai dure 30 jours » pour
     * vérifier qu'il la refuse, et une assertion de test doit nommer la valeur
     * qu'elle contrôle.
     *
     * L'exemption est NOMINATIVE et visible dans le code — pas une exclusion de
     * répertoire qui rendrait aveugle sur tout un pan du dépôt. Écrire ce
     * marqueur est une décision qu'on assume ligne par ligne.
     */
    public const EXEMPTION = 'licence-audit:citation';

    private function constatsDeLaLigne(string $ligne): array
    {
        $trouves = [];

        if (str_contains($ligne, self::EXEMPTION)) {
            return $trouves;
        }

        // Toute la détection travaille sur la ligne NORMALISÉE : minuscules,
        // sans accents, apostrophes uniformisées. « Période d'essai » et
        // « periode d’essai » doivent être vues pareil, et un seul passage
        // évite de payer deux fois le coût des expressions.
        $nue = self::sansAccents($ligne);

        foreach ($this->motifs() as [$regle, $declencheurs, $motif, $contexteRequis]) {
            // Garde bon marché avant l'expression : sur un dépôt entier, le
            // filtre par sous-chaîne écarte 99 % des lignes en O(n).
            if (! self::contientUn($nue, $declencheurs)) {
                continue;
            }

            // Certaines règles n'ont de sens que sur une ligne qui parle de
            // licence. « Plafond CNSS 750 000 FCFA » dans un barème social est
            // un montant légal, pas une grille tarifaire recopiée : le signaler
            // noierait les vrais défauts sous des dizaines de faux.
            if ($contexteRequis && ! self::contientUn($nue, self::CONTEXTE_LICENCE)) {
                continue;
            }

            if (preg_match($motif, $nue, $m, PREG_OFFSET_CAPTURE) === 1) {
                if (self::estNie($nue, (int) $m[0][1])) {
                    continue;
                }

                $trouves[] = ['regle' => $regle, 'motif' => $motif, 'extrait' => self::extrait($ligne, $m[0][0])];
            }
        }

        foreach ($this->termesBannis() as $terme) {
            $pos = strpos($nue, self::sansAccents($terme));

            if ($pos === false || self::estNie($nue, $pos)) {
                continue;
            }

            $trouves[] = [
                'regle'   => self::REGLE_BANNI,
                'motif'   => $terme,
                'extrait' => self::extrait($ligne, $terme),
            ];
        }

        // Deux motifs de la même règle sur la même ligne décrivent le même
        // défaut : une seule ligne de rapport, sinon le décompte ment.
        $vus = [];

        return array_values(array_filter($trouves, function ($c) use (&$vus) {
            if (isset($vus[$c['regle']])) {
                return false;
            }

            return $vus[$c['regle']] = true;
        }));
    }

    /**
     * Une ligne qui NIE la chose ne la commet pas.
     *
     * « ne concède aucune licence perpétuelle » et « jamais “compte bloqué” »
     * sont l'application de la règle, pas sa violation. Sans ce garde-fou,
     * l'audit rougirait sur les documents contractuels et sur les commentaires
     * qui rappellent l'interdit — c'est-à-dire exactement sur les fichiers les
     * mieux tenus.
     */
    private static function estNie(string $nue, int $position): bool
    {
        // La fenetre porte sur 160 caracteres AVANT et 80 APRES. Une phrase
        // comme « on n'ecrit ni "compte suspendu", ni "acces revoque" » place sa
        // negation loin devant le second terme, et « ... , terme banni par le
        // glossaire » la place APRES. Une fenetre trop courte faisait rougir
        // l'audit sur les fichiers les mieux commentes — ceux qui rappellent
        // precisement la regle.
        $avant  = substr($nue, max(0, $position - 160), min(160, $position));
        $apres  = substr($nue, $position, 80);

        return self::contientUn($avant, self::NEGATIONS)
            || self::contientUn($apres, self::NEGATIONS);
    }

    /** Marqueurs de négation ou de citation d'un interdit. */
    private const NEGATIONS = [
        'aucun', 'jamais', 'pas de', 'absence de', 'ne concede',
        'ne vend', 'ne propose', 'interdit', 'proscrit', 'banni', 'a ne pas',
        'plutot que', 'au lieu de', 'remplace par', 'eviter', 'evitez',
        // Marqueurs constates a l'usage : un commentaire qui EXPLIQUE la regle
        // la cite forcement, et c'est le contraire d'une violation.
        'terme banni', 'bannis', 'employait', 'annoncait', 'contredisait',
        'ne doit', 'ni ', 'obsolete', 'deprecie', 'correction', 'corrige',
        'faux', 'incorrect', 'erreur', 'ancienne', 'historique',
    ];

    /** Ce qui fait qu'une ligne parle bien de licence et pas d'autre chose. */
    private const CONTEXTE_LICENCE = [
        'licence', 'license', 'abonnement', 'formule', 'offre', 'palier',
        'essai', 'decouverte', 'gratuit', 'souscription', 'tarif', 'forfait',
        'plan ', 'plans', 'trial', 'saas',
    ];

    private static function contientUn(string $nue, array $aiguilles): bool
    {
        foreach ($aiguilles as $aiguille) {
            if (str_contains($nue, $aiguille)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Les motifs de la section 12.8, adaptés au dépôt.
     *
     * Chaque entrée : [règle, déclencheurs bon marché, expression, contexte
     * licence exigé ?]. Les expressions s'appliquent à une ligne déjà mise en
     * minuscules et désaccentuée : inutile d'y écrire des classes [ée] ou le
     * drapeau /i.
     *
     * @return list<array{0:string,1:list<string>,2:string,3:bool}>
     */
    private function motifs(): array
    {
        static $cache = null;

        if ($cache !== null) {
            return $cache;
        }

        $noms    = implode('|', $this->nomsDeCompteurs());
        $resume  = self::sansAccents($this->resumePlafond());
        $motifs  = [];

        // « 14 jours d'essai », « 7 j de grace », « 90 jours gratuit ».
        // Sans exigence de contexte : la tournure est déjà spécifique.
        $motifs[] = [self::REGLE_DUREE, ['jour', ' j '],
            "/\\b\\d{1,3}\\s*(?:jours?|j)\\b[^\\n]{0,25}?(?:d'essai|essai|gratuit|de grace|de retention|de prolongation)/u", false];

        // « essai de 14 jours », « donnees conservees 90 jours ». Tournure plus
        // lâche : on exige le contexte licence, sinon « purge des jobs > 7
        // jours » ou « rétention des sauvegardes 30 jours » rougiraient.
        $motifs[] = [self::REGLE_DUREE, ['essai', 'grace', 'retention', 'prolongation', 'conserv', 'purge'],
            "/(?:essai|grace|retention|prolongation|conserve|purge)[^\\n]{0,30}?\\b\\d{1,3}\\s*(?:jours?|mois|semaines?)\\b/u", true];

        // Le résumé de plafond, mot pour mot, hors de la configuration.
        if ($resume !== '') {
            $motifs[] = [self::REGLE_PLAFOND, [$resume], '/' . preg_quote($resume, '/') . '/u', false];
        }

        // « 5 courriers par mois », « 5 courriers maximum » — le compteur
        // métier de la solution suffit à qualifier la ligne.
        $motifs[] = [self::REGLE_PLAFOND, $this->nomsDeCompteurs(),
            "/\\b\\d{1,4}\\s*(?:{$noms})s?\\b[^\\n]{0,15}?(?:par mois|\\/ ?mois|maximum|max\\b|inclus)/u", false];

        // « plafond : 5 », « quota de 5 » — contexte exigé : les barèmes
        // sociaux (plafond CNSS, plafond CIPRES) sont des montants légaux.
        $motifs[] = [self::REGLE_PLAFOND, ['plafond', 'quota'],
            "/(?:plafond|quota)[^\\n]{0,12}?\\b\\d{1,4}\\b/u", true];

        // Perpétuité — la ligne doit parler de licence, sinon « stock
        // illimité » ferait rougir l'audit sans rapport avec le sujet.
        $motifs[] = [self::REGLE_PERPETUITE, ['perpetuel', ' a vie', 'illimit', 'sans limite', 'lifetime', 'unlimited'],
            "/(?:perpetuel|\\ba vie\\b|illimite|sans limite|lifetime|unlimited)/u", true];

        // « 4 900 FCFA », « 0 FCFA » — les prix de la grille vivent dans
        // `plans`. Contexte exigé : un salaire minimum ou un barème d'impôt en
        // FCFA n'est pas une grille tarifaire recopiée.
        $motifs[] = [self::REGLE_PRIX, ['fcfa', 'xof'],
            "/\\b\\d{1,4}(?:[  .]?\\d{3})*\\s*(?:fcfa|xof|f ?cfa)\\b/u", true];

        return $cache = $motifs;
    }

    /** Noms de compteurs métier déduits de la configuration, jamais devinés. */
    private function nomsDeCompteurs(): array
    {
        $noms = [];

        foreach (array_keys($this->config['gratuit']['quotas'] ?? []) as $compteur) {
            // `courriers_mois` → `courrier` ; on recolle le pluriel dans le motif.
            $base = preg_replace('/_(mois|total|an|jour)$/', '', $compteur);
            $base = rtrim((string) $base, 's');
            $noms[] = preg_quote($base, '/');
        }

        return $noms ?: ['courrier'];
    }

    private function resumePlafond(): string
    {
        return (string) ($this->config['gratuit']['resume'] ?? '');
    }

    /** @return list<string> */
    private function termesBannis(): array
    {
        return array_values(array_filter(
            array_map('strval', $this->config['termes_bannis'] ?? []),
            fn ($t) => trim($t) !== ''
        ));
    }

    // ─── Parcours du dépôt ───────────────────────────────────────────────────

    /** @return iterable<string,string> chemin absolu => chemin relatif */
    private function fichiers(): iterable
    {
        $iterateur = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($this->racine, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterateur as $item) {
            /** @var \SplFileInfo $item */
            $relatif = self::relatif($this->racine, $item->getPathname());

            if ($this->estExclu($relatif)) {
                continue;
            }

            if (! $item->isFile()) {
                continue;
            }

            if (! in_array(strtolower($item->getExtension()), self::EXTENSIONS, true)) {
                continue;
            }

            if ($item->getSize() > self::TAILLE_MAX) {
                $this->tropGros[] = $relatif;
                continue;
            }

            yield $item->getPathname() => $relatif;
        }
    }

    public function estExclu(string $relatif): bool
    {
        foreach (self::EXCLUSIONS as $motif) {
            if (str_ends_with($motif, '/')) {
                if (str_starts_with($relatif, $motif) || str_contains($relatif, '/' . $motif)) {
                    return true;
                }
                continue;
            }

            if ($relatif === $motif || str_ends_with($relatif, $motif)) {
                return true;
            }
        }

        return false;
    }

    // ─── Utilitaires ─────────────────────────────────────────────────────────

    private static function relatif(string $racine, string $chemin): string
    {
        $racine = rtrim(str_replace('\\', '/', $racine), '/') . '/';
        $chemin = str_replace('\\', '/', $chemin);

        return str_starts_with($chemin, $racine) ? substr($chemin, strlen($racine)) : $chemin;
    }

    /** Extrait resserré autour de la trouvaille : une ligne minifiée ne doit pas noyer le rapport. */
    private static function extrait(string $ligne, string $trouvaille): string
    {
        $ligne = trim($ligne);

        if (mb_strlen($ligne) <= 160) {
            return $ligne;
        }

        $pos   = mb_stripos($ligne, $trouvaille);
        $debut = max(0, ($pos === false ? 0 : $pos) - 60);

        return ($debut > 0 ? '…' : '') . mb_substr($ligne, $debut, 160) . '…';
    }

    public static function sansAccents(string $texte): string
    {
        $table = [
            'à'=>'a','â'=>'a','ä'=>'a','á'=>'a','ã'=>'a','å'=>'a',
            'ç'=>'c','è'=>'e','é'=>'e','ê'=>'e','ë'=>'e',
            'î'=>'i','ï'=>'i','í'=>'i','ì'=>'i',
            'ô'=>'o','ö'=>'o','ó'=>'o','ò'=>'o','õ'=>'o',
            'ù'=>'u','û'=>'u','ü'=>'u','ú'=>'u','ÿ'=>'y','ñ'=>'n',
            '’'=>"'", '‘'=>"'", '`'=>"'",
        ];

        $texte = mb_strtolower($texte, 'UTF-8');

        return strtr($texte, $table);
    }
}
