<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QualityIndicator extends Model
{
    protected $table = 'quality_indicators';
    protected $guarded = [];

    public function values(): HasMany
    {
        return $this->hasMany(QualityIndicatorValue::class, 'indicator_id');
    }

    public function latestValue(): HasOne
    {
        return $this->hasOne(QualityIndicatorValue::class, 'indicator_id')->latestOfMany('id');
    }
}
