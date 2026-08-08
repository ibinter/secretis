<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Crée help_articles + help_article_tables (conformes aux modèles HelpArticle / HelpArticleTag).
 * Non-destructif : guardé par hasTable. La table help_categories existe déjà.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('help_articles')) {
            Schema::create('help_articles', function (Blueprint $table) {
                $table->id();
                $table->foreignId('help_category_id')->constrained('help_categories')->cascadeOnDelete();
                $table->string('slug', 150)->unique();
                $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
                $table->string('status', 20)->default('draft'); // draft|published|archived
                $table->boolean('is_featured')->default(false);
                $table->integer('view_count')->default(0);
                $table->integer('helpful_count')->default(0);
                $table->integer('not_helpful_count')->default(0);
                $table->json('translations')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->timestamps();

                $table->index(['status', 'published_at']);
                $table->index(['help_category_id', 'status']);
            });
        }

        if (! Schema::hasTable('help_article_tags')) {
            Schema::create('help_article_tags', function (Blueprint $table) {
                $table->id();
                $table->foreignId('article_id')->constrained('help_articles')->cascadeOnDelete();
                $table->string('tag', 50);
                // pas de timestamps (cf. modèle HelpArticleTag)
                $table->index(['article_id', 'tag']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('help_article_tags');
        Schema::dropIfExists('help_articles');
    }
};
