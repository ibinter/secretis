<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ProjectTimesheet — feuille de temps saisie sur un projet.
 * Table : project_timesheets.
 */
class ProjectTimesheet extends Model
{
    protected $table = 'project_timesheets';

    protected $fillable = [
        'project_id',
        'task_id',
        'user_id',
        'date',
        'hours',
        'description',
        'is_billable',
        'hourly_rate',
    ];

    protected $casts = [
        'date'        => 'date',
        'hours'       => 'float',
        'is_billable' => 'boolean',
        'hourly_rate' => 'float',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
