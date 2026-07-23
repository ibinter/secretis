<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class GuideSection extends Model
{
    protected $fillable = [
        'slug',
        'icon',
        'color',
        'order',
        'is_active',
        'role_target',
        'translations',
    ];

    protected $casts = [
        'translations' => 'array',
        'is_active'    => 'boolean',
        'order'        => 'integer',
    ];

    // ─── Scopes ──────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('order');
    }

    public function scopeForRole(Builder $query, ?string $role): Builder
    {
        if (!$role) {
            return $query->where('role_target', 'all');
        }

        return $query->where(function (Builder $q) use ($role) {
            $q->where('role_target', 'all')
              ->orWhere('role_target', $role);
        });
    }

    // ─── Relations ───────────────────────────────────────────────────────────

    public function articles(): HasMany
    {
        return $this->hasMany(GuideArticle::class)->orderBy('order');
    }

    // ─── Accesseurs ──────────────────────────────────────────────────────────

    public function getTitle(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['title']
            ?? $this->translations['fr']['title']
            ?? '';
    }

    public function getDescription(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['description']
            ?? $this->translations['fr']['description']
            ?? '';
    }

    public function getTotalReadTime(): int
    {
        return $this->articles()->sum('read_time_minutes');
    }

    public function getArticlesCount(): int
    {
        return $this->articles()->count();
    }
}
