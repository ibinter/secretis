<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * TaskComment — généré depuis le schéma réel de la table `task_comments`.
 */
class TaskComment extends Model
{
    use SoftDeletes;

    protected $table = 'task_comments';

    protected $fillable = [
        'task_id',
        'user_id',
        'content',
        'attachments',
        'parent_comment_id',
    ];

    protected $casts = [
        'attachments' => 'array',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

}
