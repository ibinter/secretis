<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleFuelLog extends Model
{
    protected $fillable = [
        'vehicle_id', 'organization_id', 'driver_user_id',
        'fuel_date', 'fuel_type', 'quantity_liters', 'unit_price',
        'odometer_km', 'station_name', 'receipt_path', 'full_tank', 'created_by',
    ];

    protected $casts = [
        'fuel_date'  => 'date',
        'full_tank'  => 'boolean',
        'total_cost' => 'decimal:2',
    ];

    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class); }
    public function driver(): BelongsTo  { return $this->belongsTo(User::class, 'driver_user_id'); }
}
