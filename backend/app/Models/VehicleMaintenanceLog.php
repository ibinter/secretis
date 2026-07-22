<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleMaintenanceLog extends Model
{
    protected $fillable = [
        'vehicle_id', 'organization_id', 'maintenance_type',
        'done_date', 'done_km', 'cost', 'garage_name',
        'invoice_path', 'notes', 'created_by',
    ];

    protected $casts = ['done_date' => 'date'];

    public function vehicle(): BelongsTo   { return $this->belongsTo(Vehicle::class); }
    public function creator(): BelongsTo   { return $this->belongsTo(User::class, 'created_by'); }
}
