<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * MeetingDecision — généré depuis le schéma réel de la table `meeting_decisions`.
 */
class MeetingDecision extends Model
{
    protected $table = 'meeting_decisions';

    protected $fillable = [
        'meeting_id',
        'decision',
        'action_required',
        'responsible_id',
        'deadline',
        'status',
        'position',
    ];

    protected $casts = [
        'deadline' => 'datetime',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class, 'meeting_id');
    }

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }

}
