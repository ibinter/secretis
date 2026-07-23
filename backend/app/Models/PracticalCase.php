<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PracticalCase extends Model
{
    protected $fillable = [
        'slug',
        'category',
        'difficulty',
        'duration_minutes',
        'prerequisites',
        'learning_objectives',
        'order',
        'is_featured',
        'translations',
    ];

    protected $casts = [
        'prerequisites'       => 'array',
        'learning_objectives' => 'array',
        'translations'        => 'array',
        'is_featured'         => 'boolean',
        'duration_minutes'    => 'integer',
        'order'               => 'integer',
    ];

    public function completions(): HasMany
    {
        return $this->hasMany(PracticalCaseCompletion::class);
    }

    /**
     * Titre traduit selon la locale.
     */
    public function getTitle(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['title'] ?? $this->translations['fr']['title'] ?? '';
    }

    /**
     * Description traduite.
     */
    public function getDescription(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['description'] ?? $this->translations['fr']['description'] ?? '';
    }

    /**
     * Étapes traduites.
     */
    public function getSteps(string $locale = 'fr'): array
    {
        return $this->translations[$locale]['steps'] ?? $this->translations['fr']['steps'] ?? [];
    }

    /**
     * Résultat attendu traduit.
     */
    public function getExpectedResult(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['expected_result'] ?? $this->translations['fr']['expected_result'] ?? '';
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }
}
