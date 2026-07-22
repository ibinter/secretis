<?php

declare(strict_types=1);

namespace App\Services;

use App\Services\NotificationService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * AutomationService — Moteur de règles d'automatisation SECRETIS.
 *
 * Fonctionnement :
 *  1. Un événement système appelle registerTrigger(event, data)
 *  2. Le service cherche les règles actives avec ce trigger
 *  3. Pour chaque règle : évaluer les conditions, si true → exécuter les actions
 *  4. Logger le résultat dans automation_logs
 *
 * Triggers supportés :
 *   courrier.received     — Courrier entrant enregistré
 *   task.overdue          — Tâche passée sa date limite
 *   event.starting_soon   — Événement commence dans N minutes
 *   leave.approved        — Congé approuvé
 *   visitor.arrived       — Visiteur enregistré à l'accueil
 *   invoice.overdue       — Facture en retard
 *   document.uploaded     — Document ajouté dans la GED
 *
 * Actions supportées :
 *   assign_user       — Assigner à un utilisateur
 *   change_status     — Changer le statut d'un objet
 *   send_notification — Envoyer une notification (email/WhatsApp/push)
 *   create_task       — Créer une tâche de suivi
 *   add_tag           — Ajouter un tag
 *   webhook           — Appeler un webhook externe
 *   sara_action       — Demander à SARA d'effectuer une action
 */
class AutomationService
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {
    }

    // =========================================================================
    // ENREGISTREMENT D'UN DÉCLENCHEUR
    // =========================================================================

    /**
     * Déclenche toutes les règles associées à l'événement donné.
     *
     * @param string $event      Nom de l'événement (ex: "courrier.received")
     * @param array  $data       Données de l'événement
     */
    public function registerTrigger(string $event, array $data): void
    {
        $organizationId = $data['organization_id'] ?? null;

        if (! $organizationId) {
            Log::warning('AutomationService: registerTrigger sans organization_id', ['event' => $event]);
            return;
        }

        // Charger les règles actives pour cet événement et cette organisation
        $rules = \DB::table('automation_rules')
            ->where('organization_id', $organizationId)
            ->where('trigger_type', $event)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->get();

        if ($rules->isEmpty()) {
            return;
        }

        Log::info("AutomationService: trigger '{$event}' → {$rules->count()} règle(s) trouvée(s)");

        foreach ($rules as $rule) {
            $this->processRule($rule, $data);
        }
    }

    // =========================================================================
    // ÉVALUATION D'UNE RÈGLE
    // =========================================================================

    /**
     * Évalue les conditions d'une règle avec les données du trigger.
     *
     * @param object $rule        Règle (stdClass depuis DB)
     * @param array  $triggerData Données du trigger
     *
     * @return bool True si toutes les conditions sont remplies
     */
    public function evaluateRule(object $rule, array $triggerData): bool
    {
        $conditions = json_decode($rule->conditions ?? '[]', true);

        if (empty($conditions)) {
            return true; // Pas de conditions = toujours vrai
        }

        foreach ($conditions as $condition) {
            if (! $this->evaluateCondition($condition, $triggerData)) {
                return false; // ET logique : toutes les conditions doivent être vraies
            }
        }

        return true;
    }

    // =========================================================================
    // EXÉCUTION D'UNE RÈGLE
    // =========================================================================

    /**
     * Exécute les actions d'une règle si les conditions sont remplies.
     *
     * @return array { success, actions_executed, actions_failed, duration_ms }
     */
    public function executeRule(object $rule, array $triggerData): array
    {
        $startTime = microtime(true);
        $results   = [];
        $success   = true;

        $actions = json_decode($rule->actions ?? '[]', true);

        foreach ($actions as $action) {
            try {
                $result = $this->executeAction($action, $triggerData, $rule);
                $results[] = [
                    'action'  => $action['type'],
                    'success' => true,
                    'message' => $result['message'] ?? 'OK',
                ];
            } catch (\Throwable $e) {
                $success   = false;
                $results[] = [
                    'action'  => $action['type'] ?? 'unknown',
                    'success' => false,
                    'error'   => $e->getMessage(),
                ];
                Log::error("AutomationService: action '{$action['type']}' failed", [
                    'rule_id' => $rule->id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        $durationMs = (int) ((microtime(true) - $startTime) * 1000);

        return [
            'success'           => $success,
            'actions_executed'  => count(array_filter($results, fn($r) => $r['success'])),
            'actions_failed'    => count(array_filter($results, fn($r) => ! $r['success'])),
            'results'           => $results,
            'duration_ms'       => $durationMs,
        ];
    }

    // =========================================================================
    // PROCESSING INTERNE
    // =========================================================================

    private function processRule(object $rule, array $triggerData): void
    {
        $logId = Str::uuid()->toString();
        $start = microtime(true);

        try {
            // 1. Évaluer les conditions
            $conditionsMatched = $this->evaluateRule($rule, $triggerData);

            if (! $conditionsMatched) {
                $this->logExecution($rule->id, $triggerData, 'skipped', [], 0, true, null);
                return;
            }

            // 2. Exécuter les actions
            $result = $this->executeRule($rule, $triggerData);

            // 3. Mettre à jour les statistiques de la règle
            \DB::table('automation_rules')
                ->where('id', $rule->id)
                ->update([
                    'run_count'   => \DB::raw('run_count + 1'),
                    'last_run_at' => now(),
                ]);

            $status = $result['success'] ? 'success' : 'failed';
            $this->logExecution(
                $rule->id,
                $triggerData,
                $status,
                $result['results'],
                $result['duration_ms'],
                true,
                null
            );

        } catch (\Throwable $e) {
            $duration = (int) ((microtime(true) - $start) * 1000);
            $this->logExecution($rule->id, $triggerData, 'failed', [], $duration, true, $e->getMessage());

            Log::error("AutomationService: règle {$rule->id} échouée", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    // =========================================================================
    // ÉVALUATION D'UNE CONDITION
    // =========================================================================

    private function evaluateCondition(array $condition, array $data): bool
    {
        $field    = $condition['field'] ?? '';
        $operator = $condition['operator'] ?? 'equals';
        $value    = $condition['value'] ?? null;

        // Récupérer la valeur depuis les données du trigger (support des chemins imbriqués)
        $dataValue = data_get($data, $field);

        return match ($operator) {
            'equals'          => $dataValue == $value,
            'not_equals'      => $dataValue != $value,
            'contains'        => is_string($dataValue) && str_contains(strtolower($dataValue), strtolower((string)$value)),
            'not_contains'    => ! (is_string($dataValue) && str_contains(strtolower($dataValue), strtolower((string)$value))),
            'starts_with'     => is_string($dataValue) && str_starts_with(strtolower($dataValue), strtolower((string)$value)),
            'ends_with'       => is_string($dataValue) && str_ends_with(strtolower($dataValue), strtolower((string)$value)),
            'greater_than'    => is_numeric($dataValue) && (float)$dataValue > (float)$value,
            'less_than'       => is_numeric($dataValue) && (float)$dataValue < (float)$value,
            'in'              => is_array($value) && in_array($dataValue, $value),
            'not_in'          => is_array($value) && ! in_array($dataValue, $value),
            'is_empty'        => empty($dataValue),
            'is_not_empty'    => ! empty($dataValue),
            default           => false,
        };
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================

    private function executeAction(array $action, array $triggerData, object $rule): array
    {
        $type   = $action['type'] ?? 'unknown';
        $params = $action['params'] ?? [];

        // Interpoler les variables dans les params
        $params = $this->interpolateParams($params, $triggerData);

        return match ($type) {
            'assign_user'       => $this->actionAssignUser($params, $triggerData),
            'change_status'     => $this->actionChangeStatus($params, $triggerData),
            'send_notification' => $this->actionSendNotification($params, $triggerData, $rule),
            'create_task'       => $this->actionCreateTask($params, $triggerData, $rule),
            'add_tag'           => $this->actionAddTag($params, $triggerData),
            'webhook'           => $this->actionWebhook($params, $triggerData),
            'sara_action'       => $this->actionSara($params, $triggerData),
            default             => throw new \InvalidArgumentException("Action inconnue : {$type}"),
        };
    }

    // ── Actions spécifiques ────────────────────────────────────────────────────

    private function actionAssignUser(array $params, array $data): array
    {
        $model    = $params['model'] ?? $data['model'] ?? null;
        $modelId  = $params['model_id'] ?? $data['id'] ?? null;
        $userId   = $params['user_id'] ?? null;

        if (! $model || ! $modelId || ! $userId) {
            throw new \InvalidArgumentException('assign_user : model, model_id et user_id sont requis');
        }

        $table = match ($model) {
            'task'    => 'task_assignees',
            'courrier'=> 'mail_registry',
            default   => throw new \InvalidArgumentException("Modèle non supporté pour assign_user : {$model}"),
        };

        if ($model === 'task') {
            \DB::table($table)->insertOrIgnore([
                'task_id'     => $modelId,
                'user_id'     => $userId,
                'assigned_by' => null,
                'assigned_at' => now(),
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        } else {
            \DB::table($table)->where('id', $modelId)->update([
                'assigned_to' => $userId,
                'updated_at'  => now(),
            ]);
        }

        return ['message' => "Utilisateur {$userId} assigné."];
    }

    private function actionChangeStatus(array $params, array $data): array
    {
        $model    = $params['model'] ?? $data['model'] ?? null;
        $modelId  = $params['model_id'] ?? $data['id'] ?? null;
        $status   = $params['status'] ?? null;

        if (! $model || ! $modelId || ! $status) {
            throw new \InvalidArgumentException('change_status : model, model_id et status sont requis');
        }

        $table = match ($model) {
            'task'    => 'tasks',
            'courrier'=> 'mail_registry',
            'visitor' => 'visitors',
            'leave'   => 'leave_requests',
            default   => throw new \InvalidArgumentException("Modèle non supporté : {$model}"),
        };

        \DB::table($table)->where('id', $modelId)->update([
            'status'     => $status,
            'updated_at' => now(),
        ]);

        return ['message' => "Statut changé en '{$status}'."];
    }

    private function actionSendNotification(array $params, array $data, object $rule): array
    {
        $channels = $params['channels'] ?? ['push'];
        $title    = $params['title'] ?? 'Notification SECRETIS';
        $body     = $params['body'] ?? 'Automatisation déclenchée.';
        $userId   = $params['user_id'] ?? $data['assigned_to'] ?? null;

        if (! $userId) {
            return ['message' => 'Pas de destinataire, notification ignorée.'];
        }

        // Notification push interne
        if (in_array('push', $channels)) {
            \DB::table('notifications')->insert([
                'id'              => Str::uuid()->toString(),
                'organization_id' => $data['organization_id'] ?? null,
                'user_id'         => $userId,
                'title'           => $title,
                'body'            => $body,
                'type'            => 'automation',
                'data'            => json_encode(['rule_id' => $rule->id]),
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }

        // Email (via service de notification)
        if (in_array('email', $channels)) {
            try {
                $user = \DB::table('users')->find($userId);
                if ($user?->email) {
                    \Mail::raw($body, fn($m) => $m->to($user->email)->subject($title));
                }
            } catch (\Throwable $e) {
                Log::warning('AutomationService: email send failed', ['error' => $e->getMessage()]);
            }
        }

        return ['message' => "Notification envoyée à {$userId} via " . implode(', ', $channels)];
    }

    private function actionCreateTask(array $params, array $data, object $rule): array
    {
        $orgId  = $data['organization_id'] ?? null;
        $title  = $params['title'] ?? 'Tâche automatique';
        $taskId = Str::uuid()->toString();

        \DB::table('tasks')->insert([
            'id'              => $taskId,
            'organization_id' => $orgId,
            'title'           => $title,
            'description'     => $params['description'] ?? "Créé automatiquement par la règle : {$rule->name}",
            'status'          => 'todo',
            'priority'        => $params['priority'] ?? 'normal',
            'due_date'        => $params['due_date'] ?? null,
            'created_by'      => $rule->created_by,
            'position'        => 0,
            'attachments'     => '[]',
            'settings'        => '{}',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        if (! empty($params['assignee_id'])) {
            \DB::table('task_assignees')->insert([
                'task_id'     => $taskId,
                'user_id'     => $params['assignee_id'],
                'assigned_by' => $rule->created_by,
                'assigned_at' => now(),
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        return ['message' => "Tâche '{$title}' créée (id: {$taskId})."];
    }

    private function actionAddTag(array $params, array $data): array
    {
        $model   = $params['model'] ?? $data['model'] ?? null;
        $modelId = $params['model_id'] ?? $data['id'] ?? null;
        $tag     = $params['tag'] ?? null;

        if (! $model || ! $modelId || ! $tag) {
            throw new \InvalidArgumentException('add_tag : model, model_id et tag sont requis');
        }

        $table = match ($model) {
            'courrier'  => 'mail_registry',
            'document'  => 'documents',
            'task'      => 'tasks',
            default     => throw new \InvalidArgumentException("Modèle non supporté pour add_tag : {$model}"),
        };

        // Récupérer les tags existants et ajouter le nouveau
        $row      = \DB::table($table)->where('id', $modelId)->first(['tags']);
        $existing = json_decode($row?->tags ?? '[]', true);

        if (! in_array($tag, $existing)) {
            $existing[] = $tag;
            \DB::table($table)->where('id', $modelId)->update([
                'tags'       => json_encode($existing),
                'updated_at' => now(),
            ]);
        }

        return ['message' => "Tag '{$tag}' ajouté."];
    }

    private function actionWebhook(array $params, array $data): array
    {
        $url     = $params['url'] ?? null;
        $method  = strtoupper($params['method'] ?? 'POST');
        $secret  = $params['secret'] ?? null;

        if (! $url) {
            throw new \InvalidArgumentException('webhook : url est requis');
        }

        $payload = array_merge($data, ['_source' => 'secretis_automation']);

        $request = Http::timeout(10)->withHeaders([
            'Content-Type'  => 'application/json',
            'X-SECRETIS-TS' => time(),
        ]);

        if ($secret) {
            $signature = hash_hmac('sha256', json_encode($payload), $secret);
            $request   = $request->withHeaders(['X-SECRETIS-Signature' => "sha256={$signature}"]);
        }

        $response = $method === 'GET'
            ? $request->get($url, $data)
            : $request->post($url, $payload);

        if ($response->failed()) {
            throw new \RuntimeException("Webhook failed: HTTP {$response->status()}");
        }

        return ['message' => "Webhook appelé → HTTP {$response->status()}"];
    }

    private function actionSara(array $params, array $data): array
    {
        // Enregistrement d'une action SARA en queue pour traitement asynchrone
        $actionType = $params['action_type'] ?? null;
        $userId     = $params['user_id'] ?? $data['assigned_to'] ?? null;

        if (! $actionType || ! $userId) {
            return ['message' => 'SARA action ignorée : paramètres insuffisants.'];
        }

        // Dispatch en queue (sera géré par un Job)
        \DB::table('audit_logs')->insert([
            'organization_id' => $data['organization_id'] ?? null,
            'user_id'         => $userId,
            'event'           => 'sara_automation_action',
            'auditable_type'  => 'automation',
            'new_values'      => json_encode([
                'action_type' => $actionType,
                'params'      => array_merge($params, $data),
            ]),
            'ip_address' => '127.0.0.1',
            'created_at' => now(),
        ]);

        return ['message' => "SARA action '{$actionType}' mise en queue."];
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Interpole les variables {{field}} dans les paramètres avec les données du trigger.
     */
    private function interpolateParams(array $params, array $data): array
    {
        array_walk_recursive($params, function (&$value) use ($data) {
            if (is_string($value)) {
                $value = preg_replace_callback('/\{\{(\w+(?:\.\w+)*)\}\}/', function ($matches) use ($data) {
                    return data_get($data, $matches[1], $matches[0]);
                }, $value);
            }
        });
        return $params;
    }

    /**
     * Enregistre le résultat d'une exécution dans automation_logs.
     */
    private function logExecution(
        string $ruleId,
        array  $triggerData,
        string $status,
        array  $result,
        int    $durationMs,
        bool   $conditionsMatched,
        ?string $errorMessage
    ): void {
        try {
            \DB::table('automation_logs')->insert([
                'id'                 => Str::uuid()->toString(),
                'rule_id'            => $ruleId,
                'trigger_data'       => json_encode(array_slice($triggerData, 0, 20)),
                'conditions_matched' => $conditionsMatched,
                'status'             => $status,
                'result'             => json_encode($result),
                'duration_ms'        => $durationMs,
                'error_message'      => $errorMessage,
                'created_at'         => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('AutomationService::logExecution failed', ['error' => $e->getMessage()]);
        }
    }
}
