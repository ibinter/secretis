<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PracticalCaseCompletion extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'practical_case_id',
        'completed_at',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function practicalCase(): BelongsTo
    {
        return $this->belongsTo(PracticalCase::class);
    }
}
