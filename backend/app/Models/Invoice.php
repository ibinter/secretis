<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Mail;

/**
 * Invoice — Facture du module Comptabilité SECRETIS ERP
 *
 * Numérotation : FACT-{année}-{séquence 5 chiffres}
 * Devise : FCFA (XOF) par défaut
 *
 * Statuts :
 *   draft    → brouillon (non visible client)
 *   sent     → envoyée par email
 *   paid     → payée intégralement
 *   overdue  → dépassée (calculé auto via CRON)
 *   cancelled → annulée
 */
class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'client_id',
        'quote_id',
        'invoice_number',
        'title',
        'issue_date',
        'due_date',
        'status',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'discount_amount',
        'total',
        'paid_amount',
        'balance_due',
        'payment_date',
        'payment_method',
        'notes',
        'terms',
        'created_by',
    ];

    protected $casts = [
        'issue_date'      => 'date',
        'due_date'        => 'date',
        'payment_date'    => 'date',
        'subtotal'        => 'float',
        'tax_rate'        => 'float',
        'tax_amount'      => 'float',
        'discount_amount' => 'float',
        'total'           => 'float',
        'paid_amount'     => 'float',
        'balance_due'     => 'float',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(AccountingClient::class, 'client_id');
    }

    public function quote(): BelongsTo
    {
        return $this->belongsTo(Quote::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('sort_order');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PaymentReceipt::class)->orderByDesc('payment_date');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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
        return $query->whereIn('status', ['sent', 'overdue']);
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where('status', 'overdue');
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('status', 'paid');
    }

    public function scopeBetween(Builder $query, Carbon $start, Carbon $end): Builder
    {
        return $query->whereBetween('issue_date', [$start->toDateString(), $end->toDateString()]);
    }

    // -------------------------------------------------------------------------
    // Mutateurs / Génération numéro
    // -------------------------------------------------------------------------

    /**
     * Génère un numéro de facture unique : FACT-{année}-{séquence 5 chiffres}
     * À appeler avant save() lors de la création.
     */
    public static function generateInvoiceNumber(int $orgId): string
    {
        $year = now()->year;

        $lastNumber = static::where('organization_id', $orgId)
            ->whereYear('created_at', $year)
            // PostgreSQL refuse FOR UPDATE avec un agrégat : on prend la ligne la plus
            // haute triée, ce qui conserve le verrou tout en restant portable.
            ->orderByDesc('invoice_number')
            ->lockForUpdate()
            ->value('invoice_number');

        if ($lastNumber) {
            // Extraire le dernier séquence : FACT-2026-00042 → 42
            $sequence = (int) substr($lastNumber, -5);
        } else {
            $sequence = 0;
        }

        return sprintf('FACT-%d-%05d', $year, $sequence + 1);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Recalcule le solde dû (balance_due = total - paid_amount).
     * Met à jour le statut si entièrement payée.
     */
    public function calculateBalance(): void
    {
        $this->balance_due = max(0, $this->total - $this->paid_amount);

        if ($this->balance_due <= 0 && $this->paid_amount > 0) {
            $this->status = 'paid';
        } elseif ($this->isOverdue() && $this->status === 'sent') {
            $this->status = 'overdue';
        }
    }

    /**
     * Marque la facture comme payée intégralement.
     */
    public function markAsPaid(string $method = 'virement', ?Carbon $date = null): void
    {
        $this->paid_amount  = $this->total;
        $this->balance_due  = 0;
        $this->status       = 'paid';
        $this->payment_date = $date ?? now();
        $this->payment_method = $method;
        $this->save();
    }

    /**
     * Vérifie si la facture est en retard (date dépassée et non payée).
     */
    public function isOverdue(): bool
    {
        if (in_array($this->status, ['paid', 'cancelled', 'draft'])) {
            return false;
        }

        return $this->due_date && $this->due_date->isPast();
    }

    /**
     * Calcule le nombre de jours de retard.
     */
    public function getDaysOverdue(): int
    {
        if (! $this->isOverdue()) {
            return 0;
        }

        return (int) now()->diffInDays($this->due_date);
    }

    /**
     * Retourne le statut formaté en français.
     */
    public function getStatusLabel(): string
    {
        return match ($this->status) {
            'draft'     => 'Brouillon',
            'sent'      => 'Envoyée',
            'paid'      => 'Payée',
            'overdue'   => 'En retard',
            'cancelled' => 'Annulée',
            default     => $this->status,
        };
    }

    /**
     * Envoie la facture par email au client.
     * L'email réel est géré par AccountingService::sendInvoiceByEmail().
     */
    public function sendByEmail(): void
    {
        app(\App\Services\AccountingService::class)->sendInvoiceByEmail($this);
    }
}
