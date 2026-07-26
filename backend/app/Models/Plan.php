<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Plan tarifaire SECRETIS ERP
 *
 * @property int         $id
 * @property string      $slug          Identifiant technique (starter, pro, enterprise)
 * @property string      $name          Nom affiché
 * @property string      $description
 * @property float       $price_xof     Prix en Franc CFA (FCFA)
 * @property float       $price_eur     Prix en Euro
 * @property float       $price_usd     Prix en Dollar US
 * @property int         $max_users     Nombre d'utilisateurs maximum
 * @property int         $duration_months Durée en mois (1 = mensuel, 12 = annuel)
 * @property array       $features      Liste des fonctionnalités incluses
 * @property array       $modules       Liste des modules activés
 * @property bool        $is_active     Plan disponible à la souscription
 * @property bool        $is_public     Plan visible dans le catalogue public
 * @property int         $sort_order    Ordre d'affichage
 */
class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'description',
        'price_xof',
        'price_eur',
        'price_usd',
        'max_users',
        'duration_months',
        'features',
        'modules',
        'is_active',
        'is_public',
        'sort_order',
    ];

    protected $casts = [
        'features'        => 'array',
        'modules'         => 'array',
        'is_active'       => 'boolean',
        'is_public'       => 'boolean',
        'price_xof'       => 'float',
        'price_eur'       => 'float',
        'price_usd'       => 'float',
        'duration_months' => 'integer',
        'max_users'       => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function licenses(): HasMany
    {
        return $this->hasMany(License::class, 'plan_id', 'slug');
    }

    public function organizations(): HasMany
    {
        return $this->hasMany(Organization::class, 'plan_id', 'slug');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /** Plans disponibles à la souscription */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /** Plans visibles dans le catalogue public */
    public function scopePublic(Builder $query): Builder
    {
        return $query->where('is_active', true)->where('is_public', true);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Retourne le prix pour une devise donnée.
     * Devise par défaut : XOF (Franc CFA BCEAO)
     *
     * @param  string $currency Code ISO 4217 (XOF, EUR, USD)
     * @return float
     * @throws \InvalidArgumentException si la devise n'est pas supportée
     */
    public function getPriceForCurrency(string $currency): float
    {
        return match (strtoupper($currency)) {
            'XOF'  => $this->price_xof,
            'EUR'  => $this->price_eur,
            'USD'  => $this->price_usd,
            default => throw new \InvalidArgumentException("Devise non supportée : {$currency}"),
        };
    }

    /**
     * Vérifie si une fonctionnalité est incluse dans ce plan.
     */
    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features ?? [], true);
    }

    /**
     * Vérifie si un module est activé dans ce plan.
     */
    public function hasModule(string $module): bool
    {
        return in_array($module, $this->modules ?? [], true);
    }

    /**
     * Calcule le prix mensuel ramené (utile pour affichage des plans annuels).
     */
    public function getMonthlyPrice(string $currency = 'XOF'): float
    {
        $total = $this->getPriceForCurrency($currency);
        return $this->duration_months > 0
            ? round($total / $this->duration_months, 2)
            : $total;
    }
}
