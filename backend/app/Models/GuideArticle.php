<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class GuideArticle extends Model
{
    protected $fillable = [
        'guide_section_id',
        'slug',
        'order',
        'read_time_minutes',
        'translations',
    ];

    protected $casts = [
        'translations'      => 'array',
        'order'             => 'integer',
        'read_time_minutes' => 'integer',
    ];

    // ─── Scopes ──────────────────────────────────────────────────────────────

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('order');
    }

    // ─── Relations ───────────────────────────────────────────────────────────

    public function section(): BelongsTo
    {
        return $this->belongsTo(GuideSection::class, 'guide_section_id');
    }

    // ─── Accesseurs ──────────────────────────────────────────────────────────

    public function getTitle(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['title']
            ?? $this->translations['fr']['title']
            ?? '';
    }

    public function getContent(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['content']
            ?? $this->translations['fr']['content']
            ?? '';
    }

    public function getSummary(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['summary']
            ?? $this->translations['fr']['summary']
            ?? '';
    }
}
