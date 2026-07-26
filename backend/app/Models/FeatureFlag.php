<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeatureFlag extends Model
{
    protected $guarded = [];

    protected $casts = [
        'enabled'    => 'boolean',
        'conditions' => 'array',
    ];
}
