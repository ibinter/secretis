<?php

namespace App\Services\Integrations;

use App\Models\Event;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

/**
 * TelegramConnector — Bot Telegram pour les notifications SECRETIS.
 *
 * Commandes du bot :
 *  /start        — Liaison du compte Telegram avec SECRETIS
 *  /agenda       — Événements du jour
 *  /taches       — Tâches en cours (non terminées)
 *  /courriers    — 5 derniers courriers non traités
 *  /stat         — Statistiques rapides de l'organisation
 *  /aide         — Aide et liste des commandes
 *
 * Notifications push :
 *  - Nouvelle tâche assignée
 *  - Réunion dans 30 minutes
 *  - Document validé / rejeté
 *  - Rappel tâche en retard
 *
 * Configuration requise :
 *  - bot_token     : Token BotFather (1234567890:AAF...)
 *  - webhook_secret: Secret de validation des webhooks Telegram
 */
class TelegramConnector
{
    private const API_BASE = 'https://api.telegram.org/bot';

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

    // ─── Config webhook ───────────────────────────────────────────────────────

    /**
     * Enregistre l'URL webhook auprès de Telegram.
     */
    public function registerWebhook(string $webhookUrl): bool
    {
        $response = $this->api('setWebhook', [
            'url'          => $webhookUrl,
            'secret_token' => $this->config['webhook_secret'] ?? '',
            'allowed_updates' => ['message', 'callback_query'],
        ]);

        return $response['ok'] ?? false;
    }

    /**
     * Vérifie le token secret dans le header X-Telegram-Bot-Api-Secret-Token.
     */
    public function verifyWebhookToken(string $token): bool
    {
        return hash_equals($this->config['webhook_secret'] ?? '', $token);
    }

    // ─── Traitement des updates ───────────────────────────────────────────────

    /**
     * Point d'entrée principal : traite un update Telegram.
     */
    public function handleUpdate(array $update): void
    {
        // Message texte
        if (isset($update['message'])) {
            $this->handleMessage($update['message']);
        }

        // Callback query (bouton inline)
        if (isset($update['callback_query'])) {
            $this->handleCallbackQuery($update['callback_query']);
        }
    }

    private function handleMessage(array $message): void
    {
        $chatId = $message['chat']['id'];
        $text   = trim($message['text'] ?? '');
        $from   = $message['from'] ?? [];

        // Commandes
        if (str_starts_with($text, '/')) {
            [$command] = explode(' ', $text, 2);
            $command    = strtolower(explode('@', $command)[0]); // Enlève @botname

            match ($command) {
                '/start'     => $this->cmdStart($chatId, $from),
                '/agenda'    => $this->cmdAgenda($chatId, $from),
                '/taches'    => $this->cmdTaches($chatId, $from),
                '/courriers' => $this->cmdCourriers($chatId, $from),
                '/stat'      => $this->cmdStat($chatId, $from),
                '/aide', '/help' => $this->cmdAide($chatId),
                default      => $this->sendMessage($chatId, "Commande inconnue. Tapez /aide."),
            };
        }
    }

    private function handleCallbackQuery(array $callbackQuery): void
    {
        $chatId = $callbackQuery['message']['chat']['id'] ?? null;
        $data   = $callbackQuery['data'] ?? '';
        $queryId = $callbackQuery['id'];

        [$action, $id] = array_pad(explode(':', $data, 2), 2, null);

        match ($action) {
            'task_done' => $this->markTaskDone($chatId, $id, $queryId),
            'task_view' => $this->sendMessage($chatId, config('app.url') . "/taches/{$id}"),
            default     => null,
        };

        // Acknowledge le callback
        $this->api('answerCallbackQuery', ['callback_query_id' => $queryId]);
    }

    // ─── Commandes ────────────────────────────────────────────────────────────

    private function cmdStart(int $chatId, array $from): void
    {
        $firstName = $from['first_name'] ?? 'Utilisateur';

        // Stocker l'association chat_id ↔ telegram_username pour liaison ultérieure
        Redis::setex("telegram_link:{$chatId}", 600, json_encode($from));

        $deepLink = config('app.url') . "/parametres/notifications/telegram?chat_id={$chatId}";

        $this->sendMessage($chatId,
            "👋 Bonjour *{$firstName}* !\n\n" .
            "Je suis le bot *IBIG SECRETIS*. Pour relier votre compte, cliquez sur le lien ci-dessous :\n\n" .
            "[🔗 Lier mon compte SECRETIS]({$deepLink})\n\n" .
            "Tapez /aide pour voir les commandes disponibles.",
            'Markdown'
        );
    }

    private function cmdAgenda(int $chatId, array $from): void
    {
        $user = $this->findUserByChatId($chatId);
        if (!$user) {
            $this->sendNotLinked($chatId);
            return;
        }

        $events = Event::where('organization_id', $user->organization_id)
            ->whereDate('start_at', today())
            ->orderBy('start_at')
            ->take(10)
            ->get();

        if ($events->isEmpty()) {
            $this->sendMessage($chatId, "📅 Aucun événement prévu aujourd'hui. Profitez-en !");
            return;
        }

        $lines = ["📅 *Agenda du " . today()->format('d/m/Y') . "* :\n"];
        foreach ($events as $event) {
            $time   = \Carbon\Carbon::parse($event->start_at)->format('H:i');
            $lines[] = "• *{$time}* — {$event->title}" . ($event->location ? " _(📍 {$event->location})_" : '');
        }

        $this->sendMessage($chatId, implode("\n", $lines), 'Markdown');
    }

    private function cmdTaches(int $chatId, array $from): void
    {
        $user = $this->findUserByChatId($chatId);
        if (!$user) {
            $this->sendNotLinked($chatId);
            return;
        }

        $tasks = Task::where('assigned_to', $user->id)
            ->whereNotIn('status', ['done', 'cancelled'])
            ->orderBy('due_date')
            ->take(10)
            ->get();

        if ($tasks->isEmpty()) {
            $this->sendMessage($chatId, "✅ Aucune tâche en cours. Bonne journée !");
            return;
        }

        $lines = ["📋 *Mes tâches en cours :*\n"];
        foreach ($tasks as $task) {
            $due    = $task->due_date ? \Carbon\Carbon::parse($task->due_date)->format('d/m') : 'Sans date';
            $emoji  = $task->isOverdue() ? '🔴' : ($task->priority === 'haute' ? '🟡' : '🟢');
            $lines[] = "{$emoji} *{$task->title}* — _{$due}_";
        }

        $keyboard = [
            'inline_keyboard' => [[
                ['text' => '🔗 Voir toutes mes tâches', 'url' => config('app.url') . '/taches'],
            ]],
        ];

        $this->sendMessage($chatId, implode("\n", $lines), 'Markdown', $keyboard);
    }

    private function cmdCourriers(int $chatId, array $from): void
    {
        $user = $this->findUserByChatId($chatId);
        if (!$user) {
            $this->sendNotLinked($chatId);
            return;
        }

        $courriers = \App\Models\Courrier::where('organization_id', $user->organization_id)
            ->where('status', '!=', 'traite')
            ->latest()
            ->take(5)
            ->get();

        if ($courriers->isEmpty()) {
            $this->sendMessage($chatId, "📭 Aucun courrier en attente.");
            return;
        }

        $lines = ["📬 *Derniers courriers non traités :*\n"];
        foreach ($courriers as $c) {
            $lines[] = "• *{$c->reference}* — {$c->subject} _(de {$c->sender_name})_";
        }

        $this->sendMessage($chatId, implode("\n", $lines), 'Markdown');
    }

    private function cmdStat(int $chatId, array $from): void
    {
        $user = $this->findUserByChatId($chatId);
        if (!$user) {
            $this->sendNotLinked($chatId);
            return;
        }

        $org = $user->organization;

        $tasksDone    = Task::where('organization_id', $org->id)->where('status', 'done')->whereDate('updated_at', today())->count();
        $tasksTotal   = Task::where('organization_id', $org->id)->whereNotIn('status', ['done', 'cancelled'])->count();
        $courriersNew = \App\Models\Courrier::where('organization_id', $org->id)->whereDate('created_at', today())->count();

        $this->sendMessage($chatId,
            "📊 *Statistiques du " . today()->format('d/m/Y') . "* :\n\n" .
            "✅ Tâches terminées aujourd'hui : *{$tasksDone}*\n" .
            "📋 Tâches en cours : *{$tasksTotal}*\n" .
            "📬 Nouveaux courriers : *{$courriersNew}*\n\n" .
            "🔗 [Tableau de bord complet](" . config('app.url') . "/dashboard)",
            'Markdown'
        );
    }

    private function cmdAide(int $chatId): void
    {
        $this->sendMessage($chatId,
            "🤖 *IBIG SECRETIS Bot — Commandes :*\n\n" .
            "/agenda — Mon agenda du jour\n" .
            "/taches — Mes tâches en cours\n" .
            "/courriers — Derniers courriers\n" .
            "/stat — Statistiques rapides\n" .
            "/start — Lier mon compte\n" .
            "/aide — Cette aide",
            'Markdown'
        );
    }

    // ─── Notifications push ───────────────────────────────────────────────────

    public function notifyTaskAssigned(int $chatId, array $task): void
    {
        $keyboard = [
            'inline_keyboard' => [[
                ['text' => '✅ Marquer fait', 'callback_data' => "task_done:{$task['id']}"],
                ['text' => '👁️ Voir', 'url' => config('app.url') . "/taches/{$task['id']}"],
            ]],
        ];

        $this->sendMessage($chatId,
            "📋 *Nouvelle tâche assignée !*\n\n" .
            "*{$task['title']}*\n" .
            "Priorité : {$task['priority']}\n" .
            "Échéance : " . ($task['due_date'] ?? 'Aucune'),
            'Markdown',
            $keyboard
        );
    }

    public function notifyMeetingReminder(int $chatId, array $event, int $minutesBefore = 30): void
    {
        $this->sendMessage($chatId,
            "⏰ *Rappel : Réunion dans {$minutesBefore} minutes*\n\n" .
            "*{$event['title']}*\n" .
            "Heure : " . \Carbon\Carbon::parse($event['start_at'])->format('H:i') . "\n" .
            ($event['location'] ? "📍 {$event['location']}\n" : '') .
            "\n🔗 [Voir l'événement](" . config('app.url') . "/agenda/{$event['id']})",
            'Markdown'
        );
    }

    public function notifyDocumentValidated(int $chatId, array $document, bool $approved): void
    {
        $emoji  = $approved ? '✅' : '❌';
        $status = $approved ? 'validé' : 'rejeté';

        $this->sendMessage($chatId,
            "{$emoji} *Document {$status}*\n\n*{$document['title']}*\n" .
            "🔗 [Consulter](" . config('app.url') . "/ged/{$document['id']})",
            'Markdown'
        );
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public function sendMessage(int $chatId, string $text, string $parseMode = 'Markdown', array $replyMarkup = []): bool
    {
        $params = [
            'chat_id'    => $chatId,
            'text'       => $text,
            'parse_mode' => $parseMode,
        ];

        if (!empty($replyMarkup)) {
            $params['reply_markup'] = json_encode($replyMarkup);
        }

        $response = $this->api('sendMessage', $params);
        return $response['ok'] ?? false;
    }

    private function api(string $method, array $params = []): array
    {
        $token = $this->config['bot_token'] ?? config('services.telegram.bot_token');
        $url   = self::API_BASE . $token . '/' . $method;

        try {
            $response = Http::post($url, $params);
            return $response->json() ?? [];
        } catch (\Throwable $e) {
            Log::error("Telegram API [{$method}]", ['error' => $e->getMessage()]);
            return ['ok' => false];
        }
    }

    private function findUserByChatId(int $chatId): ?User
    {
        return User::where('telegram_chat_id', $chatId)->first();
    }

    private function sendNotLinked(int $chatId): void
    {
        $this->sendMessage($chatId,
            "⚠️ Votre compte Telegram n'est pas lié à SECRETIS.\n" .
            "Tapez /start pour commencer.",
            'Markdown'
        );
    }

    private function markTaskDone(int $chatId, ?string $taskId, string $queryId): void
    {
        if (!$taskId) {
            return;
        }

        $task = Task::find($taskId);
        if ($task) {
            $task->update(['status' => 'done', 'completed_at' => now()]);
            $this->sendMessage($chatId, "✅ Tâche marquée comme terminée !");
        }
    }
}
