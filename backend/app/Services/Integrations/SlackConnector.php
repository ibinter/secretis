<?php

namespace App\Services\Integrations;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * SlackConnector — Intégration Slack pour IBIG SECRETIS.
 *
 * Fonctionnalités :
 *  - Notifications riches avec Block Kit (nouveau courrier, tâche assignée, alerte critique)
 *  - Slash command /secretis (webhook sortant Slack → SECRETIS)
 *  - Webhook entrant Slack (Incoming Webhook URL)
 *  - Events API pour les interactions utilisateur
 *
 * Configuration requise :
 *  - webhook_url  : URL Incoming Webhook Slack
 *  - bot_token    : xoxb-... (Bot Token pour Web API)
 *  - signing_secret : Secret de vérification des requêtes Slack
 */
class SlackConnector
{
    private const WEB_API = 'https://slack.com/api';

    private array $config = [];

    public function __construct(array $config = [])
    {
        $this->config = $config;
    }

    public function withConfig(array $config): static
    {
        $this->config = $config;
        return $this;
    }

    // ─── 1. Envoi de notifications ────────────────────────────────────────────

    /**
     * Envoie un message dans un channel Slack.
     *
     * @param  string $channel  Nom ou ID du channel (#general, C01234567)
     * @param  string $message  Texte fallback (pour les notifications mobiles)
     * @param  array  $blocks   Block Kit blocks (optionnel, remplace le texte)
     */
    public function sendNotification(string $channel, string $message, array $blocks = []): void
    {
        // Priorité : Incoming Webhook (plus simple) → Bot Token (plus riche)
        if (!empty($this->config['webhook_url']) && empty($blocks)) {
            $this->sendViaWebhook($message);
            return;
        }

        $this->sendViaApi($channel, $message, $blocks);
    }

    // ─── 2. Notifications prédéfinies avec Block Kit ──────────────────────────

    /**
     * Notification : Nouveau courrier entrant.
     */
    public function notifyNewCourrier(array $courrier): void
    {
        $blocks = [
            [
                'type' => 'header',
                'text' => ['type' => 'plain_text', 'text' => '📬 Nouveau courrier entrant'],
            ],
            [
                'type'   => 'section',
                'fields' => [
                    ['type' => 'mrkdwn', 'text' => "*Objet :*\n{$courrier['subject']}"],
                    ['type' => 'mrkdwn', 'text' => "*De :*\n{$courrier['sender']}"],
                    ['type' => 'mrkdwn', 'text' => "*Date :*\n{$courrier['date']}"],
                    ['type' => 'mrkdwn', 'text' => "*Priorité :*\n" . $this->priorityEmoji($courrier['priority'] ?? 'normal')],
                ],
            ],
            ['type' => 'divider'],
            [
                'type'     => 'actions',
                'elements' => [
                    [
                        'type'  => 'button',
                        'text'  => ['type' => 'plain_text', 'text' => '👁️ Voir le courrier'],
                        'url'   => config('app.url') . '/courriers/' . $courrier['id'],
                        'style' => 'primary',
                    ],
                    [
                        'type'  => 'button',
                        'text'  => ['type' => 'plain_text', 'text' => '✅ Marquer traité'],
                        'value' => "mark_done:{$courrier['id']}",
                    ],
                ],
            ],
        ];

        $channel = $this->config['channel_courriers'] ?? $this->config['default_channel'] ?? '#secretis-courriers';
        $this->sendNotification($channel, "Nouveau courrier : {$courrier['subject']}", $blocks);
    }

    /**
     * Notification : Tâche assignée.
     */
    public function notifyTaskAssigned(array $task, string $assigneeSlackId): void
    {
        $blocks = [
            [
                'type' => 'header',
                'text' => ['type' => 'plain_text', 'text' => '📋 Nouvelle tâche assignée'],
            ],
            [
                'type' => 'section',
                'text' => [
                    'type' => 'mrkdwn',
                    'text' => "<@{$assigneeSlackId}> — Vous avez une nouvelle tâche !",
                ],
            ],
            [
                'type'   => 'section',
                'fields' => [
                    ['type' => 'mrkdwn', 'text' => "*Tâche :*\n{$task['title']}"],
                    ['type' => 'mrkdwn', 'text' => "*Projet :*\n" . ($task['project'] ?? 'Sans projet')],
                    ['type' => 'mrkdwn', 'text' => "*Priorité :*\n" . $this->priorityEmoji($task['priority'] ?? 'normal')],
                    ['type' => 'mrkdwn', 'text' => "*Échéance :*\n" . ($task['due_date'] ?? 'Aucune')],
                ],
            ],
            [
                'type'     => 'actions',
                'elements' => [
                    [
                        'type'  => 'button',
                        'text'  => ['type' => 'plain_text', 'text' => '🚀 Commencer'],
                        'url'   => config('app.url') . '/taches/' . $task['id'],
                        'style' => 'primary',
                    ],
                ],
            ],
        ];

        $channel = "@{$assigneeSlackId}";
        $this->sendNotification($channel, "Tâche assignée : {$task['title']}", $blocks);
    }

    /**
     * Notification : Alerte critique (erreur système, seuil dépassé).
     */
    public function notifyAlert(string $title, string $detail, string $severity = 'warning'): void
    {
        $emoji = match ($severity) {
            'critical' => '🚨',
            'warning'  => '⚠️',
            'info'     => 'ℹ️',
            default    => '🔔',
        };

        $color = match ($severity) {
            'critical' => '#FF0000',
            'warning'  => '#FFA500',
            default    => '#36A64F',
        };

        $blocks = [
            [
                'type' => 'header',
                'text' => ['type' => 'plain_text', 'text' => "{$emoji} {$title}"],
            ],
            [
                'type' => 'section',
                'text' => ['type' => 'mrkdwn', 'text' => $detail],
            ],
            [
                'type'     => 'context',
                'elements' => [
                    ['type' => 'mrkdwn', 'text' => "SECRETIS ERP | " . now()->format('d/m/Y H:i')],
                ],
            ],
        ];

        $channel = $this->config['channel_alerts'] ?? '#secretis-alertes';
        $this->sendNotification($channel, "{$emoji} {$title}: {$detail}", $blocks);
    }

    // ─── 3. Slash command /secretis ───────────────────────────────────────────

    /**
     * Traite une commande slash /secretis depuis Slack.
     * Retourne la réponse formatée pour Slack.
     *
     * @param  array $payload  Payload Slack (user_name, text, response_url)
     * @return array           Réponse Slack JSON
     */
    public function handleSlashCommand(array $payload): array
    {
        $text     = trim($payload['text'] ?? '');
        $userName = $payload['user_name'] ?? 'Inconnu';

        if (empty($text)) {
            return $this->slashHelp();
        }

        [$command, $query] = array_pad(explode(' ', $text, 2), 2, '');

        return match (strtolower($command)) {
            'search', 'chercher', 'recherche' => $this->slashSearch($query, $userName),
            'taches'                           => $this->slashTasks($userName),
            'agenda'                           => $this->slashAgenda($userName),
            'courriers'                        => $this->slashCourriers($userName),
            default                            => $this->slashSearch($text, $userName),
        };
    }

    /**
     * Vérifie la signature HMAC d'une requête Slack (sécurité).
     */
    public function verifySignature(string $signingSecret, string $timestamp, string $body, string $signature): bool
    {
        if (abs(time() - (int) $timestamp) > 300) {
            return false; // Replay attack
        }

        $computed = 'v0=' . hash_hmac('sha256', "v0:{$timestamp}:{$body}", $signingSecret);
        return hash_equals($computed, $signature);
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────

    private function sendViaWebhook(string $message): void
    {
        $response = Http::post($this->config['webhook_url'], ['text' => $message]);

        if (!$response->successful()) {
            Log::error('Slack webhook échoué', ['body' => $response->body()]);
        }
    }

    private function sendViaApi(string $channel, string $text, array $blocks = []): void
    {
        $payload = ['channel' => $channel, 'text' => $text];

        if (!empty($blocks)) {
            $payload['blocks'] = $blocks;
        }

        $response = Http::withToken($this->config['bot_token'] ?? '')
            ->post(self::WEB_API . '/chat.postMessage', $payload);

        if (!$response->successful() || !$response->json('ok')) {
            Log::error('Slack API erreur', [
                'error'  => $response->json('error'),
                'channel' => $channel,
            ]);
        }
    }

    private function slashSearch(string $query, string $user): array
    {
        if (empty($query)) {
            return ['text' => 'Usage : /secretis recherche <terme>'];
        }

        $results = \App\Models\Document::search($query)->take(5)->get();
        $contacts = \App\Models\Contact::where('name', 'like', "%{$query}%")->take(3)->get();

        $blocks = [
            ['type' => 'header', 'text' => ['type' => 'plain_text', 'text' => "🔍 Résultats pour \"{$query}\""]],
        ];

        foreach ($results as $doc) {
            $blocks[] = [
                'type' => 'section',
                'text' => ['type' => 'mrkdwn', 'text' => "📄 *<" . config('app.url') . "/ged/{$doc->id}|{$doc->title}>*\n{$doc->updated_at?->diffForHumans()}"],
            ];
        }

        if ($results->isEmpty() && $contacts->isEmpty()) {
            $blocks[] = ['type' => 'section', 'text' => ['type' => 'mrkdwn', 'text' => 'Aucun résultat trouvé.']];
        }

        return ['blocks' => $blocks, 'response_type' => 'ephemeral'];
    }

    private function slashHelp(): array
    {
        return [
            'text' => implode("\n", [
                '*SECRETIS ERP — Commandes disponibles :*',
                '`/secretis recherche <terme>` — Rechercher dans SECRETIS',
                '`/secretis taches` — Mes tâches en cours',
                '`/secretis agenda` — Mon agenda du jour',
                '`/secretis courriers` — Derniers courriers',
            ]),
            'response_type' => 'ephemeral',
        ];
    }

    private function slashTasks(string $user): array
    {
        return ['text' => "📋 Vos tâches : " . config('app.url') . '/taches', 'response_type' => 'ephemeral'];
    }

    private function slashAgenda(string $user): array
    {
        return ['text' => "📅 Votre agenda : " . config('app.url') . '/agenda', 'response_type' => 'ephemeral'];
    }

    private function slashCourriers(string $user): array
    {
        return ['text' => "📬 Courriers : " . config('app.url') . '/courriers', 'response_type' => 'ephemeral'];
    }

    private function priorityEmoji(string $priority): string
    {
        return match (strtolower($priority)) {
            'urgent', 'high', 'haute' => '🔴 Urgent',
            'medium', 'normale'       => '🟡 Normal',
            'low', 'basse'            => '🟢 Basse',
            default                   => '⚪ Non défini',
        };
    }
}
