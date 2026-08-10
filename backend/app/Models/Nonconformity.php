<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Nonconformity extends Model
{
    protected $table = 'nonconformities';
    protected $guarded = [];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function detectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'detected_by');
    }

    public function process(): BelongsTo
    {
        return $this->belongsTo(QualityProcess::class, 'process_id');
    }

    public function correctiveActionsList(): HasMany
    {
        return $this->hasMany(CorrectiveAction::class, 'nonconformity_id');
    }
}
