<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ProjectRisk — risque identifié sur un projet.
 * Table : project_risks.
 */
class ProjectRisk extends Model
{
    protected $table = 'project_risks';

    protected $fillable = [
        'project_id',
        'owner_id',
        'title',
        'description',
        'probability',
        'impact',
        'mitigation',
        'status',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
