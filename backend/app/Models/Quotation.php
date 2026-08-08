<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Quotation — devis/offre soumis par un fournisseur en réponse à un appel d'offres.
 * Table : quotations.
 */
class Quotation extends Model
{
    protected $table = 'quotations';

    protected $fillable = [
        'rfq_id',
        'supplier_id',
        'organization_id',
        'quotation_number',
        'items',
        'total_amount_xof',
        'currency_code',
        'validity_days',
        'delivery_days',
        'payment_terms',
        'technical_score',
        'financial_score',
        'total_score',
        'status',
        'notes',
        'file_path',
        'submitted_at',
    ];

    protected $casts = [
        'items'            => 'array',
        'total_amount_xof' => 'float',
        'technical_score'  => 'float',
        'financial_score'  => 'float',
        'total_score'      => 'float',
        'submitted_at'     => 'datetime',
    ];

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class, 'rfq_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
