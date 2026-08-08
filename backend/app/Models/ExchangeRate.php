<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExchangeRate extends Model
{
    protected $table = 'exchange_rates';

    protected $fillable = [
        'from_currency',
        'to_currency',
        'rate',
        'inverse_rate',
        'source',
        'fetched_at',
        'valid_from',
        'variation_pct',
    ];

    protected $casts = [
        'rate'          => 'float',
        'inverse_rate'  => 'float',
        'variation_pct' => 'float',
        'fetched_at'    => 'datetime',
        'valid_from'    => 'datetime',
    ];

    /**
     * Devise source (jointure sur le code ISO).
     */
    public function fromCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'from_currency', 'code');
    }

    /**
     * Devise cible (jointure sur le code ISO).
     */
    public function toCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'to_currency', 'code');
    }
}
