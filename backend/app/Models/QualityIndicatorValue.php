<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * QualityIndicatorValue — généré depuis le schéma réel de la table `quality_indicator_values`.
 */
class QualityIndicatorValue extends Model
{
    protected $table = 'quality_indicator_values';

    protected $fillable = [
        'indicator_id',
        'organization_id',
        'period_year',
        'period_month',
        'value',
        'comment',
        'recorded_by',
        'recorded_at',
    ];

    protected $casts = [
        'value' => 'float',
        'recorded_at' => 'datetime',
    ];

    public function indicator(): BelongsTo
    {
        return $this->belongsTo(QualityIndicator::class, 'indicator_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

}
