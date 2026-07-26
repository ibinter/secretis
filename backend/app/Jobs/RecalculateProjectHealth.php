<?php

namespace App\Jobs;

use App\Models\Project;
use App\Models\User;
use App\Notifications\ProjectHealthChanged;
use App\Services\ProjectService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RecalculateProjectHealth implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries    = 3;
    public int $timeout  = 60;

    public function __construct(public readonly Project $project) {}

    public function handle(ProjectService $projectService): void
    {
        $project = $this->project->fresh([
            'tasks.assignees',
            'tasks.dependencies',
            'milestones',
            'timesheets',
            'members',
        ]);

        if (!$project) return;

        $previousHealth = $project->health;

        // ── 1. Recalcule completion_percent ──────────────────────────────────
        $totalTasks     = $project->tasks->count();
        $completedTasks = $project->tasks->where('status', 'completed')->count();
        $completionPercent = $totalTasks > 0
            ? (int) round(($completedTasks / $totalTasks) * 100)
            : 0;

        // ── 2. Recalcule le budget consommé ──────────────────────────────────
        $projectService->updateBudgetSpent($project);
        $project->refresh();

        // ── 3. Recalcule la santé ────────────────────────────────────────────
        $project->completion_percent = $completionPercent;
        $newHealth = $projectService->calculateProjectHealth($project);

        // ── 4. Met à jour les milestones ─────────────────────────────────────
        foreach ($project->milestones as $milestone) {
            $milestoneTasks    = $project->tasks->where('milestone_id', $milestone->id);
            $milestoneTotal    = $milestoneTasks->count();
            $milestoneCompleted = $milestoneTasks->where('status', 'completed')->count();

            $milestonePercent = $milestoneTotal > 0
                ? (int) round(($milestoneCompleted / $milestoneTotal) * 100)
                : 0;

            // Détermine le statut automatique
            $now = now()->toDateString();
            $milestoneStatus = $milestone->status;

            if ($milestonePercent === 100) {
                $milestoneStatus = 'completed';
            } elseif ($milestone->due_date->toDateString() < $now && $milestonePercent < 100) {
                $milestoneStatus = 'missed';
            } elseif ($milestonePercent > 0) {
                $milestoneStatus = 'in_progress';
            }

            $milestone->update([
                'completion_percent'  => $milestonePercent,
                'tasks_count'         => $milestoneTotal,
                'completed_tasks_count' => $milestoneCompleted,
                'status'              => $milestoneStatus,
            ]);
        }

        // ── 5. Sauvegarde ────────────────────────────────────────────────────
        $project->update([
            'completion_percent' => $completionPercent,
            'health'             => $newHealth,
        ]);

        // ── 6. Notification si dégradation ──────────────────────────────────
        $degraded = (
            ($previousHealth === 'on_track' && in_array($newHealth, ['at_risk', 'off_track'])) ||
            ($previousHealth === 'at_risk'  && $newHealth === 'off_track')
        );

        if ($degraded) {
            $this->notifyManager($project, $previousHealth, $newHealth);
        }
    }

    private function notifyManager(Project $project, string $from, string $to): void
    {
        $managerId = $project->manager_id;

        if (!$managerId) {
            // Cherche parmi les membres manager
            $manager = $project->members()->where('role', 'manager')->first();
            $managerId = $manager?->user_id;
        }

        if (!$managerId) return;

        $user = User::find($managerId);
        if ($user) {
            $user->notify(new ProjectHealthChanged($project, $from, $to));
        }
    }
}
