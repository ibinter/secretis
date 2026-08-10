<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Facture fournisseur — dernière étape du cycle achat.
 *
 * C'est le seul document qui porte la TVA déductible : ni `purchase_orders`
 * (total sans ventilation) ni `expenses` (simple montant) ne permettent de la
 * récupérer.
 */
class SupplierInvoice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'organization_id', 'supplier_id', 'purchase_order_id',
        'invoice_number', 'internal_reference', 'invoice_date', 'due_date',
        'subtotal', 'tax_rate', 'tax_amount', 'total', 'paid_amount',
        'currency', 'status', 'expense_account', 'file_path', 'notes',
        'created_by',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date'     => 'date',
        'subtotal'     => 'float',
        'tax_rate'     => 'float',
        'tax_amount'   => 'float',
        'total'        => 'float',
        'paid_amount'  => 'float',
    ];

    /** Statuts admis. `draft` ne se comptabilise pas. */
    public const STATUTS = ['draft', 'received', 'paid', 'disputed', 'cancelled'];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Reste dû. */
    public function getBalanceDueAttribute(): float
    {
        return round($this->total - $this->paid_amount, 2);
    }
}
