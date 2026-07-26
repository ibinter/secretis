<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleGeofence extends Model
{
    protected $fillable = [
        'organization_id', 'name', 'type',
        'center_lat', 'center_lng', 'radius_meters',
        'polygon_coords', 'alert_on_enter', 'alert_on_exit',
        'is_active', 'notify_user_ids',
    ];

    protected $casts = [
        'polygon_coords'  => 'array',
        'notify_user_ids' => 'array',
        'alert_on_enter'  => 'boolean',
        'alert_on_exit'   => 'boolean',
        'is_active'       => 'boolean',
    ];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
}
