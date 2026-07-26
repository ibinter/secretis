<?php

namespace App\Services;

use App\Models\Document;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * DocumentClassifierService — Classification automatique et extraction de métadonnées
 *
 * Pipeline :
 *   1. Règles regex rapides (< 5 ms) — couverture ~80 % des cas
 *   2. Appel LLM si confidence < seuil (Anthropic Claude via API)
 *   3. Extraction de métadonnées structurées selon la catégorie détectée
 *   4. Détection de doublons (SHA-256 + similarité textuelle)
 */
class DocumentClassifierService
{
    // -----------------------------------------------------------------------
    // Catégories
    // -----------------------------------------------------------------------

    public const CATEGORY_CONTRAT      = 'CONTRAT';
    public const CATEGORY_FACTURE      = 'FACTURE';
    public const CATEGORY_COURRIER     = 'COURRIER';
    public const CATEGORY_RAPPORT      = 'RAPPORT';
    public const CATEGORY_PV_REUNION   = 'PV_REUNION';
    public const CATEGORY_FICHE_RH     = 'FICHE_RH';
    public const CATEGORY_BON_COMMANDE = 'BON_COMMANDE';
    public const CATEGORY_DEVIS        = 'DEVIS';
    public const CATEGORY_DECISION     = 'DECISION';
    public const CATEGORY_AUTRE        = 'AUTRE';

    /** Durées de conservation OHADA en années, par catégorie */
    private const RETENTION_YEARS = [
        self::CATEGORY_CONTRAT      => 10,
        self::CATEGORY_FACTURE      => 10,
        self::CATEGORY_COURRIER     => 5,
        self::CATEGORY_RAPPORT      => 5,
        self::CATEGORY_PV_REUNION   => 10,
        self::CATEGORY_FICHE_RH     => 30,
        self::CATEGORY_BON_COMMANDE => 7,
        self::CATEGORY_DEVIS        => 5,
        self::CATEGORY_DECISION     => 10,
        self::CATEGORY_AUTRE        => 5,
    ];

    /** Niveau de confidentialité suggéré par catégorie */
    private const CONFIDENTIALITY = [
        self::CATEGORY_CONTRAT      => 'confidential',
        self::CATEGORY_FACTURE      => 'internal',
        self::CATEGORY_COURRIER     => 'internal',
        self::CATEGORY_RAPPORT      => 'internal',
        self::CATEGORY_PV_REUNION   => 'internal',
        self::CATEGORY_FICHE_RH     => 'secret',
        self::CATEGORY_BON_COMMANDE => 'internal',
        self::CATEGORY_DEVIS        => 'confidential',
        self::CATEGORY_DECISION     => 'confidential',
        self::CATEGORY_AUTRE        => 'internal',
    ];

    /** Dossiers GED recommandés par catégorie */
    private const SUGGESTED_FOLDERS = [
        self::CATEGORY_CONTRAT      => 'GED/Contrats',
        self::CATEGORY_FACTURE      => 'GED/Comptabilité/Factures',
        self::CATEGORY_COURRIER     => 'GED/Courriers',
        self::CATEGORY_RAPPORT      => 'GED/Rapports',
        self::CATEGORY_PV_REUNION   => 'GED/Réunions/PV',
        self::CATEGORY_FICHE_RH     => 'GED/RH/Fiches',
        self::CATEGORY_BON_COMMANDE => 'GED/Achats/Bons de commande',
        self::CATEGORY_DEVIS        => 'GED/Commercial/Devis',
        self::CATEGORY_DECISION     => 'GED/Décisions',
        self::CATEGORY_AUTRE        => 'GED/Divers',
    ];

    // -----------------------------------------------------------------------
    // Règles regex par catégorie (patterns sur nom + texte OCR)
    // -----------------------------------------------------------------------

    private const REGEX_RULES = [
        self::CATEGORY_FACTURE => [
            '/\bfacture\b/ui',
            '/\binvoice\b/ui',
            '/\bfact(?:ure)?\s*n[°o]?\s*[\d\-\/]+/ui',
            '/\bttc\b|\bht\b|\btva\b/ui',
            '/\bmontant\s+(?:total|ttc|ht)/ui',
        ],
        self::CATEGORY_CONTRAT => [
            '/\bcontrat\b/ui',
            '/\bconvention\b/ui',
            '/\baccord\b.*\bparties\b/ui',
            '/\bentre\s+(?:les\s+)?(?:soussign[ée]s?|parties)/ui',
            '/\bclause[s]?\b.*\barticle[s]?\b/ui',
            '/\bdu[ré]e\b.*\bcontrat\b/ui',
        ],
        self::CATEGORY_COURRIER => [
            '/\bobjet\s*:/ui',
            '/\bmonsieur\b|\bmadame\b|\bcher\b/ui',
            '/\bveuillez\b|\bagr[ée]er\b/ui',
            '/\bà\s+l\'attention\b/ui',
            '/\blettre\b|\bcourrier\b/ui',
            '/\bcordialement\b|\bsinc[eè]rement\b/ui',
        ],
        self::CATEGORY_PV_REUNION => [
            '/\bproc[eè]s[\-\s]verbal\b/ui',
            '/\bp\.?v\.?\b.*\br[eé]union\b/ui',
            '/\bparticipants?\b.*\bpr[eé]sents?\b/ui',
            '/\bcompte[\-\s]rendu\b.*\br[eé]union\b/ui',
            '/\bor(?:dre)?\s*du\s*jour\b/ui',
            '/\bd[eé]cisions?\s+pris(?:es)?\b/ui',
        ],
        self::CATEGORY_RAPPORT => [
            '/\brapport\b/ui',
            '/\br[eé]sum[eé]\s+ex[eé]cutif\b/ui',
            '/\bconclusions?\b/ui',
            '/\banalyse\b.*\br[eé]sultats?\b/ui',
            '/\bintroduction\b.*\bm[eé]thodologie\b/ui',
        ],
        self::CATEGORY_FICHE_RH => [
            '/\bfiche\s+(?:de\s+)?(?:poste|paie|salaire|employ[eé])\b/ui',
            '/\bcontrat\s+de\s+travail\b/ui',
            '/\bcong[eé]s?\b|\babsence\b/ui',
            '/\bsalaire\b|\br[eé]mun[eé]ration\b/ui',
            '/\bressources\s+humaines\b|\bRH\b/u',
        ],
        self::CATEGORY_BON_COMMANDE => [
            '/\bbon\s+de\s+commande\b/ui',
            '/\bcommande\s+n[°o]?\s*[\d\-\/]+/ui',
            '/\bpurchase\s+order\b/ui',
            '/\bP\.?O\.?\s*#?\s*[\d\-\/]+/ui',
            '/\bquantit[eé]\b.*\bunit[eé]\b.*\bprix\b/ui',
        ],
        self::CATEGORY_DEVIS => [
            '/\bdevis\b/ui',
            '/\bproposition\s+(?:commerciale|tarifaire|de\s+prix)\b/ui',
            '/\bquotation\b|\bquote\b/ui',
            '/\bvalable\s+(?:jusqu\'(?:au|à)|[\d]+\s+jours?)\b/ui',
            '/\bestim[ae]tion\b.*\bprix\b/ui',
        ],
        self::CATEGORY_DECISION => [
            '/\bd[eé]cision\b/ui',
            '/\barrêt[eé]\b|\bdirective\b/ui',
            '/\bvu\s+la\s+loi\b|\bvu\s+le\s+d[eé]cret\b/ui',
            '/\bnous\s+d[eé]cidons\b|\bil\s+est\s+d[eé]cid[eé]\b/ui',
            '/\baugmente[r]?\b.*\bsalaire\b|\bpromu\b/ui',
        ],
    ];

    // -----------------------------------------------------------------------
    // API publique
    // -----------------------------------------------------------------------

    /**
     * Classifie un document et retourne un ClassificationResult.
     *
     * @return array{
     *   category: string,
     *   confidence: int,
     *   tags: string[],
     *   confidentiality: string,
     *   method: string
     * }
     */
    public function classifyDocument(Document $document): array
    {
        $text = $this->buildTextCorpus($document);

        // Étape 1 : règles regex rapides
        [$category, $confidence] = $this->applyRegexRules($text);

        // Étape 2 : LLM si confiance insuffisante
        if ($confidence < 70) {
            [$category, $confidence] = $this->classifyWithLlm($text, $category, $confidence);
            $method = 'llm';
        } else {
            $method = 'regex';
        }

        return [
            'category'        => $category,
            'confidence'      => $confidence,
            'tags'            => $this->generateTags($document, $category, $text),
            'confidentiality' => self::CONFIDENTIALITY[$category] ?? 'internal',
            'method'          => $method,
        ];
    }

    /**
     * Retourne le chemin du dossier GED recommandé pour un document.
     */
    public function suggestFolder(Document $document): string
    {
        $classification = $this->classifyDocument($document);

        return self::SUGGESTED_FOLDERS[$classification['category']] ?? 'GED/Divers';
    }

    /**
     * Extrait les métadonnées structurées selon la catégorie du document.
     *
     * @return array<string, mixed>
     */
    public function extractKeyMetadata(Document $document, string $category): array
    {
        $text = $this->buildTextCorpus($document);

        return match ($category) {
            self::CATEGORY_CONTRAT      => $this->extractContratMetadata($text),
            self::CATEGORY_FACTURE      => $this->extractFactureMetadata($text),
            self::CATEGORY_COURRIER     => $this->extractCourrierMetadata($text),
            self::CATEGORY_PV_REUNION   => $this->extractPvMetadata($text),
            self::CATEGORY_FICHE_RH     => $this->extractRhMetadata($text),
            self::CATEGORY_BON_COMMANDE => $this->extractBonCommandeMetadata($text),
            self::CATEGORY_DEVIS        => $this->extractDevisMetadata($text),
            default                     => [],
        };
    }

    /**
     * Détecte les doublons potentiels d'un document.
     *
     * @return array{exact: Document[], similar: Document[]}
     */
    public function detectDuplicates(Document $document): array
    {
        $hash    = $this->computeHash($document);
        $orgId   = $document->organization_id;

        // Doublons exacts (même hash SHA-256)
        $exact = Document::where('organization_id', $orgId)
            ->where('id', '!=', $document->id)
            ->where('sha256_hash', $hash)
            ->get()
            ->toArray();

        // Doublons similaires (similarité textuelle > 90 %)
        $similar = [];
        if (! empty($document->text_content)) {
            $candidates = Document::where('organization_id', $orgId)
                ->where('id', '!=', $document->id)
                ->whereNotNull('text_content')
                ->select(['id', 'title', 'text_content', 'created_at'])
                ->limit(200)
                ->get();

            foreach ($candidates as $candidate) {
                $similarity = $this->textSimilarity(
                    $document->text_content ?? '',
                    $candidate->text_content ?? ''
                );
                if ($similarity >= 90) {
                    $similar[] = array_merge($candidate->toArray(), ['similarity' => $similarity]);
                }
            }
        }

        return compact('exact', 'similar');
    }

    /**
     * Retourne la durée de conservation en années selon la catégorie OHADA.
     */
    public function suggestRetentionPolicy(Document $document): int
    {
        // La catégorie peut être déjà présente dans les métadonnées du document
        $category = $document->category ?? self::CATEGORY_AUTRE;

        return self::RETENTION_YEARS[$category] ?? 5;
    }

    /**
     * Calcule le hash SHA-256 du fichier du document.
     */
    public function computeHash(Document $document): string
    {
        try {
            $path = storage_path('app/private/' . $document->file_path);
            if (file_exists($path)) {
                return hash_file('sha256', $path);
            }
        } catch (\Throwable $e) {
            Log::warning('DocumentClassifier: impossible de hasher le fichier', [
                'document_id' => $document->id,
                'error'       => $e->getMessage(),
            ]);
        }

        // Fallback : hash du titre + taille
        return hash('sha256', $document->title . ':' . $document->file_size);
    }

    // -----------------------------------------------------------------------
    // Moteur regex
    // -----------------------------------------------------------------------

    /**
     * Applique les règles regex et retourne [catégorie, confiance].
     *
     * @return array{0: string, 1: int}
     */
    private function applyRegexRules(string $text): array
    {
        $scores = [];

        foreach (self::REGEX_RULES as $category => $patterns) {
            $matches = 0;
            $total   = count($patterns);

            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $text)) {
                    $matches++;
                }
            }

            if ($matches > 0) {
                // Score proportionnel aux patterns matchés
                $scores[$category] = (int) round(($matches / $total) * 100);
            }
        }

        if (empty($scores)) {
            return [self::CATEGORY_AUTRE, 30];
        }

        arsort($scores);
        $topCategory   = array_key_first($scores);
        $topScore      = $scores[$topCategory];

        // Si deux catégories sont très proches, on est moins sûr
        $scoreValues = array_values($scores);
        if (count($scoreValues) > 1 && ($scoreValues[0] - $scoreValues[1]) < 20) {
            $topScore = max(50, $topScore - 20);
        }

        return [$topCategory, min(95, $topScore)];
    }

    // -----------------------------------------------------------------------
    // Classification LLM (Anthropic Claude)
    // -----------------------------------------------------------------------

    /**
     * Appelle l'API Anthropic pour affiner la classification quand les règles
     * ne donnent pas suffisamment confiance.
     *
     * @return array{0: string, 1: int}
     */
    private function classifyWithLlm(string $text, string $suggestedCategory, int $currentConfidence): array
    {
        $apiKey = config('services.anthropic.api_key');
        if (! $apiKey) {
            Log::warning('DocumentClassifier: clé API Anthropic absente, classification regex uniquement.');
            return [$suggestedCategory, $currentConfidence];
        }

        $categories = implode(', ', [
            self::CATEGORY_CONTRAT,
            self::CATEGORY_FACTURE,
            self::CATEGORY_COURRIER,
            self::CATEGORY_RAPPORT,
            self::CATEGORY_PV_REUNION,
            self::CATEGORY_FICHE_RH,
            self::CATEGORY_BON_COMMANDE,
            self::CATEGORY_DEVIS,
            self::CATEGORY_DECISION,
            self::CATEGORY_AUTRE,
        ]);

        // Tronquer le texte pour éviter une facture excessivement longue
        $excerpt = Str::limit($text, 1500);

        $prompt = <<<PROMPT
Tu es un assistant de classification documentaire pour un ERP africain (droit OHADA).
Classifie ce document dans l'une de ces catégories : {$categories}.
Réponds UNIQUEMENT avec un objet JSON valide sur une seule ligne :
{"category":"CATEGORIE","confidence":SCORE,"reason":"explication courte"}
Le score est un entier entre 0 et 100. Ne génère aucun autre texte.

EXTRAIT DU DOCUMENT :
{$excerpt}
PROMPT;

        try {
            $response = Http::withHeaders([
                'x-api-key'         => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->timeout(15)->post('https://api.anthropic.com/v1/messages', [
                'model'      => 'claude-haiku-4-5',
                'max_tokens' => 128,
                'messages'   => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            if ($response->successful()) {
                $content = $response->json('content.0.text', '');
                $data    = json_decode(trim($content), true);

                if (is_array($data) && isset($data['category'], $data['confidence'])) {
                    $validCategories = [
                        self::CATEGORY_CONTRAT, self::CATEGORY_FACTURE, self::CATEGORY_COURRIER,
                        self::CATEGORY_RAPPORT, self::CATEGORY_PV_REUNION, self::CATEGORY_FICHE_RH,
                        self::CATEGORY_BON_COMMANDE, self::CATEGORY_DEVIS, self::CATEGORY_DECISION,
                        self::CATEGORY_AUTRE,
                    ];

                    if (in_array($data['category'], $validCategories, true)) {
                        return [$data['category'], min(99, (int) $data['confidence'])];
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error('DocumentClassifier LLM error', ['error' => $e->getMessage()]);
        }

        return [$suggestedCategory, $currentConfidence];
    }

    // -----------------------------------------------------------------------
    // Extracteurs de métadonnées par catégorie
    // -----------------------------------------------------------------------

    private function extractContratMetadata(string $text): array
    {
        return [
            'parties'         => $this->extractPattern($text, '/entre\s+(.+?)\s+et\s+(.+?)(?:,|\.|\n)/ui', 0),
            'date_signature'  => $this->extractDate($text, 'sign[eé]|conclu|établi'),
            'duree'           => $this->extractPattern($text, '/dur[eé]e\s*(?:du\s+contrat\s*)?:?\s*(\d+\s*(?:mois|ans?|année?s?))/ui'),
            'montant'         => $this->extractMontant($text),
            'date_expiration' => $this->extractDate($text, 'expire|expiration|[eé]ch[eé]ance|fin\s+du\s+contrat'),
        ];
    }

    private function extractFactureMetadata(string $text): array
    {
        return [
            'fournisseur'  => $this->extractPattern($text, '/(?:de\s+chez\s+|fournisseur\s*:?\s*)([A-ZÉÀÂ][^\n,]{2,50})/ui'),
            'numero'       => $this->extractPattern($text, '/(?:facture|invoice)\s*n[°o]?\s*:?\s*([\w\-\/]+)/ui'),
            'date'         => $this->extractDate($text, 'date\s+(?:de\s+)?(?:la\s+)?facture|émis(?:e)?\s+le'),
            'montant_ht'   => $this->extractPattern($text, '/(?:montant\s+)?HT\s*:?\s*([\d\s]+[,.]?\d*)\s*(?:FCFA|XOF|EUR|€)?/ui'),
            'montant_ttc'  => $this->extractPattern($text, '/(?:montant\s+)?TTC\s*:?\s*([\d\s]+[,.]?\d*)\s*(?:FCFA|XOF|EUR|€)?/ui'),
            'echeance'     => $this->extractDate($text, '[eé]ch[eé]ance|payable\s+(?:le|avant|au)'),
        ];
    }

    private function extractCourrierMetadata(string $text): array
    {
        return [
            'expediteur'  => $this->extractPattern($text, '/(?:de\s*:|expediteur\s*:|de\s+la\s+part\s+de\s*:)\s*([^\n]{3,80})/ui'),
            'destinataire'=> $this->extractPattern($text, '/(?:à\s*:|destinataire\s*:|pour\s*:)\s*([^\n]{3,80})/ui'),
            'objet'       => $this->extractPattern($text, '/objet\s*:?\s*([^\n]{3,150})/ui'),
            'date'        => $this->extractDate($text, '(?:fait\s+(?:à|le)|date|le)\s*:?'),
            'reference'   => $this->extractPattern($text, '/(?:r[eé]f[.:]?|r[eé]f[eé]rence\s*:)\s*([\w\-\/]+)/ui'),
        ];
    }

    private function extractPvMetadata(string $text): array
    {
        // Extraction des participants
        $participants = [];
        if (preg_match('/(?:participants?|pr[eé]sents?)\s*:?\s*((?:[^\n]+\n?){1,20})/ui', $text, $m)) {
            $lines = preg_split('/\n/', trim($m[1]));
            foreach ($lines as $line) {
                $line = trim($line, " \t-•*·");
                if (strlen($line) > 2 && strlen($line) < 100) {
                    $participants[] = $line;
                }
            }
        }

        // Extraction des décisions
        $decisions = [];
        if (preg_match('/(?:d[eé]cisions?\s+pris(?:es)?|il\s+a\s+[eé]t[eé]\s+d[eé]cid[eé])\s*:?\s*((?:[^\n]+\n?){1,30})/ui', $text, $m)) {
            $lines = preg_split('/\n/', trim($m[1]));
            foreach ($lines as $line) {
                $line = trim($line, " \t-•*·1234567890.");
                if (strlen($line) > 5) {
                    $decisions[] = $line;
                }
            }
        }

        return [
            'date'              => $this->extractDate($text, 'r[eé]union\s+du|tenue\s+le|du\s+\d+'),
            'participants'      => $participants,
            'decisions'         => array_slice($decisions, 0, 20),
            'prochaine_reunion' => $this->extractDate($text, 'prochaine\s+r[eé]union|prochaine\s+s[eé]ance'),
        ];
    }

    private function extractRhMetadata(string $text): array
    {
        return [
            'employe'        => $this->extractPattern($text, '/(?:employ[eé]|salari[eé]|agent)\s*:?\s*([A-ZÉÀÂ][^\n,]{2,60})/ui'),
            'poste'          => $this->extractPattern($text, '/(?:poste|fonction|titre)\s*:?\s*([^\n,]{3,80})/ui'),
            'salaire'        => $this->extractPattern($text, '/(?:salaire|r[eé]mun[eé]ration)\s*(?:brut(?:e)?|net(?:te)?)?\s*:?\s*([\d\s]+[,.]?\d*)\s*(?:FCFA|XOF|EUR|€)?/ui'),
            'date_embauche'  => $this->extractDate($text, 'embauch[eé]|entr[eé]e\s+en\s+service|prise\s+de\s+fonctions'),
            'departement'    => $this->extractPattern($text, '/(?:d[eé]partement|direction|service)\s*:?\s*([^\n,]{3,60})/ui'),
        ];
    }

    private function extractBonCommandeMetadata(string $text): array
    {
        return [
            'fournisseur' => $this->extractPattern($text, '/(?:fournisseur|vendeur|prestataire)\s*:?\s*([^\n,]{3,80})/ui'),
            'numero'      => $this->extractPattern($text, '/(?:bon\s+de\s+commande|B\.?C\.?|P\.?O\.?)\s*n[°o]?\s*:?\s*([\w\-\/]+)/ui'),
            'date'        => $this->extractDate($text, 'date\s+(?:de\s+)?(?:la\s+)?commande|command[eé]\s+le'),
            'montant'     => $this->extractMontant($text),
            'livraison'   => $this->extractDate($text, 'livraison|d[eé]livery|livr[eé]\s+(?:le|avant|au)'),
        ];
    }

    private function extractDevisMetadata(string $text): array
    {
        return [
            'client'       => $this->extractPattern($text, '/(?:client|prospect|[àa]\s+l\'attention\s+de)\s*:?\s*([^\n,]{3,80})/ui'),
            'numero'       => $this->extractPattern($text, '/devis\s*n[°o]?\s*:?\s*([\w\-\/]+)/ui'),
            'date'         => $this->extractDate($text, 'date\s+du\s+devis|[eé]tabli\s+le|devis\s+du'),
            'validite'     => $this->extractPattern($text, '/valable\s+(?:jusqu\'(?:au|à)|pendant)\s+([^\n.]{3,50})/ui'),
            'montant_ttc'  => $this->extractPattern($text, '/(?:total|montant)\s+TTC\s*:?\s*([\d\s]+[,.]?\d*)\s*(?:FCFA|XOF|EUR|€)?/ui'),
        ];
    }

    // -----------------------------------------------------------------------
    // Utilitaires privés
    // -----------------------------------------------------------------------

    private function buildTextCorpus(Document $document): string
    {
        $parts = [
            $document->title ?? '',
            $document->description ?? '',
            $document->text_content ?? '',   // texte OCR
        ];

        return implode("\n", array_filter($parts));
    }

    private function generateTags(Document $document, string $category, string $text): array
    {
        $tags = [strtolower(str_replace('_', '-', $category))];

        // Tags basés sur mots-clés fréquents dans le texte
        $keywords = [
            'urgent'       => '/\burgent\b|\bimm[eé]diat\b/ui',
            'confidentiel' => '/\bconfidentiel\b|\bstrictement\b/ui',
            'archivé'      => '/\barchiv[eé]\b/ui',
            'signé'        => '/\bsign[eé]\b|\bauthentifi[eé]\b/ui',
            'approuvé'     => '/\bapprouv[eé]\b|\bvalid[eé]\b/ui',
        ];

        foreach ($keywords as $tag => $pattern) {
            if (preg_match($pattern, $text)) {
                $tags[] = $tag;
            }
        }

        if ($document->file_size && $document->file_size > 5 * 1024 * 1024) {
            $tags[] = 'volumieux';
        }

        return array_unique($tags);
    }

    private function extractPattern(string $text, string $pattern, int $group = 1): ?string
    {
        if (preg_match($pattern, $text, $m)) {
            return isset($m[$group]) ? trim($m[$group]) : null;
        }
        return null;
    }

    private function extractDate(string $text, string $contextPattern): ?string
    {
        // Date au format DD/MM/YYYY ou DD-MM-YYYY précédée d'un contexte
        $pattern = '/(?:' . $contextPattern . ')\s*:?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/ui';
        if (preg_match($pattern, $text, $m)) {
            return trim($m[1]);
        }

        // Recherche générique d'une date dans le texte
        if (preg_match('/\b(\d{1,2}[\/-]\d{1,2}[\/-]\d{4})\b/', $text, $m)) {
            return $m[1];
        }

        return null;
    }

    private function extractMontant(string $text): ?string
    {
        if (preg_match('/(?:total|montant)\s*(?:TTC|HT)?\s*:?\s*([\d\s]+[,.]?\d*)\s*(?:FCFA|XOF|EUR|€)/ui', $text, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    /**
     * Calcule la similarité textuelle entre deux chaînes (algorithme bigrams).
     * Retourne un score entre 0 et 100.
     */
    private function textSimilarity(string $a, string $b): int
    {
        if (empty($a) || empty($b)) {
            return 0;
        }

        // Normaliser et tronquer pour la performance
        $a = strtolower(substr(preg_replace('/\s+/', ' ', $a), 0, 5000));
        $b = strtolower(substr(preg_replace('/\s+/', ' ', $b), 0, 5000));

        if ($a === $b) {
            return 100;
        }

        // Bigrams
        $bigramsA = $this->getBigrams($a);
        $bigramsB = $this->getBigrams($b);

        if (empty($bigramsA) || empty($bigramsB)) {
            return 0;
        }

        $intersection = array_intersect($bigramsA, $bigramsB);
        $similarity   = (2 * count($intersection)) / (count($bigramsA) + count($bigramsB));

        return (int) round($similarity * 100);
    }

    private function getBigrams(string $text): array
    {
        $bigrams = [];
        $words   = explode(' ', $text);
        for ($i = 0; $i < count($words) - 1; $i++) {
            $bigrams[] = $words[$i] . ' ' . $words[$i + 1];
        }
        return $bigrams;
    }
}
