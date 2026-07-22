<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * AccountingClient — Client du module Comptabilité
 *
 * Distinct du modèle Contact (annuaire), ce modèle représente
 * les clients facturables avec leur historique financier.
 */
class AccountingClient extends Model
{
    use HasFactory;

    protected $table = 'accounting_clients';

    protected $fillable = [
        'organization_id',
        'name',
        'email',
        'phone',
        'address',
        'tax_number',
        'currency',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class, 'client_id');
    }

    public function quotes(): HasMany
    {
        return $this->hasMany(Quote::class, 'client_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeForOrg(Builder $query, int $orgId): Builder
    {
        return $query->where('organization_id', $orgId);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Calcule le solde client : total facturé - total payé.
     */
    public function getBalance(): float
    {
        $totalInvoiced = $this->invoices()
            ->whereNotIn('status', ['draft', 'cancelled'])
            ->sum('total');

        $totalPaid = $this->invoices()->sum('paid_amount');

        return (float) ($totalInvoiced - $totalPaid);
    }

    /**
     * Nombre de factures en retard pour ce client.
     */
    public function countOverdueInvoices(): int
    {
        return $this->invoices()
            ->where('status', 'overdue')
            ->count();
    }
}
