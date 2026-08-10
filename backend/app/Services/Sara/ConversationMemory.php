<?php

declare(strict_types=1);

namespace App\Services\Sara;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * ConversationMemory — Mémoire de conversation persistante pour SARA v2.
 *
 * Stockée dans Redis avec expiration automatique après 24h d'inactivité.
 * Partagée entre sessions (même utilisateur, différents onglets).
 *
 * Structure par utilisateur :
 * {
 *   messages: [ { role, content, timestamp } ],  // Max 50 messages bruts
 *   summary: string,                               // Résumé automatique (après 10 messages)
 *   topics: string[],                              // Topics abordés
 *   actions_done: [ { type, timestamp } ],         // Actions effectuées
 *   preferences: { language, detail_level },       // Préférences détectées
 *   created_at: string,
 *   last_active_at: string,
 * }
 */
class ConversationMemory
{
    // ── Configuration ──────────────────────────────────────────────────────────
    private const TTL_SECONDS     = 86400;  // 24h
    private const MAX_MESSAGES    = 50;     // Max messages bruts
    private const SUMMARY_TRIGGER = 10;     // Résumer après N messages
    private const KEY_PREFIX      = 'sara_memory:';

    // =========================================================================
    // API PUBLIQUE
    // =========================================================================

    /**
     * Ajoute un message à la mémoire de l'utilisateur.
     */
    public function addMessage(int|string $userId, string $role, string $content): void
    {
        try {
            $memory = $this->load($userId);

            $memory['messages'][] = [
                'role'      => $role,
                'content'   => substr($content, 0, 2000), // Tronquer les très longs messages
                'timestamp' => now()->toISOString(),
            ];

            // Détecter les topics
            $this->detectTopics($memory, $content);

            // Tronquer si trop de messages
            if (count($memory['messages']) > self::MAX_MESSAGES) {
                $memory['messages'] = array_slice($memory['messages'], -self::MAX_MESSAGES);
            }

            // Résumer automatiquement si seuil atteint
            if (count($memory['messages']) % self::SUMMARY_TRIGGER === 0) {
                $this->autoSummarize($userId, $memory);
            }

            $memory['last_active_at'] = now()->toISOString();

            $this->save($userId, $memory);

        } catch (\Throwable $e) {
            Log::warning('ConversationMemory::addMessage failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Retourne l'historique de conversation (N derniers messages).
     *
     * @param int|string $userId
     * @param int        $limit  Nombre de messages à retourner
     *
     * @return array [ { role, content, timestamp } ]
     */
    public function getHistory(int|string $userId, int $limit = 20): array
    {
        try {
            $memory = $this->load($userId);
            return array_slice($memory['messages'] ?? [], -$limit);
        } catch (\Throwable $e) {
            Log::warning('ConversationMemory::getHistory failed', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Retourne le résumé de la conversation.
     */
    public function getSummary(int|string $userId): string
    {
        try {
            $memory = $this->load($userId);
            return $memory['summary'] ?? '';
        } catch (\Throwable) {
            return '';
        }
    }

    /**
     * Enregistre une action effectuée par SARA.
     */
    public function addAction(int|string $userId, string $actionType, array $params = []): void
    {
        try {
            $memory = $this->load($userId);

            $memory['actions_done'][] = [
                'type'      => $actionType,
                'params'    => $params,
                'timestamp' => now()->toISOString(),
            ];

            // Conserver seulement les 20 dernières actions
            if (count($memory['actions_done']) > 20) {
                $memory['actions_done'] = array_slice($memory['actions_done'], -20);
            }

            $this->save($userId, $memory);

        } catch (\Throwable $e) {
            Log::warning('ConversationMemory::addAction failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Met à jour les préférences détectées.
     */
    public function updatePreferences(int|string $userId, array $preferences): void
    {
        try {
            $memory = $this->load($userId);
            $memory['preferences'] = array_merge($memory['preferences'] ?? [], $preferences);
            $this->save($userId, $memory);
        } catch (\Throwable) {
        }
    }

    /**
     * Efface la mémoire de conversation.
     */
    public function clear(int|string $userId): void
    {
        try {
            Redis::del($this->key($userId));
        } catch (\Throwable $e) {
            Log::warning('ConversationMemory::clear failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Retourne la mémoire complète pour inspection.
     */
    public function getMemory(int|string $userId): array
    {
        return $this->load($userId);
    }

    /**
     * Retourne true si une conversation est active (< 24h).
     */
    public function hasActiveSession(int|string $userId): bool
    {
        try {
            return Redis::exists($this->key($userId)) > 0;
        } catch (\Throwable) {
            return false;
        }
    }

    // =========================================================================
    // HELPERS PRIVES
    // =========================================================================

    /**
     * Charge la mémoire depuis Redis.
     */
    private function load(int|string $userId): array
    {
        try {
            $raw = Redis::get($this->key($userId));
            if ($raw) {
                return json_decode($raw, true) ?? $this->emptyMemory();
            }
        } catch (\Throwable) {
        }
        return $this->emptyMemory();
    }

    /**
     * Sauvegarde la mémoire dans Redis avec TTL.
     */
    private function save(int|string $userId, array $memory): void
    {
        Redis::setex(
            $this->key($userId),
            self::TTL_SECONDS,
            json_encode($memory, JSON_UNESCAPED_UNICODE)
        );
    }

    /**
     * Retourne une mémoire vide.
     */
    private function emptyMemory(): array
    {
        return [
            'messages'      => [],
            'summary'       => '',
            'topics'        => [],
            'actions_done'  => [],
            'preferences'   => [
                'language'     => 'fr',
                'detail_level' => 'normal',
            ],
            'created_at'    => now()->toISOString(),
            'last_active_at'=> now()->toISOString(),
        ];
    }

    /**
     * Résume automatiquement les anciens messages.
     * Note : en production, on appellerait le LLM pour un vrai résumé.
     */
    private function autoSummarize(int|string $userId, array &$memory): void
    {
        try {
            $count  = count($memory['messages']);
            $topics = implode(', ', array_unique($memory['topics'] ?? []));
            $actions = count($memory['actions_done']);

            $memory['summary'] = sprintf(
                "Conversation avec %d messages. Topics abordés : %s. Actions effectuées : %d.",
                $count,
                $topics ?: 'général',
                $actions
            );

        } catch (\Throwable) {
        }
    }

    /**
     * Détecte les topics à partir du contenu.
     */
    private function detectTopics(array &$memory, string $content): void
    {
        $topicMap = [
            'agenda'    => ['événement', 'réunion', 'agenda', 'calendrier', 'rdv'],
            'taches'    => ['tâche', 'todo', 'faire', 'deadline'],
            'courrier'  => ['courrier', 'lettre', 'mail', 'email'],
            'ged'       => ['document', 'fichier', 'ged', 'dossier'],
            'rapports'  => ['rapport', 'statistique', 'kpi', 'analytics'],
            'rh'        => ['congé', 'absence', 'employé', 'rh', 'ressources humaines'],
            'visiteurs' => ['visiteur', 'accueil', 'badge'],
        ];

        $normalized = mb_strtolower($content);

        foreach ($topicMap as $topic => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($normalized, $kw) && ! in_array($topic, $memory['topics'] ?? [])) {
                    $memory['topics'][] = $topic;
                    break;
                }
            }
        }

        // Garder max 10 topics
        if (count($memory['topics'] ?? []) > 10) {
            $memory['topics'] = array_slice($memory['topics'], -10);
        }
    }

    /**
     * Clé Redis pour un utilisateur.
     */
    private function key(int|string $userId): string
    {
        return self::KEY_PREFIX . $userId;
    }
}
