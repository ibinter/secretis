<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\AutomationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * AutomationController — CRUD et gestion des règles d'automatisation.
 *
 * Routes :
 *   GET    /automations              — Liste des règles
 *   POST   /automations              — Créer une règle
 *   GET    /automations/{id}         — Détail d'une règle
 *   PUT    /automations/{id}         — Modifier une règle
 *   DELETE /automations/{id}         — Supprimer une règle
 *   PATCH  /automations/{id}/toggle  — Activer / désactiver
 *   POST   /automations/{id}/test    — Tester avec des données exemple
 *   GET    /automations/{id}/logs    — Historique d'exécution
 */
class AutomationController extends Controller
{
    // ── Triggers disponibles ──────────────────────────────────────────────────
    public const AVAILABLE_TRIGGERS = [
        'courrier.received'    => ['label' => 'Courrier reçu',              'icon' => '📬'],
        'task.overdue'         => ['label' => 'Tâche en retard',            'icon' => '⚠️'],
        'event.starting_soon'  => ['label' => 'Événement imminent',         'icon' => '📅'],
        'leave.approved'       => ['label' => 'Congé approuvé',             'icon' => '🏖️'],
        'visitor.arrived'      => ['label' => 'Visiteur arrivé',            'icon' => '👋'],
        'invoice.overdue'      => ['label' => 'Facture en retard',          'icon' => '💰'],
        'document.uploaded'    => ['label' => 'Document importé',           'icon' => '📎'],
    ];

    // ── Actions disponibles ───────────────────────────────────────────────────
    public const AVAILABLE_ACTIONS = [
        'assign_user'       => ['label' => 'Assigner à un utilisateur',    'icon' => '👤'],
        'change_status'     => ['label' => 'Changer le statut',            'icon' => '🔄'],
        'send_notification' => ['label' => 'Envoyer une notification',     'icon' => '🔔'],
        'create_task'       => ['label' => 'Créer une tâche',              'icon' => '✅'],
        'add_tag'           => ['label' => 'Ajouter un tag',               'icon' => '🏷️'],
        'webhook'           => ['label' => 'Appeler un webhook',           'icon' => '🔗'],
        'sara_action'       => ['label' => 'Demander à SARA',              'icon' => '🤖'],
    ];

    public function __construct(private readonly AutomationService $automationService)
    {
    }

    // =========================================================================
    // LISTE
    // =========================================================================

    /**
     * GET /automations
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = \DB::table('automation_rules')
            ->where('organization_id', $user->organization_id)
            ->whereNull('deleted_at')
            ->orderByDesc('created_at');

        // Filtres
        if ($request->has('is_active')) {
            $query->where('is_active', (bool) $request->input('is_active'));
        }
        if ($request->has('trigger_type')) {
            $query->where('trigger_type', $request->input('trigger_type'));
        }

        $rules = $query->paginate(20);

        // Enrichir avec les logs récents
        $rulesWithStats = collect($rules->items())->map(function ($rule) {
            $recentLogs = \DB::table('automation_logs')
                ->where('rule_id', $rule->id)
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['status', 'created_at', 'duration_ms']);

            $successRate = $recentLogs->isNotEmpty()
                ? (int) round($recentLogs->where('status', 'success')->count() / $recentLogs->count() * 100)
                : null;

            return array_merge((array)$rule, [
                'trigger_config' => json_decode($rule->trigger_config ?? '{}', true),
                'conditions'     => json_decode($rule->conditions ?? '[]', true),
                'actions'        => json_decode($rule->actions ?? '[]', true),
                'trigger_label'  => self::AVAILABLE_TRIGGERS[$rule->trigger_type]['label'] ?? $rule->trigger_type,
                'trigger_icon'   => self::AVAILABLE_TRIGGERS[$rule->trigger_type]['icon'] ?? '⚙️',
                'recent_logs'    => $recentLogs,
                'success_rate'   => $successRate,
            ]);
        });

        return response()->json([
            'success'           => true,
            'data'              => $rulesWithStats,
            'meta'              => [
                'total'         => $rules->total(),
                'per_page'      => $rules->perPage(),
                'current_page'  => $rules->currentPage(),
                'last_page'     => $rules->lastPage(),
            ],
            'available_triggers'=> self::AVAILABLE_TRIGGERS,
            'available_actions' => self::AVAILABLE_ACTIONS,
        ]);
    }

    // =========================================================================
    // CRÉATION
    // =========================================================================

    /**
     * POST /automations
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => ['required', 'string', 'max:150'],
            'description'    => ['nullable', 'string', 'max:500'],
            'trigger_type'   => ['required', 'string', Rule::in(array_keys(self::AVAILABLE_TRIGGERS))],
            'trigger_config' => ['nullable', 'array'],
            'conditions'     => ['nullable', 'array'],
            'conditions.*.field'    => ['required_with:conditions', 'string'],
            'conditions.*.operator' => ['required_with:conditions', 'string'],
            'conditions.*.value'    => ['nullable'],
            'actions'        => ['required', 'array', 'min:1'],
            'actions.*.type' => ['required', Rule::in(array_keys(self::AVAILABLE_ACTIONS))],
            'actions.*.params' => ['nullable', 'array'],
            'is_active'      => ['nullable', 'boolean'],
        ]);

        $user = $request->user();

        $ruleId = Str::uuid()->toString();

        \DB::table('automation_rules')->insert([
            'id'              => $ruleId,
            'organization_id' => $user->organization_id,
            'name'            => $validated['name'],
            'description'     => $validated['description'] ?? null,
            'trigger_type'    => $validated['trigger_type'],
            'trigger_config'  => json_encode($validated['trigger_config'] ?? []),
            'conditions'      => json_encode($validated['conditions'] ?? []),
            'actions'         => json_encode($validated['actions']),
            'is_active'       => $validated['is_active'] ?? true,
            'run_count'       => 0,
            'created_by'      => $user->id,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $rule = \DB::table('automation_rules')->where('id', $ruleId)->first();

        return response()->json([
            'success' => true,
            'message' => "Règle d'automatisation créée.",
            'data'    => $rule,
        ], 201);
    }

    // =========================================================================
    // DÉTAIL
    // =========================================================================

    /**
     * GET /automations/{id}
     */
    public function show(string $id, Request $request): JsonResponse
    {
        $rule = $this->findOrFail($id, $request->user()->organization_id);

        return response()->json([
            'success' => true,
            'data'    => array_merge((array)$rule, [
                'trigger_config' => json_decode($rule->trigger_config, true),
                'conditions'     => json_decode($rule->conditions, true),
                'actions'        => json_decode($rule->actions, true),
                'trigger_info'   => self::AVAILABLE_TRIGGERS[$rule->trigger_type] ?? null,
            ]),
        ]);
    }

    // =========================================================================
    // MODIFICATION
    // =========================================================================

    /**
     * PUT /automations/{id}
     */
    public function update(string $id, Request $request): JsonResponse
    {
        $user = $request->user();
        $rule = $this->findOrFail($id, $user->organization_id);

        $validated = $request->validate([
            'name'           => ['sometimes', 'string', 'max:150'],
            'description'    => ['nullable', 'string', 'max:500'],
            'trigger_type'   => ['sometimes', 'string', Rule::in(array_keys(self::AVAILABLE_TRIGGERS))],
            'trigger_config' => ['nullable', 'array'],
            'conditions'     => ['nullable', 'array'],
            'actions'        => ['sometimes', 'array', 'min:1'],
            'is_active'      => ['nullable', 'boolean'],
        ]);

        $updates = [];
        foreach (['name', 'description', 'trigger_type', 'is_active'] as $field) {
            if (array_key_exists($field, $validated)) {
                $updates[$field] = $validated[$field];
            }
        }
        foreach (['trigger_config', 'conditions', 'actions'] as $jsonField) {
            if (array_key_exists($jsonField, $validated)) {
                $updates[$jsonField] = json_encode($validated[$jsonField]);
            }
        }

        $updates['updated_at'] = now();

        \DB::table('automation_rules')->where('id', $id)->update($updates);

        return response()->json([
            'success' => true,
            'message' => 'Règle mise à jour.',
            'data'    => \DB::table('automation_rules')->where('id', $id)->first(),
        ]);
    }

    // =========================================================================
    // SUPPRESSION
    // =========================================================================

    /**
     * DELETE /automations/{id}
     */
    public function destroy(string $id, Request $request): JsonResponse
    {
        $this->findOrFail($id, $request->user()->organization_id);

        \DB::table('automation_rules')->where('id', $id)->update([
            'deleted_at' => now(),
            'is_active'  => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Règle supprimée.',
        ]);
    }

    // =========================================================================
    // TOGGLE ACTIF / INACTIF
    // =========================================================================

    /**
     * PATCH /automations/{id}/toggle
     */
    public function toggle(string $id, Request $request): JsonResponse
    {
        $rule = $this->findOrFail($id, $request->user()->organization_id);

        $newState = ! (bool) $rule->is_active;

        \DB::table('automation_rules')->where('id', $id)->update([
            'is_active'  => $newState,
            'updated_at' => now(),
        ]);

        return response()->json([
            'success'   => true,
            'is_active' => $newState,
            'message'   => $newState ? 'Règle activée.' : 'Règle désactivée.',
        ]);
    }

    // =========================================================================
    // TEST
    // =========================================================================

    /**
     * POST /automations/{id}/test
     * Teste une règle avec des données exemple (sans exécuter les actions en prod).
     */
    public function test(string $id, Request $request): JsonResponse
    {
        $rule = $this->findOrFail($id, $request->user()->organization_id);

        $validated = $request->validate([
            'sample_data' => ['nullable', 'array'],
        ]);

        // Données exemple par type de trigger
        $sampleData = $validated['sample_data'] ?? $this->getSampleData($rule->trigger_type, $request->user()->organization_id);

        // 1. Évaluer les conditions
        $conditionsMatched = $this->automationService->evaluateRule($rule, $sampleData);

        // Preview du résultat des conditions
        $conditions = json_decode($rule->conditions ?? '[]', true);
        $conditionResults = [];

        foreach ($conditions as $condition) {
            $dataValue = data_get($sampleData, $condition['field'] ?? '');
            $conditionResults[] = [
                'field'    => $condition['field'],
                'operator' => $condition['operator'],
                'value'    => $condition['value'],
                'actual'   => $dataValue,
                'matched'  => true, // Simplification pour le preview
            ];
        }

        return response()->json([
            'success'            => true,
            'conditions_matched' => $conditionsMatched,
            'condition_results'  => $conditionResults,
            'would_execute'      => $conditionsMatched,
            'actions_preview'    => json_decode($rule->actions ?? '[]', true),
            'sample_data_used'   => $sampleData,
            'note'               => 'Test en mode simulation — aucune action réelle exécutée.',
        ]);
    }

    // =========================================================================
    // LOGS
    // =========================================================================

    /**
     * GET /automations/{id}/logs
     */
    public function logs(string $id, Request $request): JsonResponse
    {
        $this->findOrFail($id, $request->user()->organization_id);

        $logs = \DB::table('automation_logs')
            ->where('rule_id', $id)
            ->orderByDesc('created_at')
            ->paginate(25);

        $stats = \DB::table('automation_logs')
            ->where('rule_id', $id)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped_count,
                AVG(duration_ms) as avg_duration_ms
            ")
            ->first();

        return response()->json([
            'success' => true,
            'data'    => collect($logs->items())->map(fn($log) => array_merge((array)$log, [
                'trigger_data' => json_decode($log->trigger_data, true),
                'result'       => json_decode($log->result, true),
            ])),
            'stats'   => $stats,
            'meta'    => [
                'total'        => $logs->total(),
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
            ],
        ]);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function findOrFail(string $id, string $organizationId): object
    {
        $rule = \DB::table('automation_rules')
            ->where('id', $id)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (! $rule) {
            abort(404, 'Règle d\'automatisation introuvable.');
        }

        return $rule;
    }

    /**
     * Retourne des données exemple selon le type de trigger.
     */
    private function getSampleData(string $triggerType, string $organizationId): array
    {
        $base = ['organization_id' => $organizationId];

        return match ($triggerType) {
            'courrier.received'   => array_merge($base, [
                'model'     => 'courrier',
                'id'        => Str::uuid()->toString(),
                'sender'    => 'direction@dgi.gouv.ci',
                'subject'   => 'Notification fiscale urgente',
                'priority'  => 'urgent',
                'direction' => 'incoming',
            ]),
            'task.overdue'        => array_merge($base, [
                'model'     => 'task',
                'id'        => Str::uuid()->toString(),
                'title'     => 'Rapport mensuel',
                'priority'  => 'high',
                'assigned_to' => null,
                'days_overdue' => 3,
            ]),
            'event.starting_soon' => array_merge($base, [
                'model'          => 'event',
                'id'             => Str::uuid()->toString(),
                'title'          => 'Réunion de direction',
                'minutes_before' => 30,
            ]),
            'visitor.arrived'     => array_merge($base, [
                'model'      => 'visitor',
                'id'         => Str::uuid()->toString(),
                'full_name'  => 'Jean Dupont',
                'host_user_id' => null,
            ]),
            'document.uploaded'   => array_merge($base, [
                'model'      => 'document',
                'id'         => Str::uuid()->toString(),
                'name'       => 'Contrat_Fournisseur_2026.pdf',
                'mime_type'  => 'application/pdf',
                'folder'     => 'Contrats',
            ]),
            default               => $base,
        };
    }
}
