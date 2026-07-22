<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleMaintenanceSchedule extends Model
{
    protected $fillable = [
        'vehicle_id', 'organization_id', 'maintenance_type',
        'interval_km', 'interval_days', 'last_done_km', 'last_done_date',
        'next_due_km', 'next_due_date', 'cost_last', 'notes', 'is_active',
    ];

    protected $casts = [
        'last_done_date' => 'date',
        'next_due_date'  => 'date',
        'is_active'      => 'boolean',
    ];

    public function vehicle(): BelongsTo { return $this->belongsTo(Vehicle::class); }
}
