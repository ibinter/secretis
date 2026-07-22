<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AccountingExpense — Dépense du module Comptabilité
 *
 * Statuts : pending → approved | rejected
 * Workflow : créé par collaborateur, approuvé par manager/comptable.
 */
class AccountingExpense extends Model
{
    protected $table = 'expenses';

    protected $fillable = [
        'organization_id',
        'category_id',
        'title',
        'amount',
        'expense_date',
        'vendor',
        'receipt_path',
        'status',
        'approved_by',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount'       => 'float',
        'expense_date' => 'date',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeForOrg(Builder $query, int $orgId): Builder
    {
        return $query->where('organization_id', $orgId);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', 'approved');
    }

    public function scopeByCategory(Builder $query, int $categoryId): Builder
    {
        return $query->where('category_id', $categoryId);
    }

    // -------------------------------------------------------------------------
    // Méthodes
    // -------------------------------------------------------------------------

    public function approve(int $approverId): void
    {
        $this->update([
            'status'      => 'approved',
            'approved_by' => $approverId,
        ]);
    }

    public function reject(int $approverId): void
    {
        $this->update([
            'status'      => 'rejected',
            'approved_by' => $approverId,
        ]);
    }

    public function getStatusLabel(): string
    {
        return match ($this->status) {
            'pending'  => 'En attente',
            'approved' => 'Approuvée',
            'rejected' => 'Refusée',
            default    => $this->status,
        };
    }
}
