<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * TaskDependency — Dépendance entre deux tâches (diagramme de Gantt).
 *
 * Table réelle : `task_dependencies`
 * (migration 2026_01_01_000101_enhance_projects_tables.php)
 * Colonnes : task_id, depends_on_task_id, dependency_type, lag_days.
 *
 * Utilisé par App\Http\Controllers\ProjectController::storeDependency() /
 * ::destroyDependency() (route model binding) et ::wouldCreateCycle().
 */
class TaskDependency extends Model
{
    protected $table = 'task_dependencies';

    protected $fillable = [
        'task_id',
        'depends_on_task_id',
        'dependency_type',
        'lag_days',
    ];

    protected $casts = [
        'task_id'            => 'integer',
        'depends_on_task_id' => 'integer',
        'lag_days'           => 'integer',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function dependsOnTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'depends_on_task_id');
    }
}
