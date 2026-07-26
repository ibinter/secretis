<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SignatureAuditTrail extends Model
{
    public const UPDATED_AT = null; // Pas de updated_at

    protected $fillable = [
        'request_id', 'event_type', 'actor_email', 'actor_ip', 'data',
    ];

    protected $casts = [
        'data'       => 'array',
        'created_at' => 'datetime',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(SignatureRequest::class);
    }
}
