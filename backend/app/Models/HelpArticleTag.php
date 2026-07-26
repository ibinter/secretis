<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * HelpArticleTag — Tag associé à un article d'aide
 */
class HelpArticleTag extends Model
{
    public $timestamps = false;

    protected $table = 'help_article_tags';

    protected $fillable = [
        'article_id',
        'tag',
    ];

    public function article(): BelongsTo
    {
        return $this->belongsTo(HelpArticle::class, 'article_id');
    }
}
