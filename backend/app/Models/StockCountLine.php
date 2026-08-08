<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ligne de comptage.
 *
 * `counted_quantity` reste NULL tant que la ligne n'a pas été comptée — à
 * distinguer d'un comptage à zéro, qui est lui une information : l'article a
 * été cherché et il n'y en avait plus.
 */
class StockCountLine extends Model
{
    protected $fillable = [
        'stock_count_id', 'supply_id', 'expected_quantity',
        'counted_quantity', 'unit_cost', 'note',
    ];

    protected $casts = [
        'expected_quantity' => 'integer',
        'counted_quantity'  => 'integer',
        'unit_cost'         => 'float',
    ];

    public function stockCount(): BelongsTo
    {
        return $this->belongsTo(StockCount::class);
    }

    public function supply(): BelongsTo
    {
        return $this->belongsTo(Supply::class);
    }

    /** Écart constaté. Négatif = manquant. */
    public function getVarianceAttribute(): ?int
    {
        return $this->counted_quantity === null
            ? null
            : $this->counted_quantity - $this->expected_quantity;
    }
}
