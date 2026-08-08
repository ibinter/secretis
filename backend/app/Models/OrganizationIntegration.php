<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationIntegration extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'organization_id',
        'connector_id',
        'status',
        'config',
        'last_sync_at',
        'error_message',
        'created_by',
    ];

    protected $casts = [
        'config'       => 'encrypted:array',
        'last_sync_at' => 'datetime',
    ];

    public function connector(): BelongsTo
    {
        return $this->belongsTo(IntegrationConnector::class, 'connector_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
