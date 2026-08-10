<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivationKey extends Model
{
    protected $table = 'activation_keys';

    protected $fillable = [
        'code',
        'plan_id',
        'organization_id',
        'duration_months',
        'value_fcfa',
        'status',
        'lot_reference',
        'used_by',
        'used_at',
        'expires_at',
        'created_by',
    ];

    protected $casts = [
        'used_at'         => 'datetime',
        'expires_at'      => 'datetime',
        'duration_months' => 'integer',
        'value_fcfa'      => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function usedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }

    public function markAsUsed(int $userId): bool
    {
        return $this->update([
            'status'  => 'used',
            'used_by' => $userId,
            'used_at' => now(),
        ]);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function scopeByLot($query, string $lot)
    {
        return $query->where('lot_reference', $lot);
    }
}
