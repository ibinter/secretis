<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    protected $fillable = [
        'invoice_id',
        'description',
        'quantity',
        'unit_price',
        'total',
        'sort_order',
    ];

    protected $casts = [
        'quantity'   => 'float',
        'unit_price' => 'float',
        'total'      => 'float',
        'sort_order' => 'integer',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Recalcule le total de la ligne.
     */
    public function recalculate(): void
    {
        $this->total = round($this->quantity * $this->unit_price, 2);
    }
}
