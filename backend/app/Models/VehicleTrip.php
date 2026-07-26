<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleTrip extends Model
{
    protected $fillable = [
        'vehicle_id', 'organization_id', 'driver_user_id',
        'start_at', 'end_at', 'start_location', 'end_location',
        'start_lat', 'start_lng', 'end_lat', 'end_lng',
        'distance_km', 'duration_minutes', 'avg_speed', 'max_speed',
        'fuel_consumed_liters', 'purpose', 'notes', 'polyline', 'status',
    ];

    protected $casts = [
        'start_at'   => 'datetime',
        'end_at'     => 'datetime',
        'distance_km'=> 'decimal:2',
    ];

    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class); }
    public function driver(): BelongsTo  { return $this->belongsTo(User::class, 'driver_user_id'); }
}
