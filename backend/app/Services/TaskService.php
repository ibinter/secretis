<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskHistory;
use App\Models\User;
use App\Notifications\TaskOverdueNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TaskService
{
    // -------------------------------------------------------------------------
    // Création de tâche
    // -------------------------------------------------------------------------

    /**
     * Crée une tâche et attache les assignés + observateurs.
     *
     * @param  array $data    Données validées depuis TaskController::store()
     * @param  User  $creator Utilisateur connecté
     * @return Task
     */
    public function createTask(array $data, User $creator): Task
    {
        return DB::transaction(function () use ($data, $creator) {
            $task = Task::create([
                ...$data,
                'organization_id' => $creator->organization_id,
                'created_by'      => $creator->id,
                'status'          => $data['status'] ?? 'todo',
                'priority'        => $data['priority'] ?? 'normal',
                'position'        => $this->getNextPosition(
                    $data['project_id'] ?? null,
                    $data['status'] ?? 'todo',
                    $creator->organization_id
                ),
            ]);

            // Assigner les utilisateurs
            if (! empty($data['assignee_ids'])) {
                $task->assignees()->attach(
                    collect($data['assignee_ids'])->mapWithKeys(fn($id) => [
                        $id => ['assigned_at' => now(), 'assigned_by' => $creator->id],
                    ])->all()
                );
            }

            // Ajouter les observateurs
            if (! empty($data['observer_ids'])) {
                $task->observers()->attach($data['observer_ids']);
            }

            // Créer les sous-tâches si fournies
            if (! empty($data['subtasks'])) {
                foreach ($data['subtasks'] as $index => $sub) {
                    Task::create([
                        'organization_id' => $creator->organization_id,
                        'parent_id'       => $task->id,
                        'title'           => $sub['title'],
                        'status'          => 'todo',
                        'priority'        => $task->priority,
                        'created_by'      => $creator->id,
                        'position'        => $index,
                    ]);
                }
            }

            // Historique
            $this->recordHistory($task, null, 'todo', $creator->id, 'Tâche créée');

            return $task->load(['assignees', 'observers', 'subtasks', 'project', 'creator']);
        });
    }

    // -------------------------------------------------------------------------
    // Changement de statut (workflow)
    // -------------------------------------------------------------------------

    /**
     * Change le statut d'une tâche en vérifiant les transitions autorisées.
     *
     * @param  Task   $task
     * @param  string $newStatus  Nouveau statut (todo|in_progress|review|done|cancelled)
     * @param  User   $user
     * @throws \InvalidArgumentException Si la transition est interdite
     */
    public function changeStatus(Task $task, string $newStatus, User $user): void
    {
        $oldStatus = $task->status;

        if (! $task->canTransitionTo($newStatus)) {
            throw new \InvalidArgumentException(
                "Transition interdite : {$oldStatus} → {$newStatus}"
            );
        }

        $task->update(['status' => $newStatus]);

        // Historique de la transition
        $this->recordHistory($task, $oldStatus, $newStatus, $user->id);

        // Notifier les observateurs et assignés du changement
        $this->notifyStatusChange($task, $oldStatus, $newStatus, $user);

        // Propagation : si toutes les sous-tâches sont "done", marquer la parent aussi
        if ($newStatus === 'done' && $task->parent_id) {
            $this->checkParentCompletion($task);
        }

        // Audit
        app(AuditService::class)->log(
            organizationId: $task->organization_id,
            userId:         $user->id,
            action:         'task.status_changed',
            modelType:      Task::class,
            modelId:        $task->id,
            meta:           ['old' => $oldStatus, 'new' => $newStatus],
        );
    }

    // -------------------------------------------------------------------------
    // CRON — Rappels des tâches en retard
    // -------------------------------------------------------------------------

    /**
     * Envoie des rappels pour les tâches en retard.
     * Doit être appelé via un Job planifié (ex: daily à 8h00).
     *
     * Logique :
     * - J+0 (jour de l'échéance) → rappel doux
     * - J+1 → alerte
     * - J+3 → alerte escalade vers créateur
     */
    public function sendOverdueReminders(): void
    {
        // Tâches en retard, non terminées, dans toutes les organisations
        $overdueTasks = Task::with(['assignees', 'creator', 'project'])
            ->overdue()
            ->whereNotNull('due_date')
            ->get();

        foreach ($overdueTasks as $task) {
            $daysLate = $task->days_overdue;

            try {
                // Notifier chaque assigné
                foreach ($task->assignees as $assignee) {
                    $assignee->notify(new TaskOverdueNotification($task, $daysLate));
                }

                // Escalade après 3 jours : notifier le créateur aussi
                if ($daysLate >= 3 && $task->creator) {
                    $task->creator->notify(new TaskOverdueNotification($task, $daysLate, escalated: true));
                }
            } catch (\Throwable $e) {
                Log::error('TaskService: Erreur envoi rappel retard', [
                    'task_id' => $task->id,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        Log::info('TaskService: Rappels retard envoyés', ['count' => $overdueTasks->count()]);
    }

    // -------------------------------------------------------------------------
    // Statistiques de projet
    // -------------------------------------------------------------------------

    /**
     * Calcule les statistiques de progression d'un projet.
     *
     * @param  Project $project
     * @return array {
     *   total, by_status, completion_percent, overdue_count,
     *   by_priority, by_assignee, avg_completion_days
     * }
     */
    public function calculateProjectProgress(Project $project): array
    {
        $tasks = Task::forOrganization($project->organization_id)
            ->byProject($project->id)
            ->rootTasks()
            ->with(['assignees'])
            ->get();

        $total = $tasks->count();

        if ($total === 0) {
            return [
                'total'              => 0,
                'by_status'          => [],
                'completion_percent' => 0,
                'overdue_count'      => 0,
                'by_priority'        => [],
                'by_assignee'        => [],
                'avg_completion_days'=> null,
            ];
        }

        // Regroupement par statut
        $byStatus = $tasks->groupBy('status')
            ->map(fn($group) => [
                'count'   => $group->count(),
                'percent' => round($group->count() / $total * 100, 1),
            ]);

        // Tâches terminées
        $doneTasks = $tasks->where('status', 'done');
        $completionPercent = round($doneTasks->count() / $total * 100, 1);

        // Tâches en retard
        $overdueCount = $tasks->filter(fn($t) => $t->is_overdue)->count();

        // Par priorité
        $byPriority = $tasks->groupBy('priority')
            ->map(fn($group) => $group->count());

        // Charge par assigné
        $byAssignee = [];
        foreach ($tasks as $task) {
            foreach ($task->assignees as $user) {
                if (! isset($byAssignee[$user->id])) {
                    $byAssignee[$user->id] = [
                        'user'          => ['id' => $user->id, 'name' => $user->name],
                        'total'         => 0,
                        'done'          => 0,
                        'overdue'       => 0,
                    ];
                }
                $byAssignee[$user->id]['total']++;
                if ($task->status === 'done') {
                    $byAssignee[$user->id]['done']++;
                }
                if ($task->is_overdue) {
                    $byAssignee[$user->id]['overdue']++;
                }
            }
        }

        // Temps moyen de complétion (en jours) pour les tâches terminées
        $avgCompletionDays = null;
        if ($doneTasks->isNotEmpty()) {
            $avgCompletionDays = round(
                $doneTasks->avg(fn($t) =>
                    $t->completed_at && $t->created_at
                        ? $t->created_at->diffInDays($t->completed_at)
                        : null
                ),
                1
            );
        }

        return [
            'total'               => $total,
            'by_status'           => $byStatus,
            'completion_percent'  => $completionPercent,
            'overdue_count'       => $overdueCount,
            'by_priority'         => $byPriority,
            'by_assignee'         => array_values($byAssignee),
            'avg_completion_days' => $avgCompletionDays,
        ];
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /** Calcule la prochaine position dans une colonne Kanban */
    private function getNextPosition(?string $projectId, string $status, string $orgId): int
    {
        $max = Task::forOrganization($orgId)
            ->when($projectId, fn($q) => $q->byProject($projectId))
            ->where('status', $status)
            ->max('position');

        return ($max ?? -1) + 1;
    }

    /** Enregistre un événement dans l'historique de la tâche */
    private function recordHistory(
        Task $task,
        ?string $fromStatus,
        string $toStatus,
        string $userId,
        string $comment = ''
    ): void {
        TaskHistory::create([
            'task_id'     => $task->id,
            'user_id'     => $userId,
            'from_status' => $fromStatus,
            'to_status'   => $toStatus,
            'comment'     => $comment,
        ]);
    }

    /** Notifie les parties prenantes d'un changement de statut */
    private function notifyStatusChange(Task $task, string $oldStatus, string $newStatus, User $actor): void
    {
        // Notification in-app uniquement (email pour les changements critiques)
        // Éviter de notifier l'acteur lui-même
        $recipients = $task->assignees->merge($task->observers)
            ->filter(fn($u) => $u->id !== $actor->id)
            ->unique('id');

        foreach ($recipients as $recipient) {
            // TODO: implémenter TaskStatusChangedNotification
            // $recipient->notify(new TaskStatusChangedNotification($task, $oldStatus, $newStatus, $actor));
        }
    }

    /** Vérifie si la tâche parente peut être marquée comme terminée */
    private function checkParentCompletion(Task $subtask): void
    {
        $parent = $subtask->parent;
        if (! $parent) {
            return;
        }

        $allDone = $parent->subtasks()
            ->where('status', '!=', 'done')
            ->doesntExist();

        // Auto-complétion si toutes les sous-tâches sont terminées
        // (comportement optionnel, configurable via settings)
        if ($allDone && $parent->settings['auto_complete_with_subtasks'] ?? false) {
            $parent->update(['status' => 'done']);
        }
    }
}
