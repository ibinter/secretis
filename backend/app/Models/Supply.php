<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Supply — Fourniture / consommable de bureau
 *
 * @property int         $id
 * @property int         $organization_id
 * @property string      $name
 * @property string      $unit             pièce|rame|boîte|carton|litre
 * @property int         $quantity         Stock actuel
 * @property int         $min_quantity     Seuil de réapprovisionnement
 * @property float|null  $unit_price
 * @property string|null $supplier
 * @property string|null $reference
 * @property string|null $location         Lieu de stockage
 */
class Supply extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'unit',
        'quantity',
        'min_quantity',
        'unit_price',
        'supplier',
        'reference',
        'location',
    ];

    protected $casts = [
        'quantity'     => 'integer',
        'min_quantity' => 'integer',
        'unit_price'   => 'float',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(SupplyMovement::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Fournitures dont le stock est inférieur ou égal au seuil minimum.
     */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereRaw('quantity <= min_quantity');
    }

    public function scopeForOrganization(Builder $query, int $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Détermine si la fourniture doit être réapprovisionnée.
     */
    public function needsReorder(): bool
    {
        return $this->quantity <= $this->min_quantity;
    }

    /**
     * Pourcentage de stock (0-100) par rapport au seuil minimum * 2.
     * Utilisé pour la barre de progression UI.
     */
    public function stockPercentage(): int
    {
        $max = max($this->min_quantity * 2, 1);

        return (int) min(100, ($this->quantity / $max) * 100);
    }
}
