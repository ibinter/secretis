<?php

namespace App\Services;

use App\Jobs\RecalculateProjectHealth;
use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ProjectService
{
    // ────────────────────────────────────────────────────────────────────────
    //  GANTT DATA
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Retourne toutes les données nécessaires pour le diagramme de Gantt.
     */
    public function getGanttData(Project $project): array
    {
        $project->load([
            'tasks.assignees',
            'tasks.dependencies',
            'milestones',
        ]);

        $criticalPath = $this->calculateCriticalPath($project);

        $tasks = $project->tasks->map(function (Task $task) use ($criticalPath) {
            return [
                'id'           => $task->id,
                'name'         => $task->title ?? $task->name,
                'start'        => optional($task->start_date)->format('Y-m-d'),
                'end'          => optional($task->due_date)->format('Y-m-d'),
                'progress'     => $task->progress ?? 0,
                'dependencies' => $task->dependencies->pluck('depends_on_task_id')->toArray(),
                'milestone_id' => $task->milestone_id,
                'assignees'    => $task->assignees->map(fn($u) => [
                    'id'     => $u->id,
                    'name'   => $u->name,
                    'avatar' => $u->avatar_url ?? null,
                    'color'  => $u->color ?? '#6B7280',
                ])->toArray(),
                'is_critical'  => in_array($task->id, $criticalPath),
                'estimated_hours' => $task->estimated_hours ?? 0,
                'logged_hours'    => $task->logged_hours ?? 0,
            ];
        })->values()->toArray();

        $milestones = $project->milestones->map(fn($m) => [
            'id'     => $m->id,
            'name'   => $m->name,
            'date'   => $m->due_date->format('Y-m-d'),
            'status' => $m->status,
            'color'  => $m->color,
            'completion_percent' => $m->completion_percent,
        ])->values()->toArray();

        return [
            'tasks'        => $tasks,
            'milestones'   => $milestones,
            'criticalPath' => $criticalPath,
            'projectStart' => optional($project->start_date)->format('Y-m-d'),
            'projectEnd'   => optional($project->end_date)->format('Y-m-d'),
        ];
    }

    // ────────────────────────────────────────────────────────────────────────
    //  CPM — CRITICAL PATH METHOD
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Calcule le chemin critique via l'algorithme CPM (Forward + Backward pass).
     * Retourne un tableau d'IDs de tâches sur le chemin critique.
     */
    public function calculateCriticalPath(Project $project): array
    {
        $tasks = $project->tasks->keyBy('id');
        $deps  = [];

        foreach ($project->tasks as $task) {
            $deps[$task->id] = $task->dependencies->pluck('depends_on_task_id')->toArray();
        }

        // ── Forward pass : calcul des dates au plus tôt ──────────────────────
        $earliest = [];
        $sorted   = $this->topologicalSort($tasks->keys()->toArray(), $deps);

        foreach ($sorted as $taskId) {
            $task = $tasks[$taskId] ?? null;
            if (!$task) continue;

            $duration = max(1, (int) (($task->estimated_hours ?? 8) / 8)); // jours
            $start = 0;

            foreach ($deps[$taskId] ?? [] as $predId) {
                $predEnd = ($earliest[$predId]['start'] ?? 0) + ($earliest[$predId]['duration'] ?? 1);
                $start = max($start, $predEnd);
            }

            $earliest[$taskId] = [
                'start'    => $start,
                'duration' => $duration,
                'end'      => $start + $duration,
            ];
        }

        if (empty($earliest)) return [];

        $projectEnd = max(array_column($earliest, 'end'));

        // ── Backward pass : calcul des dates au plus tard ────────────────────
        $latest = [];
        foreach (array_reverse($sorted) as $taskId) {
            if (!isset($earliest[$taskId])) continue;

            $duration = $earliest[$taskId]['duration'];
            $lateEnd  = $projectEnd;

            // Cherche les successeurs
            foreach ($deps as $succId => $succDeps) {
                if (in_array($taskId, $succDeps)) {
                    $lateEnd = min($lateEnd, $latest[$succId]['start'] ?? $projectEnd);
                }
            }

            $latest[$taskId] = [
                'end'      => $lateEnd,
                'start'    => $lateEnd - $duration,
                'duration' => $duration,
            ];
        }

        // ── Tâches sur le chemin critique (slack == 0) ───────────────────────
        $critical = [];
        foreach ($sorted as $taskId) {
            if (!isset($earliest[$taskId], $latest[$taskId])) continue;

            $slack = ($latest[$taskId]['start'] ?? 0) - ($earliest[$taskId]['start'] ?? 0);
            if ($slack === 0) {
                $critical[] = $taskId;
            }
        }

        return $critical;
    }

    /**
     * Tri topologique (Kahn's algorithm) pour le CPM.
     */
    private function topologicalSort(array $taskIds, array $deps): array
    {
        $inDegree = array_fill_keys($taskIds, 0);
        foreach ($deps as $taskId => $predecessors) {
            foreach ($predecessors as $predId) {
                if (isset($inDegree[$taskId])) {
                    $inDegree[$taskId]++;
                }
            }
        }

        $queue  = array_keys(array_filter($inDegree, fn($d) => $d === 0));
        $sorted = [];

        while (!empty($queue)) {
            $current  = array_shift($queue);
            $sorted[] = $current;

            foreach ($deps as $taskId => $predecessors) {
                if (in_array($current, $predecessors)) {
                    $inDegree[$taskId]--;
                    if ($inDegree[$taskId] === 0) {
                        $queue[] = $taskId;
                    }
                }
            }
        }

        return $sorted;
    }

    // ────────────────────────────────────────────────────────────────────────
    //  SANTÉ DU PROJET
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Calcule la santé du projet selon délais et budget.
     */
    public function calculateProjectHealth(Project $project): string
    {
        $scheduleScore = $this->getScheduleScore($project);
        $budgetScore   = $this->getBudgetScore($project);
        $overallScore  = ($scheduleScore + $budgetScore) / 2;

        if ($overallScore >= 70) return 'on_track';
        if ($overallScore >= 40) return 'at_risk';
        return 'off_track';
    }

    private function getScheduleScore(Project $project): float
    {
        if (!$project->end_date) return 100;

        $today       = Carbon::today();
        $start       = Carbon::parse($project->start_date ?? $project->created_at);
        $end         = Carbon::parse($project->end_date);
        $totalDays   = max(1, $start->diffInDays($end));
        $elapsedDays = min($totalDays, $start->diffInDays($today));

        $expectedProgress = ($elapsedDays / $totalDays) * 100;
        $actualProgress   = $project->completion_percent;

        $delta = $actualProgress - $expectedProgress;

        if ($delta >= -10) return 100;
        if ($delta >= -25) return 60;
        return 20;
    }

    private function getBudgetScore(Project $project): float
    {
        if (!$project->budget_planned || $project->budget_planned == 0) return 100;

        $ratio = ($project->budget_spent / $project->budget_planned) * 100;
        $expectedRatio = $project->completion_percent;

        $delta = $ratio - $expectedRatio;

        if ($delta <= 10) return 100;
        if ($delta <= 25) return 60;
        return 20;
    }

    // ────────────────────────────────────────────────────────────────────────
    //  BUDGET
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Recalcule le budget consommé depuis les timesheets.
     */
    public function updateBudgetSpent(Project $project): void
    {
        $spent = $project->timesheets()
            ->where('is_billable', true)
            ->selectRaw('SUM(hours * hourly_rate) as total')
            ->value('total') ?? 0;

        $project->update(['budget_spent' => $spent]);
    }

    // ────────────────────────────────────────────────────────────────────────
    //  RISQUES PLANNING
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Détecte les tâches qui risquent de retarder le projet.
     */
    public function detectScheduleRisk(Project $project): array
    {
        $today   = Carbon::today();
        $at_risk = [];

        foreach ($project->tasks as $task) {
            if (in_array($task->status ?? '', ['completed', 'cancelled'])) {
                continue;
            }

            $dueDate = $task->due_date ? Carbon::parse($task->due_date) : null;

            if (!$dueDate) continue;

            $daysLeft     = $today->diffInDays($dueDate, false); // négatif si dépassé
            $progress     = $task->progress ?? 0;
            $isOverdue    = $daysLeft < 0;
            $isStalled    = $daysLeft <= 3 && $progress < 50;

            if ($isOverdue || $isStalled) {
                $at_risk[] = [
                    'task_id'       => $task->id,
                    'task_name'     => $task->title ?? $task->name,
                    'due_date'      => $dueDate->format('Y-m-d'),
                    'days_overdue'  => $isOverdue ? abs($daysLeft) : 0,
                    'progress'      => $progress,
                    'risk_type'     => $isOverdue ? 'overdue' : 'at_risk',
                    'assignees'     => $task->assignees->pluck('name')->toArray(),
                ];
            }
        }

        // Tri par gravité
        usort($at_risk, fn($a, $b) => $b['days_overdue'] <=> $a['days_overdue']);

        return $at_risk;
    }

    // ────────────────────────────────────────────────────────────────────────
    //  DASHBOARD
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Retourne toutes les métriques du projet en un seul appel.
     */
    public function getProjectDashboard(Project $project): array
    {
        $project->load([
            'tasks.assignees',
            'tasks.dependencies',
            'milestones',
            'timesheets',
            'risks',
            'members.user',
        ]);

        $tasks           = $project->tasks;
        $totalTasks      = $tasks->count();
        $completedTasks  = $tasks->where('status', 'completed')->count();
        $overdueTasks    = $tasks->filter(fn($t) =>
            $t->due_date && Carbon::parse($t->due_date)->isPast() && $t->status !== 'completed'
        )->count();

        $today       = Carbon::today();
        $end         = $project->end_date ? Carbon::parse($project->end_date) : null;
        $daysRemaining = $end ? $today->diffInDays($end, false) : null;

        // S-curve : progression planifiée vs réelle (28 jours)
        $scurve = $this->buildSCurve($project);

        // Membres actifs (timesheet les 7 derniers jours)
        $activeMembers = $project->timesheets()
            ->where('date', '>=', $today->copy()->subDays(7))
            ->distinct('user_id')
            ->count('user_id');

        return [
            'project'           => [
                'id'                 => $project->id,
                'name'               => $project->name,
                'health'             => $project->health,
                'completion_percent' => $project->completion_percent,
                'start_date'         => optional($project->start_date)->format('Y-m-d'),
                'end_date'           => optional($project->end_date)->format('Y-m-d'),
                'days_remaining'     => $daysRemaining,
                'visibility'         => $project->visibility,
            ],
            'budget'            => [
                'planned'   => $project->budget_planned,
                'spent'     => $project->budget_spent,
                'currency'  => $project->budget_currency,
                'percent'   => $project->budget_planned > 0
                    ? round(($project->budget_spent / $project->budget_planned) * 100, 1)
                    : 0,
                'remaining' => max(0, $project->budget_planned - $project->budget_spent),
            ],
            'tasks'             => [
                'total'     => $totalTasks,
                'completed' => $completedTasks,
                'overdue'   => $overdueTasks,
                'in_progress' => $tasks->where('status', 'in_progress')->count(),
            ],
            'milestones'        => $project->milestones->map(fn($m) => [
                'id'                 => $m->id,
                'name'               => $m->name,
                'due_date'           => $m->due_date->format('Y-m-d'),
                'status'             => $m->status,
                'completion_percent' => $m->completion_percent,
                'color'              => $m->color,
            ])->values(),
            'risks'             => [
                'open'      => $project->risks->where('status', 'open')->count(),
                'high'      => $project->risks
                    ->where('status', 'open')
                    ->filter(fn($r) => $r->probability === 'high' || $r->impact === 'high')
                    ->count(),
                'items'     => $project->risks->where('status', 'open')->values(),
            ],
            'members'           => [
                'total'  => $project->members->count(),
                'active' => $activeMembers,
                'list'   => $project->members->map(fn($m) => [
                    'id'     => $m->user->id,
                    'name'   => $m->user->name,
                    'role'   => $m->role,
                    'avatar' => $m->user->avatar_url ?? null,
                ])->values(),
            ],
            'schedule_risks'    => $this->detectScheduleRisk($project),
            'scurve'            => $scurve,
            'total_hours_logged'=> $project->timesheets->sum('hours'),
        ];
    }

    /**
     * Construit la courbe en S (progression planifiée vs réelle sur 28 jours).
     */
    private function buildSCurve(Project $project): array
    {
        $start = $project->start_date ? Carbon::parse($project->start_date) : Carbon::today()->subDays(14);
        $end   = $project->end_date   ? Carbon::parse($project->end_date)   : Carbon::today()->addDays(14);
        $today = Carbon::today();

        $totalDays = max(1, $start->diffInDays($end));
        $points    = [];

        // Un point tous les 3 jours maximum (28 points max)
        $step = max(1, (int)($totalDays / 28));

        $current = $start->copy();
        while ($current->lte($end)) {
            $elapsed  = $start->diffInDays($current);
            $planned  = min(100, round(($elapsed / $totalDays) * 100, 1));

            // Réel : seulement jusqu'à aujourd'hui
            $actual = null;
            if ($current->lte($today)) {
                // Approximation : tâches complétées dont la date de fin est <= current
                $actual = $project->tasks->filter(fn($t) =>
                    $t->status === 'completed' && $t->due_date && Carbon::parse($t->due_date)->lte($current)
                )->count();
                $total = max(1, $project->tasks->count());
                $actual = round(($actual / $total) * 100, 1);
            }

            $points[] = [
                'date'    => $current->format('Y-m-d'),
                'planned' => $planned,
                'actual'  => $actual,
            ];

            $current->addDays($step);
        }

        return $points;
    }
}
