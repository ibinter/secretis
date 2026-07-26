<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * HelpArticle — Article du centre d'aide SECRETIS ERP
 *
 * @property int         $id
 * @property int         $help_category_id
 * @property string      $slug
 * @property int         $author_id
 * @property string      $status           draft|published|archived
 * @property bool        $is_featured
 * @property int         $view_count
 * @property int         $helpful_count
 * @property int         $not_helpful_count
 * @property array       $translations     {fr:{title,content,excerpt,meta_title,meta_description}, en:{...}}
 * @property string|null $published_at
 */
class HelpArticle extends Model
{
    use HasFactory;

    protected $table = 'help_articles';

    protected $fillable = [
        'help_category_id',
        'slug',
        'author_id',
        'status',
        'is_featured',
        'view_count',
        'helpful_count',
        'not_helpful_count',
        'translations',
        'published_at',
    ];

    protected $casts = [
        'translations'      => 'array',
        'is_featured'       => 'boolean',
        'view_count'        => 'integer',
        'helpful_count'     => 'integer',
        'not_helpful_count' => 'integer',
        'published_at'      => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function category(): BelongsTo
    {
        return $this->belongsTo(HelpCategory::class, 'help_category_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function tags(): HasMany
    {
        return $this->hasMany(HelpArticleTag::class, 'article_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
                     ->whereNotNull('published_at')
                     ->where('published_at', '<=', now());
    }

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }

    // -------------------------------------------------------------------------
    // Accesseurs multilingues
    // -------------------------------------------------------------------------

    public function getTitle(string $locale = 'fr'): string
    {
        $t = $this->translations ?? [];
        return $t[$locale]['title'] ?? $t['fr']['title'] ?? $t['en']['title'] ?? '';
    }

    public function getContent(string $locale = 'fr'): string
    {
        $t = $this->translations ?? [];
        return $t[$locale]['content'] ?? $t['fr']['content'] ?? $t['en']['content'] ?? '';
    }

    public function getExcerpt(string $locale = 'fr'): string
    {
        $t = $this->translations ?? [];
        return $t[$locale]['excerpt'] ?? $t['fr']['excerpt'] ?? $t['en']['excerpt'] ?? '';
    }

    public function getMetaTitle(string $locale = 'fr'): string
    {
        $t = $this->translations ?? [];
        return $t[$locale]['meta_title'] ?? $this->getTitle($locale);
    }

    public function getMetaDescription(string $locale = 'fr'): string
    {
        $t = $this->translations ?? [];
        return $t[$locale]['meta_description'] ?? $this->getExcerpt($locale);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /** Incrémente le compteur de vues de façon atomique */
    public function incrementViews(): void
    {
        $this->increment('view_count');
    }

    /**
     * Marque l'article comme utile ou non utile
     *
     * @param bool $helpful  true = utile, false = pas utile
     */
    public function markHelpful(bool $helpful): void
    {
        if ($helpful) {
            $this->increment('helpful_count');
        } else {
            $this->increment('not_helpful_count');
        }
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        static::creating(function (self $article) {
            $article->status             = $article->status             ?? 'draft';
            $article->is_featured        = $article->is_featured        ?? false;
            $article->view_count         = $article->view_count         ?? 0;
            $article->helpful_count      = $article->helpful_count      ?? 0;
            $article->not_helpful_count  = $article->not_helpful_count  ?? 0;
        });

        static::saving(function (self $article) {
            if ($article->status === 'published' && $article->published_at === null) {
                $article->published_at = now();
            }
        });
    }
}
