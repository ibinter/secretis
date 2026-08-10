<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'organization_id',
        'connector_id',
        'direction',
        'event_type',
        'payload_hash',
        'status',
        'duration_ms',
        'http_status',
        'error_detail',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function connector(): BelongsTo
    {
        return $this->belongsTo(IntegrationConnector::class, 'connector_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
