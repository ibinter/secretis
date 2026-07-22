<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * LeaveRequest — Demande de congé
 *
 * Workflow : pending → approved_n1 → approved_hr → (solde déduit)
 *                                  → rejected (à n'importe quelle étape)
 *
 * @property string      $id
 * @property string      $organization_id
 * @property string      $employee_id
 * @property string      $leave_type        annual|sick|maternity|unpaid|recovery
 * @property string      $status            pending|approved_n1|approved_hr|rejected
 * @property Carbon      $start_date
 * @property Carbon      $end_date
 * @property int         $days_count        Calculé auto (hors weekends)
 * @property string|null $reason            Motif fourni par l'employé
 * @property string|null $rejection_reason  Motif de refus
 * @property string|null $approver_n1_id    UUID User (manager)
 * @property Carbon|null $approved_n1_at
 * @property string|null $approver_hr_id    UUID User (RH)
 * @property Carbon|null $approved_hr_at
 * @property Carbon|null $rejected_at
 * @property string|null $rejected_by
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 * @property Carbon|null $deleted_at
 */
class LeaveRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'employee_id',
        'leave_type',
        'status',
        'start_date',
        'end_date',
        'days_count',
        'reason',
        'rejection_reason',
        'approver_n1_id',
        'approved_n1_at',
        'approver_hr_id',
        'approved_hr_at',
        'rejected_at',
        'rejected_by',
    ];

    protected $casts = [
        'start_date'    => 'date',
        'end_date'      => 'date',
        'approved_n1_at'=> 'datetime',
        'approved_hr_at'=> 'datetime',
        'rejected_at'   => 'datetime',
        'days_count'    => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Boot — calcul automatique du nombre de jours
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        static::creating(function (self $leave) {
            if ($leave->start_date && $leave->end_date && ! $leave->days_count) {
                $leave->days_count = $leave->calculateDays();
            }
        });

        static::updating(function (self $leave) {
            if ($leave->isDirty(['start_date', 'end_date'])) {
                $leave->days_count = $leave->calculateDays();
            }
        });
    }

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function approverN1(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_n1_id');
    }

    public function approverHR(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_hr_id');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved_hr');
    }

    public function scopeRejected(Builder $query): Builder
    {
        return $query->where('status', 'rejected');
    }

    public function scopeForPeriod(Builder $query, Carbon $start, Carbon $end): Builder
    {
        return $query->where(function (Builder $q) use ($start, $end) {
            $q->whereBetween('start_date', [$start, $end])
              ->orWhereBetween('end_date', [$start, $end])
              ->orWhere(function (Builder $q2) use ($start, $end) {
                  $q2->where('start_date', '<=', $start)
                     ->where('end_date', '>=', $end);
              });
        });
    }

    public function scopeForOrganization(Builder $query, string $orgId): Builder
    {
        return $query->where('organization_id', $orgId);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Calcule le nombre de jours ouvrés entre start_date et end_date (weekends exclus).
     *
     * @return int
     */
    public function calculateDays(): int
    {
        if (! $this->start_date || ! $this->end_date) {
            return 0;
        }

        $start   = Carbon::parse($this->start_date);
        $end     = Carbon::parse($this->end_date);
        $days    = 0;
        $current = $start->copy();

        while ($current->lte($end)) {
            if (! $current->isWeekend()) {
                $days++;
            }
            $current->addDay();
        }

        return $days;
    }

    /**
     * Vérifie si ce congé est actuellement actif (aujourd'hui est dans la période).
     *
     * @return bool
     */
    public function isCurrentlyActive(): bool
    {
        if ($this->status !== 'approved_hr') {
            return false;
        }

        $today = now()->toDateString();

        return $this->start_date->lte($today) && $this->end_date->gte($today);
    }

    /**
     * Libellé du statut en français.
     *
     * @return string
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending'      => 'En attente',
            'approved_n1'  => 'Approuvé N+1',
            'approved_hr'  => 'Approuvé RH',
            'rejected'     => 'Refusé',
            default        => $this->status,
        };
    }

    /**
     * Libellé du type de congé en français.
     *
     * @return string
     */
    public function getLeaveTypeLabelAttribute(): string
    {
        return match ($this->leave_type) {
            'annual'    => 'Congé annuel',
            'sick'      => 'Congé maladie',
            'maternity' => 'Congé maternité/paternité',
            'unpaid'    => 'Congé sans solde',
            'recovery'  => 'Récupération',
            default     => $this->leave_type,
        };
    }
}
