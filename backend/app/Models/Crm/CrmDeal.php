<?php

namespace App\Models\Crm;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmDeal extends Model
{
    protected $table = 'crm_deals';

    protected $fillable = [
        'contact_id', 'stage_id', 'title', 'value', 'currency', 'plan',
        'users_count', 'close_date_expected', 'close_date_actual',
        'probability', 'lost_reason', 'notes', 'assigned_to',
    ];

    protected $casts = [
        'value'                => 'integer',
        'users_count'          => 'integer',
        'probability'          => 'integer',
        'close_date_expected'  => 'date',
        'close_date_actual'    => 'date',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(CrmPipelineStage::class, 'stage_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class, 'deal_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function getEffectiveProbabilityAttribute(): int
    {
        return $this->probability ?? $this->stage?->probability_percent ?? 0;
    }

    public function getWeightedValueAttribute(): int
    {
        return (int) ($this->value * ($this->effective_probability / 100));
    }
}
