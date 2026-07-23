<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * License — Licence d'abonnement SECRETIS ERP
 *
 * @property int         $id
 * @property int         $organization_id
 * @property string      $plan_id          starter|pro|enterprise
 * @property string      $plan_name
 * @property float       $price
 * @property string      $billing_cycle     monthly|yearly
 * @property string      $status            trial|active|suspended|expired|cancelled
 * @property int         $max_users
 * @property array|null  $features
 * @property array|null  $modules
 * @property \Carbon\Carbon $starts_at
 * @property \Carbon\Carbon $ends_at
 * @property \Carbon\Carbon|null $grace_until
 * @property int|null    $activated_by
 * @property int|null    $suspended_by
 * @property string|null $suspension_reason
 * @property string|null $external_ref
 */
class License extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'plan_id',
        'plan_name',
        'price',
        'billing_cycle',
        'status',
        'max_users',
        'features',
        'modules',
        'starts_at',
        'ends_at',
        'grace_until',
        'activated_by',
        'suspended_by',
        'suspension_reason',
        'external_ref',
    ];

    protected $casts = [
        'price'       => 'float',
        'max_users'   => 'integer',
        'features'    => 'array',
        'modules'     => 'array',
        'starts_at'   => 'datetime',
        'ends_at'     => 'datetime',
        'grace_until' => 'datetime',
    ];

    // ─── Constantes de statut ──────────────────────────────────────────────────

    public const STATUS_TRIAL     = 'trial';
    public const STATUS_ACTIVE    = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_EXPIRED   = 'expired';
    public const STATUS_CANCELLED = 'cancelled';

    // ─── Relations ─────────────────────────────────────────────────────────────

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function activatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activated_by');
    }

    public function suspendedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suspended_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    // ─── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_ACTIVE, self::STATUS_TRIAL]);
    }

    public function scopeTrial(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_TRIAL);
    }

    public function scopeExpiringSoon(Builder $query, int $days = 7): Builder
    {
        return $query->active()
            ->whereDate('ends_at', now()->addDays($days)->toDateString());
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_SUSPENDED, self::STATUS_EXPIRED])
            ->where('ends_at', '<', now());
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    public function isTrial(): bool
    {
        return $this->status === self::STATUS_TRIAL;
    }

    public function isActive(): bool
    {
        return in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_TRIAL], true);
    }

    public function isExpired(): bool
    {
        return in_array($this->status, [self::STATUS_SUSPENDED, self::STATUS_EXPIRED], true)
            || $this->ends_at->isPast();
    }

    public function isInGrace(): bool
    {
        return $this->status === self::STATUS_SUSPENDED
            && $this->grace_until !== null
            && $this->grace_until->isFuture();
    }

    public function daysUntilExpiry(): int
    {
        return max(0, (int) now()->diffInDays($this->ends_at, false));
    }
}
