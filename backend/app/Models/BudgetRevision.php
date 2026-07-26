<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BudgetRevision extends Model
{
    protected $fillable = [
        'budget_id',
        'revision_number',
        'reason',
        'previous_lines',
        'revised_by',
        'revised_at',
    ];

    protected $casts = [
        'previous_lines' => 'array',
        'revised_at'     => 'datetime',
    ];

    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    public function revisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revised_by');
    }
}
