<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    protected $table = 'expense_categories';

    protected $fillable = [
        'organization_id',
        'name',
        'color',
        'icon',
        'budget_monthly',
    ];

    protected $casts = [
        'budget_monthly' => 'float',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(AccountingExpense::class, 'category_id');
    }

    public function scopeForOrg(Builder $query, int $orgId): Builder
    {
        return $query->where('organization_id', $orgId);
    }

    /**
     * Calcule le total des dépenses approuvées du mois courant pour cette catégorie.
     */
    public function getCurrentMonthSpend(): float
    {
        return (float) $this->expenses()
            ->where('status', 'approved')
            ->whereMonth('expense_date', now()->month)
            ->whereYear('expense_date', now()->year)
            ->sum('amount');
    }

    /**
     * Retourne le pourcentage consommé du budget mensuel.
     */
    public function getBudgetUsagePercent(): float
    {
        if (! $this->budget_monthly || $this->budget_monthly <= 0) {
            return 0;
        }

        return min(100, round($this->getCurrentMonthSpend() / $this->budget_monthly * 100, 1));
    }
}
