<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Voucher — Code prépayé pour l'activation de licence
 *
 * SÉCURITÉ :
 * - La rédemption utilise SELECT FOR UPDATE pour éviter les races conditions
 * - Un code expiré ou déjà utilisé est rejeté (vérification côté serveur)
 * - Le code est généré aléatoirement (20 chars cryptographiquement sécurisés)
 * - Format : XXXX-XXXX-XXXX-XXXX (lisible humainement)
 *
 * @property int         $id
 * @property string      $code         Format XXXX-XXXX-XXXX-XXXX
 * @property float       $value
 * @property string      $currency
 * @property string|null $batch_name
 * @property int         $created_by
 * @property int|null    $used_by_org
 * @property bool        $is_used
 * @property \Carbon\Carbon|null $used_at
 * @property \Carbon\Carbon|null $expires_at
 */
class Voucher extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'value',
        'currency',
        'batch_name',
        'created_by',
        'used_by_org',
        'is_used',
        'used_at',
        'expires_at',
    ];

    protected $casts = [
        'value'      => 'decimal:2',
        'is_used'    => 'boolean',
        'used_at'    => 'datetime',
        'expires_at' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function usedByOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'used_by_org');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /** Vouchers valides (non utilisés, non expirés). */
    public function scopeValid(Builder $query): Builder
    {
        return $query->where('is_used', false)
                     ->where(fn (Builder $q) => $q->whereNull('expires_at')
                                                   ->orWhere('expires_at', '>', now()));
    }

    public function scopeForBatch(Builder $query, string $batchName): Builder
    {
        return $query->where('batch_name', $batchName);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Vérifie si le voucher est encore utilisable.
     */
    public function isValid(): bool
    {
        if ($this->is_used) {
            return false;
        }
        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }
        return true;
    }

    /**
     * Indique si le voucher couvre le montant demandé.
     */
    public function coversAmount(float $amount, string $currency = 'XOF'): bool
    {
        if ($this->currency !== $currency) {
            return false; // pas de conversion automatique pour les vouchers
        }
        return (float) $this->value >= $amount;
    }
}
