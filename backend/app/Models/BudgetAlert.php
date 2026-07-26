<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetAlert extends Model
{
    protected $fillable = [
        'organization_id',
        'budget_line_id',
        'alert_type',
        'threshold_percent',
        'notification_user_ids',
        'is_active',
    ];

    protected $casts = [
        'notification_user_ids' => 'array',
        'is_active'             => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function budgetLine(): BelongsTo
    {
        return $this->belongsTo(BudgetLine::class);
    }
}
