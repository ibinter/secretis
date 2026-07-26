<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleGpsLog extends Model
{
    protected $fillable = [
        'vehicle_id', 'organization_id', 'latitude', 'longitude',
        'speed_kmh', 'heading', 'altitude', 'accuracy',
        'engine_on', 'fuel_level_percent', 'odometer_km',
        'recorded_at', 'source',
    ];

    protected $casts = [
        'latitude'           => 'decimal:7',
        'longitude'          => 'decimal:7',
        'engine_on'          => 'boolean',
        'recorded_at'        => 'datetime',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
