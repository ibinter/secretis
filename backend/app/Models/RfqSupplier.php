<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * RfqSupplier — fournisseur invité à un appel d'offres.
 * Table : rfq_suppliers.
 */
class RfqSupplier extends Model
{
    protected $table = 'rfq_suppliers';

    protected $fillable = [
        'rfq_id',
        'supplier_id',
        'invited_at',
        'responded_at',
        'status',
    ];

    protected $casts = [
        'invited_at'   => 'datetime',
        'responded_at' => 'datetime',
    ];

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class, 'rfq_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }
}
