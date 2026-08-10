<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * SupplyMovement — Entrée / Sortie de stock d'une fourniture
 *
 * @property int    $id
 * @property int    $supply_id
 * @property int    $user_id
 * @property string $type         in|out
 * @property int    $quantity
 * @property string $reason
 * @property int    $stock_after  Stock résultant après le mouvement
 */
class SupplyMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'supply_id',
        'user_id',
        'type',
        'quantity',
        'stock_before',
        'reason',
        'source_type',
        'source_id',
        'stock_after',
        'unit_cost',
        'total_cost',
    ];

    protected $casts = [
        'quantity'     => 'integer',
        'stock_before' => 'integer',
        'stock_after'  => 'integer',
        'unit_cost'    => 'float',
        'total_cost'   => 'float',
    ];

    public function supply(): BelongsTo
    {
        return $this->belongsTo(Supply::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
