<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AuditLog — généré depuis le schéma réel de la table `audit_logs`.
 */
class AuditLog extends Model
{
    protected $table = 'audit_logs';

    protected $fillable = [
        'organization_id',
        'user_id',
        'user_name',
        'user_role',
        'action',
        'module',
        'resource_type',
        'resource_id',
        'resource_label',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
        'country',
        'session_id',
        'is_support_session',
        'support_session_id',
        'severity',
        'is_sensitive',
        'result',
        'notes',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'is_support_session' => 'boolean',
        'is_sensitive' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

}
