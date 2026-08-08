<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Rfq — Appel d'offres (demande de cotation).
 * Table : rfqs.
 */
class Rfq extends Model
{
    use SoftDeletes;

    protected $table = 'rfqs';

    protected $fillable = [
        'organization_id',
        'rfq_number',
        'title',
        'description',
        'purchase_request_id',
        'items',
        'closing_date',
        'status',
        'selected_quotation_id',
        'evaluation_criteria',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'items'               => 'array',
        'evaluation_criteria' => 'array',
        'closing_date'        => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function purchaseRequest(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequest::class, 'purchase_request_id');
    }

    public function rfqSuppliers(): HasMany
    {
        return $this->hasMany(RfqSupplier::class, 'rfq_id');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class, 'rfq_id');
    }

    public function selectedQuotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class, 'selected_quotation_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
