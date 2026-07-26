<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * VehicleRequest — Demande de mise à disposition d'un véhicule
 *
 * @property int         $id
 * @property int         $organization_id
 * @property int|null    $vehicle_id       Véhicule assigné (après approbation)
 * @property int         $requested_by
 * @property int|null    $approved_by
 * @property string      $status           pending|approved|rejected|completed
 * @property \Carbon\Carbon $start_at
 * @property \Carbon\Carbon $end_at
 * @property string      $destination
 * @property string      $purpose
 * @property string|null $rejection_reason
 */
class VehicleRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'vehicle_id',
        'requested_by',
        'approved_by',
        'status',
        'start_at',
        'end_at',
        'destination',
        'purpose',
        'rejection_reason',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at'   => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(VehicleLog::class);
    }
}
