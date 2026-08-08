<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Degradation de la sante d'un projet — alerte au chef de projet.
 *
 * Appelee par App\Jobs\RecalculateProjectHealth::notifyManager() :
 *   new ProjectHealthChanged($project, $from, $to)
 * Valeurs : on_track | at_risk | off_track
 */
class ProjectHealthChanged extends Notification implements ShouldQueue
{
    use Queueable;

    private const LABELS = [
        'on_track'  => 'dans les temps',
        'at_risk'   => 'à risque',
        'off_track' => 'en dérive',
    ];

    public function __construct(
        public readonly Project $project,
        public readonly string  $from,
        public readonly string  $to,
    ) {
        $this->queue = 'notifications';
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $fromLabel = self::LABELS[$this->from] ?? $this->from;
        $toLabel   = self::LABELS[$this->to]   ?? $this->to;

        return [
            'type'               => 'project_health_changed',
            'category'           => 'task',
            'severity'           => $this->to === 'off_track' ? 'error' : 'warning',
            'title'              => 'Santé du projet dégradée',
            'body'               => "Le projet « {$this->project->name} » est passé de « {$fromLabel} » à « {$toLabel} ».",
            'action_url'         => '/projets/' . $this->project->id,
            'action_label'       => 'Ouvrir le projet',
            'project_id'         => $this->project->id,
            'from'               => $this->from,
            'to'                 => $this->to,
            'completion_percent' => $this->project->completion_percent,
        ];
    }
}
