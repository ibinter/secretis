<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ChartOfAccount extends Model
{
    protected $fillable = [
        'organization_id',
        'account_number',
        'account_name',
        'account_type',
        'parent_account_number',
        'is_system',
        'ohada_class',
        'is_leaf',
        'currency_code',
    ];

    protected $casts = [
        'is_system'   => 'boolean',
        'is_leaf'     => 'boolean',
        'ohada_class' => 'integer',
    ];

    public function scopeForOrg(Builder $query, int $orgId): Builder
    {
        return $query->where('organization_id', $orgId);
    }

    public function scopeLeaf(Builder $query): Builder
    {
        return $query->where('is_leaf', true);
    }

    public function scopeForClass(Builder $query, int $class): Builder
    {
        return $query->where('ohada_class', $class);
    }

    public function getClassLabelAttribute(): string
    {
        return [
            1 => 'Ressources durables',
            2 => 'Actif immobilisé',
            3 => 'Stocks',
            4 => 'Tiers',
            5 => 'Trésorerie',
            6 => 'Charges',
            7 => 'Produits',
            8 => 'Comptes spéciaux',
            9 => 'Comptabilité analytique',
        ][$this->ohada_class] ?? "Classe {$this->ohada_class}";
    }
}
