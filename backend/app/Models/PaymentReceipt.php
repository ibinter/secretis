<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * PaymentReceipt — Reçu de paiement lié à une facture
 *
 * Supporte les paiements partiels (plusieurs reçus par facture).
 */
class PaymentReceipt extends Model
{
    protected $fillable = [
        'invoice_id',
        'organization_id',
        'amount',
        'payment_date',
        'payment_method',
        'reference',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount'       => 'float',
        'payment_date' => 'date',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Libellé du mode de paiement.
     */
    public function getPaymentMethodLabel(): string
    {
        return match ($this->payment_method) {
            'virement'     => 'Virement bancaire',
            'mobile_money' => 'Mobile Money',
            'especes'      => 'Espèces',
            'cheque'       => 'Chèque',
            'carte'        => 'Carte bancaire',
            default        => $this->payment_method,
        };
    }
}
