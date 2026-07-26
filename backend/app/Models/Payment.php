<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

/**
 * Modèle Payment — Paiement d'abonnement SECRETIS ERP
 *
 * SÉCURITÉ CRITIQUE :
 * - Le champ `metadata` est chiffré via Crypt (AES-256-CBC) en base.
 *   Les données sensibles (numéros de transaction, références externes)
 *   ne sont JAMAIS lisibles directement en base.
 * - proof_path pointe vers storage/app/private (jamais /public).
 * - idempotency_key est UNIQUE en base (contrainte DB + vérification app).
 * - La validation manuelle ne peut être faite que par un admin IBIG.
 *
 * @property int         $id
 * @property int         $organization_id
 * @property int|null    $license_id
 * @property string      $idempotency_key  UUID unique par tentative de paiement
 * @property float       $amount
 * @property string      $currency
 * @property string      $method           mobile_money|bank_transfer|card|cash|other
 * @property string      $provider         cinetpay|paystack|flutterwave|orange_money|mtn_momo|manual
 * @property string      $status           pending|validated|rejected|refunded
 * @property string|null $proof_path       Chemin privé vers la preuve de paiement
 * @property string|null $reference        Référence externe du prestataire
 * @property string|null $invoice_path     Chemin privé vers le PDF facture
 * @property string|null $invoice_number   Numéro de facture (FACT-2026-XXXXX)
 * @property string|null $notes
 * @property array|null  $metadata         Métadonnées chiffrées en base
 * @property int|null    $validated_by_id
 * @property string|null $validated_at
 * @property string|null $rejection_reason
 * @property string|null $paid_at
 */
class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'license_id',
        'plan_slug',
        'idempotency_key',
        'amount',
        'currency',
        'method',
        'provider',
        'status',
        'proof_path',
        'reference',
        'invoice_path',
        'invoice_number',
        'notes',
        'metadata',
        'validated_by_id',
        'validated_at',
        'rejection_reason',
        'paid_at',
        'duration_months',
    ];

    protected $casts = [
        'amount'       => 'float',
        'validated_at' => 'datetime',
        'paid_at'      => 'datetime',
        'created_at'   => 'datetime',
        'updated_at'   => 'datetime',
    ];

    /**
     * Champs cachés dans les sérialisations JSON (protection des données sensibles).
     */
    protected $hidden = [
        'proof_path',
        'invoice_path',
    ];

    // -------------------------------------------------------------------------
    // Accesseurs / Mutateurs chiffrés
    // -------------------------------------------------------------------------

    /**
     * SÉCURITÉ : Le champ metadata est chiffré avant insertion en BDD.
     * Les métadonnées peuvent contenir des références de transaction,
     * des callbacks partiels, des données du prestataire.
     */
    public function getMetadataAttribute(?string $value): ?array
    {
        if ($value === null) {
            return null;
        }

        try {
            return json_decode(Crypt::decryptString($value), true);
        } catch (\Exception) {
            // Fallback si la valeur n'est pas chiffrée (migration de données)
            return json_decode($value, true);
        }
    }

    public function setMetadataAttribute(?array $value): void
    {
        if ($value === null) {
            $this->attributes['metadata'] = null;
            return;
        }

        // Chiffrement AES-256-CBC via la clé APP_KEY de Laravel
        $this->attributes['metadata'] = Crypt::encryptString(json_encode($value));
    }

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class);
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', 'validated');
    }

    public function scopeFailed(Builder $query): Builder
    {
        return $query->where('status', 'rejected');
    }

    /** Paiements manuels en attente de validation admin */
    public function scopeManualValidation(Builder $query): Builder
    {
        return $query->where('status', 'pending')
                     ->whereIn('method', ['mobile_money', 'bank_transfer', 'cash'])
                     ->whereIn('provider', ['manual', 'orange_money', 'mtn_momo']);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Vérifie si ce paiement a déjà été traité (idempotence).
     *
     * CRITIQUE : Utilisé pour éviter la double-activation de licence
     * suite à un webhook dupliqué ou une relivraison.
     */
    public function isIdempotent(): bool
    {
        return $this->status === 'validated';
    }

    /**
     * Indique si le paiement nécessite une validation manuelle admin.
     */
    public function requiresManualValidation(): bool
    {
        return in_array($this->provider, ['manual', 'orange_money', 'mtn_momo'], true)
            && $this->status === 'pending';
    }

    /**
     * Indique si une preuve de paiement a été uploadée.
     */
    public function hasProof(): bool
    {
        return $this->proof_path !== null;
    }

    /**
     * Indique si une facture a été générée.
     */
    public function hasInvoice(): bool
    {
        return $this->invoice_path !== null && $this->invoice_number !== null;
    }

    /**
     * Retourne le numéro de facture ou génère un placeholder.
     */
    public function getInvoiceDisplayNumber(): string
    {
        return $this->invoice_number ?? 'En attente de validation';
    }
}
