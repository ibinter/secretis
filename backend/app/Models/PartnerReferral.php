<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * PartnerReferral — Organisation référée par un partenaire
 *
 * @property int         $id
 * @property int         $partner_id
 * @property int         $organization_id
 * @property \Carbon\Carbon $referred_at
 * @property \Carbon\Carbon|null $converted_at
 * @property string      $plan_name
 * @property float       $monthly_amount
 * @property float       $commission_rate
 * @property string      $status   pending|active|churned
 */
class PartnerReferral extends Model
{
    use HasFactory;

    protected $fillable = [
        'partner_id',
        'organization_id',
        'referred_at',
        'converted_at',
        'plan_name',
        'monthly_amount',
        'commission_rate',
        'status',
    ];

    protected $casts = [
        'referred_at'    => 'datetime',
        'converted_at'   => 'datetime',
        'monthly_amount' => 'float',
        'commission_rate'=> 'float',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(PartnerCommission::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Montant de commission mensuelle calculé à partir du taux.
     */
    public function monthlyCommissionAmount(): float
    {
        return round($this->monthly_amount * ($this->commission_rate / 100), 2);
    }
}
