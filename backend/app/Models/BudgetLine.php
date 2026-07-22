<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BudgetLine extends Model
{
    protected $fillable = [
        'budget_id',
        'account_number',
        'account_name',
        'department_id',
        'project_id',
        'description',
        'q1_amount',
        'q2_amount',
        'q3_amount',
        'q4_amount',
        'annual_amount',
        'is_income',
        'category',
    ];

    protected $casts = [
        'q1_amount'     => 'decimal:2',
        'q2_amount'     => 'decimal:2',
        'q3_amount'     => 'decimal:2',
        'q4_amount'     => 'decimal:2',
        'annual_amount' => 'decimal:2',
        'is_income'     => 'boolean',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(BudgetAlert::class);
    }
}
