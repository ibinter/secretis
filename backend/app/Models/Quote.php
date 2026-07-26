<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Quote — Devis du module Comptabilité SECRETIS ERP
 *
 * Numérotation : DEVIS-{année}-{séquence 5 chiffres}
 *
 * Statuts :
 *   draft    → brouillon
 *   sent     → envoyé au client
 *   accepted → accepté → peut être converti en facture
 *   rejected → refusé
 *   expired  → date de validité dépassée
 */
class Quote extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'client_id',
        'quote_number',
        'title',
        'issue_date',
        'valid_until',
        'status',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'total',
        'notes',
        'terms',
        'created_by',
    ];

    protected $casts = [
        'issue_date'  => 'date',
        'valid_until' => 'date',
        'subtotal'    => 'float',
        'tax_rate'    => 'float',
        'tax_amount'  => 'float',
        'total'       => 'float',
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

    public function items(): HasMany
    {
        return $this->hasMany(QuoteItem::class)->orderBy('sort_order');
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
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

    // -------------------------------------------------------------------------
    // Génération numéro
    // -------------------------------------------------------------------------

    /**
     * Génère un numéro de devis unique : DEVIS-{année}-{séquence 5 chiffres}
     */
    public static function generateQuoteNumber(int $orgId): string
    {
        $year = now()->year;

        $lastNumber = static::where('organization_id', $orgId)
            ->whereYear('created_at', $year)
            ->lockForUpdate()
            ->max('quote_number');

        if ($lastNumber) {
            $sequence = (int) substr($lastNumber, -5);
        } else {
            $sequence = 0;
        }

        return sprintf('DEVIS-%d-%05d', $year, $sequence + 1);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Convertit ce devis en facture.
     * Copie toutes les lignes, définit le statut à 'draft'.
     *
     * @throws \RuntimeException si déjà converti ou statut incorrect
     */
    public function convertToInvoice(): Invoice
    {
        if ($this->invoice()->exists()) {
            throw new \RuntimeException('Ce devis a déjà été converti en facture.');
        }

        $invoice = Invoice::create([
            'organization_id' => $this->organization_id,
            'client_id'       => $this->client_id,
            'quote_id'        => $this->id,
            'invoice_number'  => Invoice::generateInvoiceNumber($this->organization_id),
            'title'           => $this->title,
            'issue_date'      => now()->toDateString(),
            'due_date'        => now()->addDays(30)->toDateString(),
            'status'          => 'draft',
            'subtotal'        => $this->subtotal,
            'tax_rate'        => $this->tax_rate,
            'tax_amount'      => $this->tax_amount,
            'discount_amount' => 0,
            'total'           => $this->total,
            'paid_amount'     => 0,
            'balance_due'     => $this->total,
            'notes'           => $this->notes,
            'terms'           => $this->terms,
            'created_by'      => $this->created_by,
        ]);

        // Copier les lignes
        foreach ($this->items as $item) {
            $invoice->items()->create([
                'description' => $item->description,
                'quantity'    => $item->quantity,
                'unit_price'  => $item->unit_price,
                'total'       => $item->total,
                'sort_order'  => $item->sort_order,
            ]);
        }

        // Mettre à jour le statut du devis
        $this->update(['status' => 'accepted']);

        return $invoice->load(['client', 'items']);
    }

    /**
     * Vérifie si le devis a expiré.
     */
    public function isExpired(): bool
    {
        return $this->valid_until && $this->valid_until->isPast()
            && ! in_array($this->status, ['accepted', 'rejected']);
    }

    /**
     * Retourne le statut en français.
     */
    public function getStatusLabel(): string
    {
        return match ($this->status) {
            'draft'    => 'Brouillon',
            'sent'     => 'Envoyé',
            'accepted' => 'Accepté',
            'rejected' => 'Refusé',
            'expired'  => 'Expiré',
            default    => $this->status,
        };
    }
}
