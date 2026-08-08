<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * SupportSession — généré depuis le schéma réel de la table `support_sessions`.
 */
class SupportSession extends Model
{
    protected $table = 'support_sessions';

    protected $fillable = [
        'organization_id',
        'support_user_id',
        'authorized_by_id',
        'reason',
        'ticket_reference',
        'status',
        'requested_at',
        'approved_at',
        'started_at',
        'expires_at',
        'ended_at',
        'is_active',
        'client_notified',
        'actions_log',
        'ended_by',
        'end_notes',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'started_at' => 'datetime',
        'expires_at' => 'datetime',
        'ended_at' => 'datetime',
        'is_active' => 'boolean',
        'client_notified' => 'boolean',
        'actions_log' => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

}
