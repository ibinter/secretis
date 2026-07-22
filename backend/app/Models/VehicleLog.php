<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * VehicleLog — Entrée carnet de bord véhicule
 *
 * @property int         $id
 * @property int         $vehicle_id
 * @property int         $user_id
 * @property int|null    $vehicle_request_id
 * @property int         $mileage_start
 * @property int         $mileage_end
 * @property float|null  $fuel_added        Litres ajoutés
 * @property string|null $destination
 * @property string|null $purpose
 * @property \Carbon\Carbon $departed_at
 * @property \Carbon\Carbon|null $returned_at
 */
class VehicleLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'user_id',
        'vehicle_request_id',
        'mileage_start',
        'mileage_end',
        'fuel_added',
        'destination',
        'purpose',
        'departed_at',
        'returned_at',
    ];

    protected $casts = [
        'mileage_start' => 'integer',
        'mileage_end'   => 'integer',
        'fuel_added'    => 'float',
        'departed_at'   => 'datetime',
        'returned_at'   => 'datetime',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vehicleRequest(): BelongsTo
    {
        return $this->belongsTo(VehicleRequest::class);
    }

    /**
     * Distance parcourue pour ce trajet.
     */
    public function distance(): int
    {
        return max(0, $this->mileage_end - $this->mileage_start);
    }
}
