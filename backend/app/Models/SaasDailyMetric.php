<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SaasDailyMetric extends Model
{
    protected $guarded = [];

    protected $casts = [
        'date'    => 'date',
        'metrics' => 'array',
    ];
}
