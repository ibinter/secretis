<?php

declare(strict_types=1);

namespace App\Services\Sara;

use App\Models\User;
use App\Services\SaraService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * SARA v2 — Assistante Intelligente Agentique
 *
 * Capacités étendues par rapport à v1 :
 *  - Classification d'intentions (QUERY / ACTION / SMALLTALK / HELP)
 *  - Exécution d'actions métier après confirmation utilisateur
 *  - Extraction de données structurées depuis le langage naturel
 *  - Suggestions proactives contextuelles
 *  - Mémoire de conversation persistante (Redis)
 *
 * Guard-rails :
 *  - Aucune action irréversible sans double confirmation
 *  - Rate limit 10 actions/heure par utilisateur
 *  - Log complet dans audit_logs (acteur = SARA + user_id)
 *  - Données sensibles jamais injectées dans le contexte LLM
 */
class SaraV2Service extends SaraService
{
    // ─── VERSION ──────────────────────────────────────────────────────────────

    public const VERSION = '2.0';

    // ─── ACTIONS IRREVERSIBLES ─────────────────────────────────────────────────
    // Ces actions nécessitent une double confirmation (confirm_token requis)
    private const IRREVERSIBLE_ACTIONS = [
        'delete_event',
        'delete_task',
        'delete_document',
    ];

    // ─── TAUX D'ACTIONS AUTORISEES PAR HEURE PAR UTILISATEUR ──────────────────
    private const ACTION_RATE_LIMIT = 10;

    // ─── CONSTRUCTEUR ──────────────────────────────────────────────────────────

    public function __construct(
        protected IntentClassifier   $intentClassifier,
        protected ContextBuilder     $contextBuilder,
        protected ActionExecutor     $actionExecutor,
        protected ConversationMemory $memory,
    ) {
        parent::__construct();
    }

    // =========================================================================
    // POINT D'ENTREE PRINCIPAL
    // =========================================================================

    /**
     * Analyse le message, classifie l'intention et retourne une SaraResponse.
     *
     * Pour les actions : retourne une réponse avec requires_confirmation = true
     * Pour les questions : répond directement
     */
    public function chat(string $message, User $user, array $context = []): SaraResponse
    {
        // 1. Enrichir le contexte avec le ContextBuilder
        $enrichedContext = $this->contextBuilder->build($user, $context);

        // 2. Récupérer la mémoire de conversation
        $history = $this->memory->getHistory($user->id);

        // 3. Classifier l'intention
        $intent = $this->intentClassifier->classify($message, $enrichedContext, $history);

        Log::info('SaraV2::chat', [
            'user_id'     => $user->id,
            'intent_type' => $intent['type'],
            'sub_type'    => $intent['sub_type'] ?? null,
        ]);

        // 4. Ajouter le message à la mémoire
        $this->memory->addMessage($user->id, 'user', $message);

        // 5. Dispatcher selon l'intention
        $response = match ($intent['type']) {
            'ACTION'    => $this->handleActionIntent($intent, $message, $user, $enrichedContext),
            'QUERY'     => $this->handleQueryIntent($message, $user, $enrichedContext, $history),
            'SMALLTALK' => $this->handleSmallTalk($message, $user, $enrichedContext),
            'HELP'      => $this->handleHelp($message, $user, $enrichedContext),
            default     => $this->handleQueryIntent($message, $user, $enrichedContext, $history),
        };

        // 6. Stocker la réponse SARA en mémoire
        $this->memory->addMessage($user->id, 'assistant', $response->message);

        return $response;
    }

    // =========================================================================
    // EXECUTION D'ACTIONS
    // =========================================================================

    /**
     * Exécute une action déjà confirmée par l'utilisateur.
     *
     * @param string $actionType  Type d'action (create_event, create_task, etc.)
     * @param array  $params      Paramètres extraits
     * @param User   $user        Utilisateur courant
     * @param string $confirmToken Token de confirmation (obligatoire pour actions irreversibles)
     *
     * @return array { success, message, data, action_log_id }
     */
    public function executeAction(
        string $actionType,
        array  $params,
        User   $user,
        string $confirmToken = ''
    ): array {
        // ── Guard : rate limit actions ──────────────────────────────────────
        $rateLimitKey = "sara_actions:{$user->id}";

        if (RateLimiter::tooManyAttempts($rateLimitKey, self::ACTION_RATE_LIMIT)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);
            return [
                'success' => false,
                'error'   => 'rate_limited',
                'message' => "Limite d'actions atteinte (10/heure). Réessayez dans {$seconds}s.",
                'retry_after' => $seconds,
            ];
        }

        // ── Guard : double confirmation pour actions irréversibles ──────────
        if (in_array($actionType, self::IRREVERSIBLE_ACTIONS) && empty($confirmToken)) {
            return [
                'success'              => false,
                'error'                => 'double_confirmation_required',
                'message'              => 'Cette action est irréversible. Veuillez confirmer une seconde fois.',
                'requires_confirm_token' => true,
            ];
        }

        // ── Exécution ───────────────────────────────────────────────────────
        RateLimiter::hit($rateLimitKey, 3600);

        try {
            $result = $this->actionExecutor->execute($actionType, $params, $user);

            // Log audit
            $this->logAction($actionType, $params, $user, $result);

            return array_merge($result, ['success' => true]);

        } catch (\Throwable $e) {
            Log::error('SaraV2::executeAction failed', [
                'action'  => $actionType,
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error'   => 'execution_failed',
                'message' => "L'action a échoué : {$e->getMessage()}",
            ];
        }
    }

    // =========================================================================
    // EXTRACTION DE DONNEES STRUCTUREES
    // =========================================================================

    /**
     * Parse le langage naturel et retourne des données structurées
     * adaptées au type cible de SECRETIS.
     *
     * Exemples :
     *  "Réunion avec Jean demain à 14h salle A"
     *    → { title, start_at, participants, room }
     *
     *  "Urgent : envoyer le rapport à la DRH avant vendredi"
     *    → { title, priority, assignee_keywords, due_date }
     *
     * @param string $naturalLanguage  Texte en langage naturel
     * @param string $targetType       'event' | 'task' | 'letter' | 'meeting'
     *
     * @return array Données structurées
     */
    public function extractStructuredData(string $naturalLanguage, string $targetType): array
    {
        $prompt = $this->buildExtractionPrompt($naturalLanguage, $targetType);

        try {
            $raw = $this->callAI(
                $this->getExtractionSystemPrompt($targetType),
                $prompt,
                [],
                new class {
                    public int $id = 0;
                    public ?int $organization_id = null;
                }
            );

            // Extraire le JSON de la réponse
            $parsed = $this->parseJsonFromLLM($raw);

            // Ajouter des champs calculés
            return $this->enrichStructuredData($parsed, $targetType);

        } catch (\Throwable $e) {
            Log::warning('SaraV2::extractStructuredData failed', [
                'target_type' => $targetType,
                'error'       => $e->getMessage(),
            ]);

            return $this->getFallbackStructuredData($targetType);
        }
    }

    // =========================================================================
    // SUGGESTIONS PROACTIVES
    // =========================================================================

    /**
     * Génère des suggestions proactives basées sur le contexte.
     *
     * Analyse :
     *  - Heure et jour de la semaine
     *  - Rôle de l'utilisateur
     *  - Événements imminents
     *  - Courriers non traités
     *  - Projets en retard
     *
     * @return array Max 3 suggestions [ { id, icon, message, action_type, action_params } ]
     */
    public function getSmartSuggestions(User $user): array
    {
        $suggestions = [];
        $now         = now();
        $orgId       = $user->organization_id;

        try {
            // ── 1. Événement imminent (dans les 30 prochaines minutes) ──────
            $nextEvent = \DB::table('events')
                ->where('organization_id', $orgId)
                ->whereHas('participants', fn($q) => $q->where('user_id', $user->id))
                ->whereBetween('start_at', [$now, $now->copy()->addMinutes(30)])
                ->first();

            if ($nextEvent) {
                $minutes    = (int) $now->diffInMinutes($nextEvent->start_at);
                $suggestions[] = [
                    'id'            => 'event_soon_' . $nextEvent->id,
                    'icon'          => '📅',
                    'message'       => "Vous avez **{$nextEvent->title}** dans {$minutes} min. Je prépare l'ordre du jour ?",
                    'action_type'   => 'prepare_agenda',
                    'action_params' => ['event_id' => $nextEvent->id],
                    'priority'      => 'high',
                ];
            }

            // ── 2. Courriers urgents non traités ────────────────────────────
            if (in_array($user->role, ['admin', 'secretary', 'manager'])) {
                $urgentMailCount = \DB::table('mail_registry')
                    ->where('organization_id', $orgId)
                    ->where('status', 'received')
                    ->where('priority', 'urgent')
                    ->where('created_at', '<=', $now->copy()->subDay())
                    ->count();

                if ($urgentMailCount > 0) {
                    $suggestions[] = [
                        'id'            => 'urgent_mail',
                        'icon'          => '📬',
                        'message'       => "{$urgentMailCount} courrier(s) urgent(s) en attente depuis hier.",
                        'action_type'   => 'view_urgent_mail',
                        'action_params' => [],
                        'priority'      => 'high',
                    ];
                }
            }

            // ── 3. Projets en retard ─────────────────────────────────────────
            $lateProject = \DB::table('projects')
                ->where('organization_id', $orgId)
                ->where('status', 'in_progress')
                ->where('end_date', '<', $now->toDateString())
                ->where(function ($q) use ($user) {
                    $q->where('manager_id', $user->id)
                      ->orWhere('created_by', $user->id);
                })
                ->first();

            if ($lateProject) {
                $suggestions[] = [
                    'id'            => 'late_project_' . $lateProject->id,
                    'icon'          => '⚠️',
                    'message'       => "Le projet **{$lateProject->name}** a du retard. Voir le rapport ?",
                    'action_type'   => 'generate_report',
                    'action_params' => ['project_id' => $lateProject->id, 'report_type' => 'project_status'],
                    'priority'      => 'medium',
                ];
            }

            // ── 4. Tâches dues aujourd'hui non démarrées ────────────────────
            $todayTaskCount = \DB::table('tasks')
                ->where('organization_id', $orgId)
                ->where('due_date', $now->toDateString())
                ->where('status', 'todo')
                ->whereExists(function ($q) use ($user) {
                    $q->from('task_assignees')
                      ->whereColumn('task_assignees.task_id', 'tasks.id')
                      ->where('task_assignees.user_id', $user->id);
                })
                ->count();

            if ($todayTaskCount > 0 && count($suggestions) < 3) {
                $suggestions[] = [
                    'id'            => 'tasks_today',
                    'icon'          => '✅',
                    'message'       => "{$todayTaskCount} tâche(s) à faire aujourd'hui non démarrée(s).",
                    'action_type'   => 'view_tasks_today',
                    'action_params' => [],
                    'priority'      => 'medium',
                ];
            }

        } catch (\Throwable $e) {
            Log::warning('SaraV2::getSmartSuggestions error', ['error' => $e->getMessage()]);
        }

        // Trier par priorité et limiter à 3
        usort($suggestions, fn($a, $b) => ($a['priority'] === 'high' ? -1 : 1));

        return array_slice($suggestions, 0, 3);
    }

    // =========================================================================
    // GESTION DES INTENTIONS
    // =========================================================================

    /**
     * Gère une intention de type ACTION.
     * Retourne une réponse avec requires_confirmation = true.
     */
    private function handleActionIntent(
        array  $intent,
        string $message,
        User   $user,
        array  $context
    ): SaraResponse {
        $subType = $intent['sub_type'] ?? 'unknown';
        $entities = $intent['entities'] ?? [];

        // Mapper le sous-type vers un type d'action
        $actionType = $this->mapSubTypeToAction($subType);

        if (! $actionType) {
            return $this->handleQueryIntent($message, $user, $context, []);
        }

        // Extraire les paramètres structurés depuis les entités détectées
        $targetType = $this->getTargetTypeForAction($actionType);
        $params     = $this->extractStructuredData($message, $targetType);
        $params     = array_merge($params, $entities);

        // Construire la description lisible de ce que SARA va faire
        $actionSummary = $this->buildActionSummary($actionType, $params, $user);

        return new SaraResponse(
            message: "Je vais **{$actionSummary}**. Confirmez-vous cette action ?",
            requiresConfirmation: true,
            pendingAction: [
                'type'    => $actionType,
                'params'  => $params,
                'summary' => $actionSummary,
            ],
            metadata: ['intent' => $intent]
        );
    }

    /**
     * Gère une intention QUERY (question classique).
     */
    private function handleQueryIntent(
        string $message,
        User   $user,
        array  $context,
        array  $history
    ): SaraResponse {
        // Recherche FAQ v1 en premier
        $faqAnswer = $this->searchFaqs($message);
        if ($faqAnswer) {
            $this->logConversation($user, $message, $faqAnswer);
            return new SaraResponse(message: $faqAnswer);
        }

        // Construire le prompt enrichi avec contexte + historique
        $systemPrompt = $this->getSystemPromptV2($context);
        $fullMessage  = $this->buildMessageWithHistory($message, $history);

        try {
            $response = $this->callAI($systemPrompt, $fullMessage, $context, $user);
            $this->logConversation($user, $message, $response);
            return new SaraResponse(message: $response);

        } catch (\Throwable $e) {
            Log::error('SaraV2::handleQueryIntent error', ['error' => $e->getMessage()]);
            $fallback = $this->getFallbackResponse($message, $context['mode'] ?? 'internal');
            return new SaraResponse(message: $fallback, isError: true);
        }
    }

    /**
     * Gère le small talk.
     */
    private function handleSmallTalk(string $message, User $user, array $context): SaraResponse
    {
        $name = $context['user_name'] ?? $user->first_name ?? 'vous';
        $hour = (int) now()->format('H');

        $greeting = match (true) {
            $hour < 12 => 'Bonjour',
            $hour < 18 => 'Bon après-midi',
            default    => 'Bonsoir',
        };

        // Réponses variées pour le small talk
        $responses = [
            "{$greeting} {$name} ! Je suis SARA, votre assistante IBIG SECRETIS v2. Comment puis-je vous aider ?",
            "Je vais très bien, merci {$name} ! Que puis-je faire pour vous aujourd'hui ?",
            "Toujours prête à vous aider, {$name} ! Posez-moi une question ou demandez-moi d'effectuer une action.",
        ];

        return new SaraResponse(
            message: $responses[array_rand($responses)],
            metadata: ['type' => 'smalltalk']
        );
    }

    /**
     * Gère les demandes d'aide.
     */
    private function handleHelp(string $message, User $user, array $context): SaraResponse
    {
        $role = $context['user_role'] ?? $user->role ?? 'employee';

        $helpText = <<<HELP
Je suis **SARA v2**, votre assistante intelligente. Voici ce que je peux faire :

**📋 Actions disponibles :**
- "Crée un événement : réunion DRH demain à 10h"
- "Ajoute une tâche : finaliser le rapport RH pour vendredi, priorité haute"
- "Cherche le document contrat fournisseur"
- "Trouve un créneau libre de 1h pour moi et Marie la semaine prochaine"
- "Génère un rapport d'activité de la semaine"
- "Rédige un courrier de relance pour le client Dupont"

**❓ Questions :**
- "Comment fonctionne le module de congés ?"
- "Qui a accès aux documents RH ?"
- "Quand expire notre licence ?"

**💡 Conseils :**
Décrivez votre besoin naturellement. Je comprends le français et peux extraire les dates, noms et lieux.
HELP;

        if (in_array($role, ['admin', 'manager'])) {
            $helpText .= "\n\n**👑 Actions admin :**\n- \"Résume la réunion du [date]\"\n- \"Prévision du volume de visiteurs la semaine prochaine\"";
        }

        return new SaraResponse(message: $helpText, metadata: ['type' => 'help']);
    }

    // =========================================================================
    // HELPERS PRIVES
    // =========================================================================

    /**
     * Prompt système v2 — plus riche que v1.
     */
    private function getSystemPromptV2(array $context): string
    {
        $base = $this->getSystemPrompt($context['mode'] ?? 'internal');

        $date = now()->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH[h]mm');

        return $base . <<<PROMPT

Date et heure courante : {$date}
Version SARA : 2.0

Tu es désormais capable d'exécuter des actions (créer des événements, des tâches, etc.).
Lorsqu'un utilisateur demande une action, confirme d'abord avec un résumé clair.
Ne prends jamais une action sans confirmation explicite de l'utilisateur.
PROMPT;
    }

    /**
     * Construit le message avec les N derniers échanges de l'historique.
     */
    private function buildMessageWithHistory(string $message, array $history): string
    {
        if (empty($history)) {
            return $message;
        }

        // Inclure les 5 derniers échanges comme contexte
        $recent  = array_slice($history, -10);
        $context = '';

        foreach ($recent as $entry) {
            $role     = $entry['role'] === 'user' ? 'Utilisateur' : 'SARA';
            $context .= "{$role}: {$entry['content']}\n";
        }

        return "Historique récent :\n{$context}\nMessage actuel : {$message}";
    }

    /**
     * Prompt d'extraction pour le LLM.
     */
    private function buildExtractionPrompt(string $text, string $targetType): string
    {
        return "Extrait les informations du texte suivant et retourne uniquement un JSON valide sans explication.\n\nTexte : \"{$text}\"\nType cible : {$targetType}";
    }

    /**
     * Prompt système pour l'extraction de données structurées.
     */
    private function getExtractionSystemPrompt(string $targetType): string
    {
        $schemas = [
            'event' => '{ "title": string, "start_at": "YYYY-MM-DD HH:MM", "end_at": "YYYY-MM-DD HH:MM"|null, "location": string|null, "participants_keywords": string[], "description": string|null }',
            'task'  => '{ "title": string, "due_date": "YYYY-MM-DD"|null, "priority": "low|normal|high|urgent", "assignee_keywords": string[], "description": string|null }',
            'letter'=> '{ "subject": string, "recipient": string|null, "tone": "formal|semi-formal|friendly", "key_points": string[], "deadline": "YYYY-MM-DD"|null }',
            'meeting'=> '{ "title": string, "date": "YYYY-MM-DD"|null, "participants_keywords": string[], "agenda_items": string[] }',
        ];

        $schema = $schemas[$targetType] ?? '{ }';

        return <<<PROMPT
Tu es un extracteur de données JSON. Tu reçois un texte en français et tu retournes un JSON correspondant au schéma demandé.
Schéma attendu pour '{$targetType}' : {$schema}
- La date d'aujourd'hui est {$this->todayDateString()}.
- "demain" = aujourd'hui + 1 jour, "lundi prochain" = prochain lundi, etc.
- Si une information est absente, utilise null.
- Retourne UNIQUEMENT le JSON, sans texte avant ou après.
PROMPT;
    }

    /**
     * Parse un JSON depuis la réponse brute du LLM.
     */
    private function parseJsonFromLLM(string $raw): array
    {
        // Extraire le JSON entre accolades
        if (preg_match('/\{.*\}/s', $raw, $matches)) {
            $decoded = json_decode($matches[0], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
        return [];
    }

    /**
     * Enrichit les données structurées avec des champs calculés.
     */
    private function enrichStructuredData(array $data, string $targetType): array
    {
        if ($targetType === 'event' && empty($data['end_at']) && ! empty($data['start_at'])) {
            // Durée par défaut : 1 heure
            try {
                $start          = \Carbon\Carbon::parse($data['start_at']);
                $data['end_at'] = $start->addHour()->format('Y-m-d H:i');
            } catch (\Throwable) {
            }
        }

        return $data;
    }

    /**
     * Données de repli si l'extraction échoue.
     */
    private function getFallbackStructuredData(string $targetType): array
    {
        return match ($targetType) {
            'event'  => ['title' => '', 'start_at' => null, 'end_at' => null, 'location' => null, 'participants_keywords' => []],
            'task'   => ['title' => '', 'due_date' => null, 'priority' => 'normal', 'assignee_keywords' => []],
            'letter' => ['subject' => '', 'recipient' => null, 'tone' => 'formal', 'key_points' => []],
            default  => [],
        };
    }

    /**
     * Mappe le sous-type d'intention vers un type d'action ActionExecutor.
     */
    private function mapSubTypeToAction(string $subType): ?string
    {
        return match ($subType) {
            'CREATE_EVENT'      => 'create_event',
            'CREATE_TASK'       => 'create_task',
            'SEARCH'            => 'search_documents',
            'SCHEDULE'          => 'find_free_slot',
            'SUMMARIZE'         => 'summarize_meeting',
            'REPORT'            => 'generate_report',
            'DRAFT_LETTER'      => 'draft_letter',
            default             => null,
        };
    }

    /**
     * Retourne le type cible pour l'extraction selon l'action.
     */
    private function getTargetTypeForAction(string $actionType): string
    {
        return match ($actionType) {
            'create_event', 'find_free_slot' => 'event',
            'create_task'                    => 'task',
            'draft_letter'                   => 'letter',
            'summarize_meeting'              => 'meeting',
            default                          => 'event',
        };
    }

    /**
     * Construit un résumé lisible de l'action à effectuer.
     */
    private function buildActionSummary(string $actionType, array $params, User $user): string
    {
        return match ($actionType) {
            'create_event'      => sprintf(
                'créer un événement "%s"%s',
                $params['title'] ?? 'Sans titre',
                isset($params['start_at']) ? ' le ' . $params['start_at'] : ''
            ),
            'create_task'       => sprintf(
                'créer une tâche "%s"%s%s',
                $params['title'] ?? 'Sans titre',
                isset($params['due_date']) ? ' pour le ' . $params['due_date'] : '',
                isset($params['priority']) && $params['priority'] !== 'normal' ? ' (priorité ' . $params['priority'] . ')' : ''
            ),
            'search_documents'  => 'rechercher des documents correspondants',
            'find_free_slot'    => 'trouver un créneau libre pour les participants',
            'summarize_meeting' => 'résumer le compte rendu de réunion',
            'generate_report'   => 'générer un rapport',
            'draft_letter'      => sprintf('rédiger un courrier : "%s"', $params['subject'] ?? ''),
            default             => 'effectuer cette action',
        };
    }

    /**
     * Log une action exécutée par SARA dans audit_logs.
     */
    private function logAction(string $actionType, array $params, User $user, array $result): void
    {
        try {
            \DB::table('audit_logs')->insert([
                'organization_id' => $user->organization_id,
                'user_id'         => $user->id,
                'event'           => 'sara_action',
                'auditable_type'  => 'sara_v2',
                'new_values'      => json_encode([
                    'actor'       => 'SARA+user:' . $user->id,
                    'action_type' => $actionType,
                    'params'      => $params,
                    'result'      => array_slice($result, 0, 10),
                ]),
                'ip_address' => request()->ip(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('SaraV2::logAction failed', ['error' => $e->getMessage()]);
        }
    }

    private function todayDateString(): string
    {
        return now()->format('Y-m-d');
    }
}
