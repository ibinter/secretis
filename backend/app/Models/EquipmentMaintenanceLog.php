<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * EquipmentMaintenanceLog — Historique des maintenances d'un équipement
 *
 * @property int         $id
 * @property int         $equipment_id
 * @property int         $requested_by
 * @property string      $reason
 * @property string      $status          pending|in_progress|done
 * @property string|null $resolution_notes
 * @property \Carbon\Carbon|null $resolved_at
 */
class EquipmentMaintenanceLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'equipment_id',
        'requested_by',
        'reason',
        'status',
        'resolution_notes',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}
