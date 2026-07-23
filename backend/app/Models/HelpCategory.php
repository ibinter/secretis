<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * HelpCategory — Catégorie du centre d'aide SECRETIS ERP
 *
 * @property int    $id
 * @property string $slug
 * @property string $icon
 * @property string $color
 * @property int    $order
 * @property bool   $is_active
 * @property array  $translations  {fr:{name,description}, en:{name,description}}
 */
class HelpCategory extends Model
{
    use HasFactory;

    protected $table = 'help_categories';

    protected $fillable = [
        'slug',
        'icon',
        'color',
        'order',
        'is_active',
        'translations',
    ];

    protected $casts = [
        'translations' => 'array',
        'is_active'    => 'boolean',
        'order'        => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function articles(): HasMany
    {
        return $this->hasMany(HelpArticle::class, 'help_category_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('order');
    }

    // -------------------------------------------------------------------------
    // Accesseurs multilingues
    // -------------------------------------------------------------------------

    public function getName(string $locale = 'fr'): string
    {
        $translations = $this->translations ?? [];

        return $translations[$locale]['name']
            ?? $translations['fr']['name']
            ?? $translations['en']['name']
            ?? '';
    }

    public function getDescription(string $locale = 'fr'): string
    {
        $translations = $this->translations ?? [];

        return $translations[$locale]['description']
            ?? $translations['fr']['description']
            ?? $translations['en']['description']
            ?? '';
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        static::creating(function (self $category) {
            $category->is_active = $category->is_active ?? true;
        });
    }
}
