<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleAssignment extends Model
{
    protected $fillable = [
        'vehicle_id', 'organization_id', 'user_id', 'assignment_type',
        'start_date', 'end_date', 'purpose', 'approved_by', 'status',
        'return_condition', 'return_notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
    ];

    public function vehicle(): BelongsTo  { return $this->belongsTo(Vehicle::class); }
    public function user(): BelongsTo     { return $this->belongsTo(User::class); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
}
