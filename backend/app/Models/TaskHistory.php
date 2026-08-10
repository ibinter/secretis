<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * TaskHistory — journal des changements d'une tâche (création, statuts…).
 * Table : task_histories (convention Laravel).
 */
class TaskHistory extends Model
{
    protected $fillable = [
        'task_id',
        'user_id',
        'from_status',
        'to_status',
        'comment',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
