<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * PartnerCommission — Commission mensuelle due à un partenaire
 *
 * @property int         $id
 * @property int         $partner_id
 * @property int         $partner_referral_id
 * @property \Carbon\Carbon $period_month   Premier jour du mois concerné
 * @property float       $amount
 * @property string      $status   pending|approved|paid
 * @property \Carbon\Carbon|null $paid_at
 * @property string|null $payment_reference
 */
class PartnerCommission extends Model
{
    use HasFactory;

    protected $fillable = [
        'partner_id',
        'partner_referral_id',
        'period_month',
        'amount',
        'status',
        'paid_at',
        'payment_reference',
    ];

    protected $casts = [
        'period_month' => 'date',
        'amount'       => 'float',
        'paid_at'      => 'datetime',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function referral(): BelongsTo
    {
        return $this->belongsTo(PartnerReferral::class, 'partner_referral_id');
    }
}
