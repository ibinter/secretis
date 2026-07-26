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
 * Employee — Fiche employé du module RH de SECRETIS ERP
 *
 * Un employé est lié à un utilisateur (compte auth) et à un département.
 * Il possède un solde de congés par type, un historique d'absences et des notes de frais.
 *
 * @property string      $id                  UUID
 * @property string      $organization_id
 * @property string|null $user_id             Compte auth lié (nullable : employé sans accès ERP)
 * @property string|null $department_id
 * @property string|null $manager_id          UUID d'un autre Employee (N+1)
 * @property string      $employee_number     Matricule unique dans l'organisation
 * @property string      $first_name
 * @property string      $last_name
 * @property string      $email
 * @property string|null $phone
 * @property string|null $avatar
 * @property string      $contract_type       cdi|cdd|internship|freelance|other
 * @property string      $position            Intitulé du poste
 * @property string      $status              active|inactive|on_leave
 * @property Carbon      $hire_date
 * @property Carbon|null $end_date
 * @property array       $leave_balances      { annual: int, sick: int, recovery: int, ... }
 * @property array|null  $emergency_contact   { name, phone, relation }
 * @property string|null $notes               Notes RH internes
 * @property Carbon      $created_at
 * @property Carbon      $updated_at
 * @property Carbon|null $deleted_at
 */
class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'user_id',
        'department_id',
        'manager_id',
        'employee_number',
        'first_name',
        'last_name',
        'email',
        'phone',
        'avatar',
        'contract_type',
        'position',
        'status',
        'hire_date',
        'end_date',
        'leave_balances',
        'emergency_contact',
        'notes',
    ];

    protected $casts = [
        'hire_date'         => 'date',
        'end_date'          => 'date',
        'leave_balances'    => 'array',
        'emergency_contact' => 'array',
    ];

    // -------------------------------------------------------------------------
    // Accesseur
    // -------------------------------------------------------------------------

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

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

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /** Manager direct (N+1) */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'manager_id');
    }

    /** Employés dont cet employé est le manager */
    public function subordinates(): HasMany
    {
        return $this->hasMany(Employee::class, 'manager_id');
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function expenseReports(): HasMany
    {
        return $this->hasMany(ExpenseReport::class);
    }

    public function workSchedules(): HasMany
    {
        return $this->hasMany(WorkSchedule::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeByDepartment(Builder $query, string $departmentId): Builder
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeWithPendingLeave(Builder $query): Builder
    {
        return $query->whereHas('leaveRequests', function (Builder $q) {
            $q->where('status', 'pending');
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
     * Retourne tous les soldes de congés de l'employé.
     *
     * @return array<string, int>
     */
    public function getLeaveBalance(): array
    {
        return $this->leave_balances ?? [
            'annual'    => 0,
            'sick'      => 0,
            'maternity' => 0,
            'unpaid'    => 0,
            'recovery'  => 0,
        ];
    }

    /**
     * Retourne le nombre de jours disponibles pour un type de congé donné.
     *
     * @param  string $type  annual|sick|maternity|unpaid|recovery
     * @return int
     */
    public function getAvailableLeaveDays(string $type): int
    {
        $balance = $this->getLeaveBalance();
        $available = $balance[$type] ?? 0;

        // Déduire les congés approuvés non encore consommés
        $approved = $this->leaveRequests()
            ->where('leave_type', $type)
            ->whereIn('status', ['approved_n1', 'approved_hr'])
            ->where('end_date', '>=', now())
            ->sum('days_count');

        return max(0, $available - $approved);
    }

    /**
     * Vérifie si l'employé est en congé à une date donnée.
     *
     * @param  Carbon $date
     * @return bool
     */
    public function isOnLeave(Carbon $date): bool
    {
        return $this->leaveRequests()
            ->where('status', 'approved_hr')
            ->where('start_date', '<=', $date->toDateString())
            ->where('end_date', '>=', $date->toDateString())
            ->exists();
    }

    /**
     * Décrémenter le solde de congés après approbation RH.
     *
     * @param  string $type
     * @param  int    $days
     * @return void
     */
    public function deductLeaveBalance(string $type, int $days): void
    {
        $balances = $this->getLeaveBalance();
        $balances[$type] = max(0, ($balances[$type] ?? 0) - $days);
        $this->update(['leave_balances' => $balances]);
    }
}
