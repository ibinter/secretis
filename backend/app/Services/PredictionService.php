<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Organization;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * PredictionService — Prédictions IA pour SECRETIS ERP.
 *
 * Algorithmes basés sur les données historiques de l'organisation :
 *  - Vélocité des tâches par assigné
 *  - Patterns d'absence et de congés
 *  - Volume de visiteurs (tendances hebdomadaires)
 *  - Détection d'anomalies par z-score
 *
 * Toutes les prédictions sont mises en cache pour éviter les requêtes répétées.
 */
class PredictionService
{
    private const CACHE_TTL_MINUTES = 30;

    // =========================================================================
    // PRÉDICTION DATE DE COMPLÉTION D'UNE TÂCHE
    // =========================================================================

    /**
     * Prédit la date de complétion d'une tâche basée sur la vélocité historique de l'assigné.
     *
     * Algorithme :
     *  1. Calculer le temps moyen de complétion de l'assigné (par priorité)
     *  2. Ajuster selon la charge actuelle de l'assigné
     *  3. Retourner la date estimée
     *
     * @param Task $task   Tâche à analyser
     *
     * @return array {
     *   estimated_date: string (YYYY-MM-DD),
     *   confidence: float (0-1),
     *   reasoning: string,
     *   days_estimate: int,
     * }
     */
    public function predictTaskCompletionDate(Task $task): array
    {
        $cacheKey = "pred_task_completion:{$task->id}";

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($task) {
            return $this->computeTaskCompletion($task);
        });
    }

    private function computeTaskCompletion(Task $task): array
    {
        $assignees = $task->assignees()->pluck('users.id')->toArray();

        if (empty($assignees)) {
            return $this->defaultTaskPrediction($task);
        }

        $assigneeId = $assignees[0];

        // Historique des tâches complétées par cet assigné (même priorité)
        $completedTasks = \DB::table('tasks')
            ->where('organization_id', $task->organization_id)
            ->where('status', 'done')
            ->where('priority', $task->priority)
            ->whereNotNull('completed_at')
            ->whereNotNull('created_at')
            ->whereExists(function ($q) use ($assigneeId) {
                $q->from('task_assignees')
                  ->whereColumn('task_assignees.task_id', 'tasks.id')
                  ->where('task_assignees.user_id', $assigneeId);
            })
            ->orderByDesc('completed_at')
            ->limit(20)
            ->get(['created_at', 'completed_at']);

        if ($completedTasks->isEmpty()) {
            return $this->defaultTaskPrediction($task);
        }

        // Calculer les durées en heures ouvrables
        $durations = $completedTasks->map(function ($t) {
            $created   = Carbon::parse($t->created_at);
            $completed = Carbon::parse($t->completed_at);
            return max(1, $created->diffInHours($completed));
        })->toArray();

        // Médiane (plus robuste que la moyenne)
        sort($durations);
        $median = $durations[(int) floor(count($durations) / 2)];

        // Charge actuelle de l'assigné
        $currentLoad = \DB::table('tasks')
            ->where('organization_id', $task->organization_id)
            ->whereIn('status', ['todo', 'in_progress'])
            ->whereExists(function ($q) use ($assigneeId) {
                $q->from('task_assignees')
                  ->whereColumn('task_assignees.task_id', 'tasks.id')
                  ->where('task_assignees.user_id', $assigneeId);
            })
            ->count();

        // Facteur de charge (plus la charge est élevée, plus c'est long)
        $loadFactor = 1.0 + ($currentLoad * 0.1);

        $estimatedHours = (int) ($median * $loadFactor);
        $estimatedDays  = (int) ceil($estimatedHours / 8); // 8h de travail/jour

        // Ignorer les week-ends
        $estimatedDate = $this->addWorkingDays(now(), $estimatedDays);

        // Confiance basée sur la taille de l'échantillon
        $confidence = min(0.90, 0.50 + (count($durations) * 0.02));

        $priorityLabels = ['low' => 'faible', 'normal' => 'normale', 'high' => 'haute', 'urgent' => 'urgente'];
        $priorityLabel  = $priorityLabels[$task->priority] ?? $task->priority;

        return [
            'estimated_date' => $estimatedDate->toDateString(),
            'confidence'     => round($confidence, 2),
            'days_estimate'  => $estimatedDays,
            'reasoning'      => sprintf(
                "Basé sur %d tâches similaires (priorité %s). Durée médiane : %dh. Charge actuelle : %d tâche(s).",
                count($durations),
                $priorityLabel,
                $median,
                $currentLoad
            ),
        ];
    }

    // =========================================================================
    // PRÉDICTION RETARD DE PROJET
    // =========================================================================

    /**
     * Prédit la probabilité de retard d'un projet.
     *
     * @param object $project  Projet (stdClass ou Model)
     *
     * @return array {
     *   delay_probability: float (0-1),
     *   estimated_delay_days: int,
     *   risk_level: 'low'|'medium'|'high'|'critical',
     *   bottlenecks: string[],
     *   recommendations: string[],
     * }
     */
    public function predictProjectDelay(object $project): array
    {
        $cacheKey = "pred_project_delay:{$project->id}";

        return Cache::remember($cacheKey, now()->addMinutes(self::CACHE_TTL_MINUTES), function () use ($project) {
            return $this->computeProjectDelay($project);
        });
    }

    private function computeProjectDelay(object $project): array
    {
        $endDate    = Carbon::parse($project->end_date ?? now()->addMonth());
        $daysLeft   = (int) now()->diffInDays($endDate, false);
        $bottlenecks = [];
        $score       = 0.0;

        // Facteur 1 : Tâches en retard dans le projet
        $overdueCount = \DB::table('tasks')
            ->where('project_id', $project->id)
            ->where('due_date', '<', now()->toDateString())
            ->whereNotIn('status', ['done', 'cancelled'])
            ->count();

        $totalTasks = \DB::table('tasks')
            ->where('project_id', $project->id)
            ->whereNotIn('status', ['cancelled'])
            ->count();

        if ($totalTasks > 0) {
            $overdueRatio = $overdueCount / $totalTasks;
            $score       += $overdueRatio * 0.40;
            if ($overdueRatio > 0.20) {
                $bottlenecks[] = "{$overdueCount} tâche(s) en retard ({$this->pct($overdueRatio)} du total)";
            }
        }

        // Facteur 2 : Taux de complétion vs temps écoulé
        if ($project->start_date && $project->end_date) {
            $totalDuration    = (int) Carbon::parse($project->start_date)->diffInDays(Carbon::parse($project->end_date));
            $elapsed          = (int) Carbon::parse($project->start_date)->diffInDays(now());
            $timeProgress     = $totalDuration > 0 ? $elapsed / $totalDuration : 0;

            $doneCount       = \DB::table('tasks')->where('project_id', $project->id)->where('status', 'done')->count();
            $completionRate  = $totalTasks > 0 ? $doneCount / $totalTasks : 0;

            $gap = $timeProgress - $completionRate;
            if ($gap > 0.20) {
                $score       += $gap * 0.35;
                $bottlenecks[] = sprintf(
                    "Avancement (%s) inférieur au temps écoulé (%s)",
                    $this->pct($completionRate),
                    $this->pct($timeProgress)
                );
            }
        }

        // Facteur 3 : Tâches bloquées (in_review > 3 jours)
        $blockedCount = \DB::table('tasks')
            ->where('project_id', $project->id)
            ->where('status', 'review')
            ->where('updated_at', '<', now()->subDays(3))
            ->count();

        if ($blockedCount > 0) {
            $score       += min(0.25, $blockedCount * 0.05);
            $bottlenecks[] = "{$blockedCount} tâche(s) bloquées en révision depuis > 3 jours";
        }

        // Calculer le niveau de risque
        $score = min(1.0, $score);

        $riskLevel = match (true) {
            $score >= 0.75 => 'critical',
            $score >= 0.50 => 'high',
            $score >= 0.25 => 'medium',
            default        => 'low',
        };

        // Estimation du retard en jours
        $estimatedDelayDays = $score > 0.30 ? (int) ($overdueCount * 2 + $blockedCount * 3) : 0;

        // Recommandations
        $recommendations = $this->buildRecommendations($riskLevel, $bottlenecks, $daysLeft);

        return [
            'delay_probability'    => round($score, 2),
            'estimated_delay_days' => $estimatedDelayDays,
            'risk_level'           => $riskLevel,
            'bottlenecks'          => $bottlenecks,
            'recommendations'      => $recommendations,
            'days_remaining'       => $daysLeft,
            'completion_pct'       => $totalTasks > 0 ? $this->pct(
                \DB::table('tasks')->where('project_id', $project->id)->where('status', 'done')->count() / $totalTasks
            ) : '0%',
        ];
    }

    // =========================================================================
    // DÉTECTION D'ANOMALIES
    // =========================================================================

    /**
     * Détecte les patterns anormaux dans l'organisation.
     *
     * Méthode : Z-score sur les métriques des 4 dernières semaines vs la semaine courante.
     *
     * @return array [ { type, severity, message, metric, current, expected, z_score } ]
     */
    public function detectAnomalies(Organization $org): array
    {
        $cacheKey = "pred_anomalies:{$org->id}";

        return Cache::remember($cacheKey, now()->addMinutes(15), function () use ($org) {
            return $this->computeAnomalies($org);
        });
    }

    private function computeAnomalies(Organization $org): array
    {
        $anomalies = [];
        $orgId     = $org->id;

        // ── Volume de courriers urgents ────────────────────────────────────
        $urgentMailAnomaly = $this->detectMetricAnomaly(
            'mail_registry',
            'organization_id = ? AND priority = ? AND created_at >= ?',
            [$orgId, 'urgent', now()->subDays(7)],
            'mail_registry',
            'organization_id = ? AND priority = ? AND created_at BETWEEN ? AND ?',
            fn($week) => [$orgId, 'urgent', $week['start'], $week['end']],
            'courrier_urgent',
            'pic de courriers urgents'
        );
        if ($urgentMailAnomaly) {
            $anomalies[] = $urgentMailAnomaly;
        }

        // ── Absences non planifiées ────────────────────────────────────────
        $absenceAnomaly = $this->detectMetricAnomaly(
            'leave_requests',
            'organization_id = ? AND type = ? AND created_at >= ?',
            [$orgId, 'sick', now()->subDays(7)],
            'leave_requests',
            'organization_id = ? AND type = ? AND created_at BETWEEN ? AND ?',
            fn($week) => [$orgId, 'sick', $week['start'], $week['end']],
            'absence_maladie',
            'hausse des absences maladie'
        );
        if ($absenceAnomaly) {
            $anomalies[] = $absenceAnomaly;
        }

        // ── Tâches créées sans assigné ─────────────────────────────────────
        $unassignedTasks = \DB::table('tasks')
            ->where('organization_id', $orgId)
            ->where('status', 'todo')
            ->whereNotExists(function ($q) {
                $q->from('task_assignees')->whereColumn('task_assignees.task_id', 'tasks.id');
            })
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        if ($unassignedTasks > 5) {
            $anomalies[] = [
                'type'     => 'tasks_unassigned',
                'severity' => 'medium',
                'message'  => "{$unassignedTasks} tâche(s) créées cette semaine sans assigné",
                'metric'   => 'taches_sans_assigné',
                'current'  => $unassignedTasks,
            ];
        }

        return $anomalies;
    }

    // =========================================================================
    // CRÉNEAU OPTIMAL DE RÉUNION
    // =========================================================================

    /**
     * Suggère le meilleur créneau pour une réunion basé sur les habitudes des participants.
     *
     * @param array $participantIds  IDs des participants
     * @param int   $durationMin     Durée souhaitée en minutes
     *
     * @return array [ { start, end, score, label } ] (top 3)
     */
    public function suggestOptimalMeetingTime(array $participantIds, int $durationMin = 60): array
    {
        if (empty($participantIds)) {
            return [];
        }

        $orgId = \DB::table('users')->where('id', $participantIds[0])->value('organization_id');

        // Analyser les patterns de réunion des participants (heures favorites)
        $favHours = $this->getFavoriteHours($participantIds);

        $suggestions = [];
        $current     = now()->addDay()->setTime(8, 0);

        $attempts = 0;
        while (count($suggestions) < 3 && $attempts < 100) {
            $attempts++;

            if ($current->isWeekend()) {
                $current = $current->copy()->nextWeekday()->setTime(8, 0);
                continue;
            }

            $hour = (int) $current->format('H');
            if ($hour >= 18) {
                $current = $current->copy()->addDay()->setTime(8, 0);
                continue;
            }

            $slotEnd = $current->copy()->addMinutes($durationMin);

            // Vérifier les conflits pour tous les participants
            $hasConflict = \DB::table('events')
                ->join('event_participants', 'events.id', '=', 'event_participants.event_id')
                ->where('events.organization_id', $orgId)
                ->whereIn('event_participants.user_id', $participantIds)
                ->where('events.start_at', '<', $slotEnd->toDateTimeString())
                ->where('events.end_at', '>', $current->toDateTimeString())
                ->exists();

            if (! $hasConflict) {
                // Score basé sur les habitudes
                $hourScore = $favHours[$hour] ?? 0;
                $suggestions[] = [
                    'start' => $current->toDateTimeString(),
                    'end'   => $slotEnd->toDateTimeString(),
                    'score' => $hourScore,
                    'label' => $current->locale('fr')->isoFormat('dddd D MMMM [à] HH[h]mm'),
                ];
            }

            $current = $current->copy()->addMinutes(30);
        }

        // Trier par score (heures préférées en premier)
        usort($suggestions, fn($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($suggestions, 0, 3);
    }

    // =========================================================================
    // PRÉDICTION VOLUME VISITEURS
    // =========================================================================

    /**
     * Prédit le volume de visiteurs pour une date donnée.
     *
     * Algorithme : moyenne pondérée des mêmes jours de semaine sur les 4 dernières semaines.
     *
     * @param Organization $org   Organisation
     * @param Carbon       $date  Date cible
     *
     * @return array {
     *   predicted_count: int,
     *   confidence: float,
     *   min: int,
     *   max: int,
     *   day_label: string,
     * }
     */
    public function predictVisitorVolume(Organization $org, Carbon $date): array
    {
        $cacheKey = "pred_visitors:{$org->id}:{$date->toDateString()}";

        return Cache::remember($cacheKey, now()->addHours(2), function () use ($org, $date) {
            return $this->computeVisitorVolume($org, $date);
        });
    }

    private function computeVisitorVolume(Organization $org, Carbon $date): array
    {
        $dayOfWeek = $date->dayOfWeek; // 0=dim, 1=lun, ...
        $orgId     = $org->id;

        // Volumes des mêmes jours de la semaine sur les 8 dernières semaines
        $historicalData = [];

        for ($i = 1; $i <= 8; $i++) {
            $pastDate = $date->copy()->subWeeks($i);
            // Trouver le même jour de semaine
            $sameDay = $pastDate->copy()->startOfWeek()->addDays($dayOfWeek);

            $count = \DB::table('visitors')
                ->where('organization_id', $orgId)
                ->whereDate('created_at', $sameDay->toDateString())
                ->count();

            $historicalData[] = $count;
        }

        if (empty($historicalData)) {
            return ['predicted_count' => 0, 'confidence' => 0.0, 'min' => 0, 'max' => 0];
        }

        // Pondération : semaines récentes comptent plus
        $weighted = 0;
        $totalWeight = 0;
        foreach ($historicalData as $i => $count) {
            $weight      = 8 - $i;
            $weighted   += $count * $weight;
            $totalWeight += $weight;
        }

        $predicted = $totalWeight > 0 ? (int) round($weighted / $totalWeight) : 0;

        // Écart-type pour les intervalles de confiance
        $mean    = array_sum($historicalData) / count($historicalData);
        $variance = array_sum(array_map(fn($x) => ($x - $mean) ** 2, $historicalData)) / count($historicalData);
        $stdDev  = sqrt($variance);

        $confidence = $stdDev < ($mean * 0.3) ? 0.80 : 0.55;

        return [
            'predicted_count' => $predicted,
            'confidence'      => round($confidence, 2),
            'min'             => max(0, $predicted - (int)$stdDev),
            'max'             => $predicted + (int)$stdDev,
            'day_label'       => $date->locale('fr')->isoFormat('dddd D MMMM YYYY'),
            'historical_avg'  => round($mean, 1),
        ];
    }

    // =========================================================================
    // HELPERS PRIVES
    // =========================================================================

    private function getFavoriteHours(array $participantIds): array
    {
        $rows = \DB::table('events')
            ->join('event_participants', 'events.id', '=', 'event_participants.event_id')
            ->whereIn('event_participants.user_id', $participantIds)
            ->where('events.start_at', '>=', now()->subMonths(3))
            ->selectRaw('EXTRACT(HOUR FROM events.start_at) as hour, COUNT(*) as cnt')
            ->groupBy('hour')
            ->get();

        $hours = [];
        foreach ($rows as $row) {
            $hours[$row->hour] = $row->cnt;
        }

        return $hours;
    }

    private function detectMetricAnomaly(
        string $currentTable, string $currentWhere, array $currentBindings,
        string $histTable, string $histWhere, callable $histBindings,
        string $metricKey, string $description
    ): ?array {
        try {
            $currentCount = \DB::table($currentTable)->whereRaw($currentWhere, $currentBindings)->count();

            // Historique 4 semaines
            $weekCounts = [];
            for ($i = 1; $i <= 4; $i++) {
                $week         = [
                    'start' => now()->subWeeks($i)->startOfWeek()->toDateTimeString(),
                    'end'   => now()->subWeeks($i)->endOfWeek()->toDateTimeString(),
                ];
                $weekCounts[] = \DB::table($histTable)->whereRaw($histWhere, $histBindings($week))->count();
            }

            if (empty($weekCounts) || array_sum($weekCounts) === 0) {
                return null;
            }

            $mean    = array_sum($weekCounts) / count($weekCounts);
            $variance = array_sum(array_map(fn($x) => ($x - $mean) ** 2, $weekCounts)) / count($weekCounts);
            $stdDev  = sqrt($variance);

            if ($stdDev < 0.5) {
                return null; // Pas assez de variation pour détecter une anomalie
            }

            $zScore = ($currentCount - $mean) / $stdDev;

            if (abs($zScore) < 2.0) {
                return null; // Pas d'anomalie (< 2 sigma)
            }

            $severity = abs($zScore) >= 3.0 ? 'high' : 'medium';
            $direction = $zScore > 0 ? 'hausse' : 'baisse';

            return [
                'type'     => $metricKey,
                'severity' => $severity,
                'message'  => sprintf(
                    "%s anormale : %s (normale : %.1f ± %.1f) — %s",
                    ucfirst($description),
                    $currentCount,
                    $mean,
                    $stdDev,
                    $direction
                ),
                'metric'   => $metricKey,
                'current'  => $currentCount,
                'expected' => round($mean, 1),
                'z_score'  => round($zScore, 2),
            ];

        } catch (\Throwable $e) {
            Log::warning("PredictionService::detectMetricAnomaly({$metricKey}) failed", [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function defaultTaskPrediction(Task $task): array
    {
        $defaultDays = match ($task->priority) {
            'urgent' => 1,
            'high'   => 3,
            'normal' => 7,
            'low'    => 14,
            default  => 7,
        };

        return [
            'estimated_date' => $this->addWorkingDays(now(), $defaultDays)->toDateString(),
            'confidence'     => 0.40,
            'days_estimate'  => $defaultDays,
            'reasoning'      => "Estimation par défaut (aucun historique disponible pour cet assigné).",
        ];
    }

    private function addWorkingDays(Carbon $date, int $days): Carbon
    {
        $result  = $date->copy();
        $added   = 0;
        $maxIter = $days * 3 + 10;
        $iter    = 0;

        while ($added < $days && $iter++ < $maxIter) {
            $result->addDay();
            if (! $result->isWeekend()) {
                $added++;
            }
        }

        return $result;
    }

    private function buildRecommendations(string $riskLevel, array $bottlenecks, int $daysLeft): array
    {
        $recs = [];

        if (in_array($riskLevel, ['high', 'critical'])) {
            $recs[] = "Convoquer une réunion de suivi de projet immédiatement";
            $recs[] = "Revoir les priorités et réassigner les tâches bloquées";
        }

        if ($daysLeft < 7 && $riskLevel !== 'low') {
            $recs[] = "Envisager de négocier un délai ou de réduire le périmètre";
        }

        if (count($bottlenecks) > 2) {
            $recs[] = "Identifier les dépendances bloquantes et les résoudre en priorité";
        }

        if (empty($recs)) {
            $recs[] = "Maintenir le rythme actuel et surveiller les tâches en révision";
        }

        return $recs;
    }

    private function pct(float $ratio): string
    {
        return (int) round($ratio * 100) . '%';
    }
}
