<?php

namespace App\Models\Crm;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmActivity extends Model
{
    protected $table = 'crm_activities';

    protected $fillable = [
        'contact_id', 'deal_id', 'type', 'subject', 'notes',
        'scheduled_at', 'completed_at', 'outcome', 'created_by',
    ];

    protected $casts = [
        'scheduled_at'  => 'datetime',
        'completed_at'  => 'datetime',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(CrmDeal::class, 'deal_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getIsDoneAttribute(): bool
    {
        return $this->completed_at !== null;
    }
}
