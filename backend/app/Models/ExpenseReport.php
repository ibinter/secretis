<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * ExpenseReport — Note de frais
 *
 * Workflow : draft → submitted → approved → paid
 *                             → rejected
 *
 * @property string      $id
 * @property string      $organization_id
 * @property string      $employee_id
 * @property string      $title              Intitulé de la note de frais
 * @property string      $status             draft|submitted|approved|rejected|paid
 * @property string|null $period_month       Format YYYY-MM (mois de la note)
 * @property string|null $approver_id        UUID User (manager approbateur)
 * @property Carbon|null $approved_at
 * @property string|null $accounting_user_id UUID User (comptable validateur)
 * @property Carbon|null $paid_at
 * @property string|null $rejection_reason
 * @property string|null $notes
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 * @property Carbon|null $deleted_at
 */
class ExpenseReport extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'employee_id',
        'title',
        'status',
        'period_month',
        'approver_id',
        'approved_at',
        'accounting_user_id',
        'paid_at',
        'rejection_reason',
        'notes',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'paid_at'     => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function accountingUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accounting_user_id');
    }

    /** Lignes de dépense */
    public function items(): HasMany
    {
        return $this->hasMany(ExpenseItem::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopeByPeriod(Builder $query, string $month): Builder
    {
        return $query->where('period_month', $month);
    }

    public function scopePendingApproval(Builder $query): Builder
    {
        return $query->where('status', 'submitted');
    }

    public function scopeForOrganization(Builder $query, string $orgId): Builder
    {
        return $query->where('organization_id', $orgId);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Retourne le montant total de la note de frais.
     *
     * @return float
     */
    public function getTotalAmount(): float
    {
        return (float) $this->items()->sum('amount');
    }

    /**
     * Libellé du statut en français.
     *
     * @return string
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft'     => 'Brouillon',
            'submitted' => 'Soumise',
            'approved'  => 'Approuvée',
            'rejected'  => 'Refusée',
            'paid'      => 'Payée',
            default     => $this->status,
        };
    }
}

// =============================================================================
// ExpenseItem — Ligne d'une note de frais
// =============================================================================

// Note : ce modèle peut être dans son propre fichier ExpenseItem.php.
// Il est inclus ici pour la complétude du module.
