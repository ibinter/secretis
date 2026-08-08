<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ProjectMilestone — jalon d'un projet.
 * Table : project_milestones.
 */
class ProjectMilestone extends Model
{
    protected $table = 'project_milestones';

    protected $fillable = [
        'project_id',
        'name',
        'description',
        'due_date',
        'completed_at',
        'status',
        'position',
    ];

    protected $casts = [
        'due_date'     => 'date',
        'completed_at' => 'date',
        'position'     => 'integer',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
