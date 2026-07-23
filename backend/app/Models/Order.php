<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Order — Commande d'abonnement SECRETIS ERP
 *
 * SÉCURITÉ :
 * - Le montant est calculé CÔTÉ SERVEUR depuis la base (jamais depuis le client)
 * - L'idempotency_key est unique en base — empêche la double-activation
 * - expires_at est fixé à 48h côté serveur
 * - paid_at est fixé par now() côté serveur uniquement
 *
 * @property int         $id
 * @property string      $reference           ORD-2026-XXXXX
 * @property int         $organization_id
 * @property int         $user_id
 * @property string      $plan_code
 * @property string      $period
 * @property int         $quantity_months
 * @property float       $amount
 * @property string      $currency
 * @property float|null  $amount_xof
 * @property string      $payment_method_type
 * @property string|null $payment_method_provider
 * @property string      $status
 * @property bool        $is_renewal
 * @property string|null $coupon_code
 * @property float       $discount_amount
 * @property string      $idempotency_key
 * @property \Carbon\Carbon|null $expires_at
 * @property \Carbon\Carbon|null $paid_at
 * @property array|null  $metadata
 */
class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'reference',
        'organization_id',
        'user_id',
        'plan_code',
        'period',
        'quantity_months',
        'amount',
        'currency',
        'amount_xof',
        'payment_method_type',
        'payment_method_provider',
        'status',
        'is_renewal',
        'coupon_code',
        'discount_amount',
        'idempotency_key',
        'expires_at',
        'paid_at',
        'metadata',
    ];

    protected $casts = [
        'amount'          => 'decimal:2',
        'amount_xof'      => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'is_renewal'      => 'boolean',
        'expires_at'      => 'datetime',
        'paid_at'         => 'datetime',
        'metadata'        => 'array',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function proofs(): HasMany
    {
        return $this->hasMany(PaymentProof::class);
    }

    public function latestProof(): HasOne
    {
        return $this->hasOne(PaymentProof::class)->latestOfMany();
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('status', 'paid');
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->where('expires_at', '<', now())
                     ->whereIn('status', ['pending', 'awaiting_proof']);
    }

    public function scopeForOrganization(Builder $query, int $orgId): Builder
    {
        return $query->where('organization_id', $orgId);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Vérifie si la commande est encore valide (non expirée).
     */
    public function isValid(): bool
    {
        return $this->expires_at === null || $this->expires_at->isFuture();
    }

    /**
     * Vérifie si la commande est un paiement manuel (nécessite preuve).
     */
    public function requiresProof(): bool
    {
        return in_array($this->payment_method_type, [
            'mobile_money',
            'bank_transfer',
            'international_transfer',
            'money_transfer',
            'cash_agency',
            'check',
            'crypto',
        ], true);
    }

    /**
     * Vérifie si la commande est un paiement électronique (activation via webhook).
     */
    public function isElectronic(): bool
    {
        return $this->payment_method_type === 'electronic';
    }

    /**
     * Montant net après remise.
     */
    public function getNetAmount(): float
    {
        return max(0, (float) $this->amount - (float) $this->discount_amount);
    }
}
