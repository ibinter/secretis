<?php

declare(strict_types=1);

namespace App\Services\Sara;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * IntentClassifier — Classification des intentions utilisateur pour SARA v2.
 *
 * Catégories principales :
 *   QUERY     — Question sur les données ou le système
 *   ACTION    — Demande d'exécution d'une tâche
 *   SMALLTALK — Conversation informelle, salutations
 *   HELP      — Demande d'aide sur SARA elle-même
 *
 * Sous-catégories pour ACTION :
 *   CREATE_EVENT  — "Crée une réunion / un événement"
 *   CREATE_TASK   — "Ajoute une tâche / rappel"
 *   SEARCH        — "Cherche / trouve le document / courrier"
 *   SUMMARIZE     — "Résume la réunion / le projet"
 *   REPORT        — "Génère / montre le rapport"
 *   SCHEDULE      — "Trouve un créneau libre"
 *   DRAFT_LETTER  — "Rédige un courrier"
 *
 * Entités extraites :
 *   dates, personnes, salles, modules, montants
 */
class IntentClassifier
{
    // ── Patterns rapides (sans LLM) ────────────────────────────────────────────

    private const ACTION_PATTERNS = [
        'CREATE_EVENT' => [
            'crée', 'créer', 'ajoute', 'ajouter', 'planifie', 'planifier',
            'organise', 'organiser', 'programme', 'programmer', 'réunion',
            'événement', 'meeting', 'rdv', 'rendez-vous',
        ],
        'CREATE_TASK' => [
            'tâche', 'todo', 'rappel', 'faire', 'assigne', 'assigner',
            'délègue', 'déléguer', 'urgent', 'deadline',
        ],
        'SEARCH' => [
            'cherche', 'chercher', 'trouve', 'trouver', 'recherche', 'rechercher',
            'où est', 'montre-moi', 'affiche', 'liste',
        ],
        'SUMMARIZE' => [
            'résume', 'résumer', 'synthèse', 'synthétise', 'compte rendu',
            'résumé', 'bilan',
        ],
        'REPORT' => [
            'rapport', 'reporting', 'statistiques', 'analytics', 'kpi',
            'tableau de bord', 'génère un rapport',
        ],
        'SCHEDULE' => [
            'créneau', 'disponibilité', 'libre', 'quand est-ce qu\'on peut',
            'trouve une date', 'planifie une heure',
        ],
        'DRAFT_LETTER' => [
            'courrier', 'lettre', 'email', 'mail', 'rédige', 'rédiger',
            'écris', 'écrire', 'draft',
        ],
    ];

    private const SMALLTALK_PATTERNS = [
        'bonjour', 'bonsoir', 'salut', 'hello', 'hi', 'coucou', 'bonne journée',
        'ça va', 'comment vas-tu', 'comment allez-vous', 'merci', 'au revoir',
        'bonne nuit', 'à bientôt', 'à demain',
    ];

    private const HELP_PATTERNS = [
        'aide', 'help', 'comment faire', 'comment utiliser', 'que peux-tu faire',
        'quelles sont tes capacités', 'explique-moi', 'tutoriel', 'guide',
        'documentation', 'manuel',
    ];

    // ── Constructeur ───────────────────────────────────────────────────────────

    public function __construct(
        private readonly string $provider = 'groq',
        private readonly string $groqKey  = '',
    ) {
    }

    // =========================================================================
    // METHODE PRINCIPALE
    // =========================================================================

    /**
     * Classifie un message utilisateur.
     *
     * @param string $message         Message de l'utilisateur
     * @param array  $context         Contexte enrichi (rôle, modules, etc.)
     * @param array  $conversationHistory Historique récent
     *
     * @return array {
     *   type: 'QUERY'|'ACTION'|'SMALLTALK'|'HELP',
     *   sub_type: string|null,
     *   confidence: float,
     *   entities: array,
     *   requires_llm: bool
     * }
     */
    public function classify(string $message, array $context = [], array $conversationHistory = []): array
    {
        $normalized = $this->normalize($message);

        // 1. Détection rapide par patterns (sans LLM)
        $fastResult = $this->classifyByPatterns($normalized);

        if ($fastResult['confidence'] >= 0.85) {
            $fastResult['entities']     = $this->extractEntitiesFast($message);
            $fastResult['requires_llm'] = false;
            return $fastResult;
        }

        // 2. Classification par LLM si ambiguïté
        try {
            $llmResult = $this->classifyByLLM($message, $context, $conversationHistory);
            $llmResult['requires_llm'] = true;
            return $llmResult;

        } catch (\Throwable $e) {
            Log::warning('IntentClassifier::classifyByLLM failed, fallback to patterns', [
                'error' => $e->getMessage(),
            ]);

            $fastResult['entities']     = $this->extractEntitiesFast($message);
            $fastResult['requires_llm'] = false;
            return $fastResult;
        }
    }

    // =========================================================================
    // CLASSIFICATION PAR PATTERNS
    // =========================================================================

    private function classifyByPatterns(string $normalized): array
    {
        // Small talk
        foreach (self::SMALLTALK_PATTERNS as $pattern) {
            if (str_contains($normalized, $pattern)) {
                return ['type' => 'SMALLTALK', 'sub_type' => null, 'confidence' => 0.90];
            }
        }

        // Help
        foreach (self::HELP_PATTERNS as $pattern) {
            if (str_contains($normalized, $pattern)) {
                return ['type' => 'HELP', 'sub_type' => null, 'confidence' => 0.90];
            }
        }

        // Actions
        $bestAction     = null;
        $bestScore      = 0;

        foreach (self::ACTION_PATTERNS as $subType => $patterns) {
            $score = 0;
            foreach ($patterns as $pattern) {
                if (str_contains($normalized, $pattern)) {
                    $score++;
                }
            }
            if ($score > $bestScore) {
                $bestScore  = $score;
                $bestAction = $subType;
            }
        }

        if ($bestAction && $bestScore >= 1) {
            $confidence = min(0.90, 0.60 + ($bestScore * 0.15));
            return ['type' => 'ACTION', 'sub_type' => $bestAction, 'confidence' => $confidence];
        }

        // Par défaut : QUERY avec confiance faible (ira au LLM)
        return ['type' => 'QUERY', 'sub_type' => null, 'confidence' => 0.50];
    }

    // =========================================================================
    // CLASSIFICATION PAR LLM
    // =========================================================================

    private function classifyByLLM(string $message, array $context, array $history): array
    {
        $systemPrompt = <<<PROMPT
Tu es un classificateur d'intentions pour SARA, l'assistante d'un ERP (IBIG SECRETIS).

Classifie le message utilisateur dans l'une des catégories suivantes :
- QUERY : Question sur les données, le système, comment faire quelque chose
- ACTION : Demande d'exécution d'une tâche (créer, chercher, générer, rédiger, résumer)
- SMALLTALK : Salutations, conversation informelle, remerciements
- HELP : Demande d'aide sur les fonctionnalités de SARA

Si la catégorie est ACTION, précise le sous-type :
CREATE_EVENT, CREATE_TASK, SEARCH, SUMMARIZE, REPORT, SCHEDULE, DRAFT_LETTER

Extrais également les entités importantes : dates, noms de personnes, lieux, modules mentionnés.

Réponds UNIQUEMENT avec ce JSON (sans texte supplémentaire) :
{
  "type": "QUERY|ACTION|SMALLTALK|HELP",
  "sub_type": "sous-type si ACTION, sinon null",
  "confidence": 0.0-1.0,
  "entities": {
    "dates": [],
    "people": [],
    "locations": [],
    "modules": []
  },
  "reasoning": "explication courte"
}
PROMPT;

        $historyText = '';
        foreach (array_slice($history, -4) as $h) {
            $role         = $h['role'] === 'user' ? 'User' : 'SARA';
            $historyText .= "{$role}: {$h['content']}\n";
        }

        $userMessage = $historyText
            ? "Historique récent :\n{$historyText}\nMessage à classifier : {$message}"
            : $message;

        $response = Http::withToken($this->groqKey ?: config('secretis.ai.groq_key'))
            ->timeout(15)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'       => 'llama-3.3-70b-versatile',
                'max_tokens'  => 300,
                'temperature' => 0.1,
                'messages'    => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user',   'content' => $userMessage],
                ],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('LLM classification error: ' . $response->status());
        }

        $raw    = trim($response->json('choices.0.message.content', '{}'));
        $parsed = json_decode($raw, true);

        if (! is_array($parsed) || empty($parsed['type'])) {
            throw new \RuntimeException('Invalid LLM classification response');
        }

        // Validation du type
        $validTypes = ['QUERY', 'ACTION', 'SMALLTALK', 'HELP'];
        if (! in_array($parsed['type'], $validTypes)) {
            $parsed['type'] = 'QUERY';
        }

        return [
            'type'       => $parsed['type'],
            'sub_type'   => $parsed['sub_type'] ?? null,
            'confidence' => (float) ($parsed['confidence'] ?? 0.75),
            'entities'   => $parsed['entities'] ?? [],
        ];
    }

    // =========================================================================
    // EXTRACTION D'ENTITES RAPIDE
    // =========================================================================

    /**
     * Extraction légère d'entités sans LLM.
     */
    public function extractEntitiesFast(string $message): array
    {
        $entities = [
            'dates'     => [],
            'people'    => [],
            'locations' => [],
            'modules'   => [],
        ];

        // Dates relatives
        $datePatterns = [
            'aujourd\'hui', 'demain', 'après-demain', 'lundi', 'mardi', 'mercredi',
            'jeudi', 'vendredi', 'samedi', 'dimanche', 'semaine prochaine',
            'semaine dernière', 'ce soir', 'ce matin', 'cet après-midi',
        ];
        foreach ($datePatterns as $pattern) {
            if (stripos($message, $pattern) !== false) {
                $entities['dates'][] = $pattern;
            }
        }

        // Dates absolues (DD/MM/YYYY, DD-MM-YYYY)
        if (preg_match_all('/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/', $message, $matches)) {
            foreach ($matches[0] as $date) {
                $entities['dates'][] = $date;
            }
        }

        // Heures
        if (preg_match_all('/\b(\d{1,2})[h:](\d{0,2})\b/i', $message, $matches)) {
            foreach ($matches[0] as $time) {
                $entities['dates'][] = $time;
            }
        }

        // Modules SECRETIS
        $modules = [
            'agenda', 'calendrier', 'courrier', 'ged', 'document', 'réunion',
            'tâche', 'projet', 'visiteur', 'accueil', 'rh', 'congé', 'rapport',
            'facture', 'comptabilité',
        ];
        foreach ($modules as $module) {
            if (stripos($message, $module) !== false) {
                $entities['modules'][] = $module;
            }
        }

        return $entities;
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function normalize(string $text): string
    {
        $text = mb_strtolower($text);
        $text = str_replace(
            ['é', 'è', 'ê', 'ë', 'à', 'â', 'ä', 'ù', 'û', 'ü', 'î', 'ï', 'ô', 'ö', 'ç'],
            ['e', 'e', 'e', 'e', 'a', 'a', 'a', 'u', 'u', 'u', 'i', 'i', 'o', 'o', 'c'],
            $text
        );
        return $text;
    }
}
