<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Centre d'aide — Base de connaissances SECRETIS ERP
 *
 * Tables :
 *   - help_categories  : catégories multilingues
 *   - help_articles    : articles complets multilingues
 *   - help_article_tags: tags associés aux articles
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Catégories ────────────────────────────────────────────────────────
        Schema::create('help_categories', function (Blueprint $table) {
            $table->id();

            // Identifiant URL
            $table->string('slug', 100)->unique();

            // Icône (emoji ou classe icon)
            $table->string('icon', 10)->default('📖');

            // Couleur hex de la catégorie
            $table->string('color', 20)->default('#2E86C1');

            // Ordre d'affichage
            $table->unsignedSmallInteger('order')->default(0);

            // Visibilité
            $table->boolean('is_active')->default(true);

            // Contenu multilingue : {fr:{name,description}, en:{name,description}}
            $table->json('translations');

            $table->timestamps();

            // Index
            $table->index(['order', 'is_active'], 'idx_help_categories_order_active');
        });

        // ── Articles ──────────────────────────────────────────────────────────
        Schema::create('help_articles', function (Blueprint $table) {
            $table->id();

            $table->foreignId('help_category_id')
                  ->constrained('help_categories')
                  ->cascadeOnDelete();

            // Identifiant URL
            $table->string('slug', 150)->unique();

            // Auteur interne
            $table->foreignId('author_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            // Cycle de vie : draft | published | archived
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');

            // Mise en avant sur la page d'accueil
            $table->boolean('is_featured')->default(false);

            // Statistiques
            $table->unsignedInteger('view_count')->default(0);
            $table->unsignedInteger('helpful_count')->default(0);
            $table->unsignedInteger('not_helpful_count')->default(0);

            // Contenu multilingue :
            // {fr:{title,content,excerpt,meta_title,meta_description}, en:{...}}
            $table->json('translations');

            // Date de publication effective
            $table->timestamp('published_at')->nullable();

            $table->timestamps();

            // Index
            $table->index(['status', 'published_at'], 'idx_help_articles_status_pub');
            $table->index(['help_category_id', 'status'], 'idx_help_articles_cat_status');
        });

        // ── Tags articles ─────────────────────────────────────────────────────
        Schema::create('help_article_tags', function (Blueprint $table) {
            $table->id();

            $table->foreignId('article_id')
                  ->constrained('help_articles')
                  ->cascadeOnDelete();

            $table->string('tag', 50);

            $table->index(['article_id', 'tag'], 'idx_help_article_tags');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('help_article_tags');
        Schema::dropIfExists('help_articles');
        Schema::dropIfExists('help_categories');
    }
};
