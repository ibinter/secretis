<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Currency extends Model
{
    protected $table = 'currencies';

    protected $fillable = [
        'code',
        'name',
        'name_en',
        'symbol',
        'decimal_places',
        'symbol_position',
        'decimal_separator',
        'thousands_separator',
        'region',
        'is_default_for_region',
        'countries',
        'is_active',
    ];

    protected $casts = [
        'decimal_places'        => 'integer',
        'is_default_for_region' => 'boolean',
        'is_active'             => 'boolean',
        'countries'             => 'array',
    ];

    /**
     * Taux de change dont cette devise est la source.
     */
    public function ratesFrom(): HasMany
    {
        return $this->hasMany(ExchangeRate::class, 'from_currency', 'code');
    }

    /**
     * Taux de change dont cette devise est la cible.
     */
    public function ratesTo(): HasMany
    {
        return $this->hasMany(ExchangeRate::class, 'to_currency', 'code');
    }
}
