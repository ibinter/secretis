<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Partner — Partenaire du programme IBIG PARTNERS
 *
 * @property int         $id
 * @property int|null    $user_id
 * @property string      $company_name
 * @property string      $contact_name
 * @property string      $email
 * @property string|null $phone
 * @property string      $country
 * @property string      $partner_type    reseller|integrator|consultant|trainer|affiliate
 * @property string      $status          pending|active|suspended|terminated
 * @property float       $commission_rate
 * @property string      $referral_code
 * @property string|null $bank_name
 * @property string|null $bank_account
 * @property string|null $bank_iban
 * @property int         $total_clients
 * @property float       $total_revenue
 * @property float       $total_commissions
 * @property string|null $notes
 * @property \Carbon\Carbon|null $approved_at
 * @property int|null    $approved_by
 */
class Partner extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'company_name',
        'contact_name',
        'email',
        'phone',
        'country',
        'partner_type',
        'status',
        'commission_rate',
        'referral_code',
        'bank_name',
        'bank_account',
        'bank_iban',
        'total_clients',
        'total_revenue',
        'total_commissions',
        'notes',
        'approved_at',
        'approved_by',
    ];

    protected $casts = [
        'commission_rate'   => 'float',
        'total_clients'     => 'integer',
        'total_revenue'     => 'float',
        'total_commissions' => 'float',
        'approved_at'       => 'datetime',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function referrals(): HasMany
    {
        return $this->hasMany(PartnerReferral::class);
    }

    public function commissions(): HasMany
    {
        return $this->hasMany(PartnerCommission::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('partner_type', $type);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    // ─── Accessors ────────────────────────────────────────────────────────────

    /**
     * Montant total des commissions en attente de paiement.
     */
    public function getPendingCommissions(): float
    {
        return (float) $this->commissions()
            ->whereIn('status', ['pending', 'approved'])
            ->sum('amount');
    }

    /**
     * Libellé humain du type de partenaire.
     */
    public function getPartnerTypeLabel(): string
    {
        return match ($this->partner_type) {
            'reseller'   => 'Revendeur',
            'integrator' => 'Intégrateur',
            'consultant' => 'Consultant',
            'trainer'    => 'Formateur',
            'affiliate'  => 'Affilié',
            default      => ucfirst($this->partner_type),
        };
    }

    // ─── Static helpers ───────────────────────────────────────────────────────

    /**
     * Génère un code de parrainage unique : IBP + 9 caractères alphanumériques majuscules.
     */
    public static function generateReferralCode(): string
    {
        do {
            $code = 'IBP' . strtoupper(Str::random(9));
        } while (static::where('referral_code', $code)->exists());

        return $code;
    }
}
