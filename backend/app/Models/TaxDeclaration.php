<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxDeclaration extends Model
{
    protected $fillable = [
        'organization_id',
        'fiscal_year_id',
        'declaration_type',
        'period_start',
        'period_end',
        'base_amount',
        'tax_rate',
        'tax_amount',
        'tax_credit',
        'net_tax',
        'status',
        'submitted_at',
        'reference_number',
        'breakdown',
        'created_by',
    ];

    protected $casts = [
        'period_start'  => 'date',
        'period_end'    => 'date',
        'submitted_at'  => 'datetime',
        'breakdown'     => 'array',
        'base_amount'   => 'decimal:2',
        'tax_rate'      => 'decimal:4',
        'tax_amount'    => 'decimal:2',
        'tax_credit'    => 'decimal:2',
        'net_tax'       => 'decimal:2',
    ];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getStatusLabelAttribute(): string
    {
        return [
            'draft'     => 'Brouillon',
            'submitted' => 'Soumis',
            'paid'      => 'Payé',
        ][$this->status] ?? $this->status;
    }
}
