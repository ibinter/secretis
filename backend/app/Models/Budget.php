<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Budget extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'fiscal_year_id',
        'type',
        'status',
        'total_amount',
        'approved_by',
        'approved_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'approved_at'  => 'datetime',
        'total_amount' => 'decimal:2',
    ];

    // ── Relations ─────────────────────────────────────────────────────────

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(BudgetLine::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(BudgetRevision::class)->orderBy('revision_number', 'desc');
    }

    // ── Scopes ───────────────────────────────────────────────────────────

    public function scopeForOrganization($query, $orgId)
    {
        return $query->where('organization_id', $orgId);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['active', 'approved']);
    }
}
