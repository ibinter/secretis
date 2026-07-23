<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SECRETIS ERP — Migration : Guide utilisateur & FAQ
 *
 * Crée les tables :
 *   - guide_sections  : sections du guide utilisateur
 *   - guide_articles  : articles détaillés de chaque section
 *   - faqs            : 100 FAQ bilingues groupées par catégorie
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── Sections du guide utilisateur ───────────────────────────────────
        Schema::create('guide_sections', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('icon')->default('BookOpen');       // nom d'icône (Heroicon)
            $table->string('color')->default('#2E86C1');       // couleur de la section
            $table->unsignedSmallInteger('order')->default(0);
            $table->boolean('is_active')->default(true);
            // all | admin | secretaire | dirigeant | rh | comptable
            $table->string('role_target')->default('all');
            // {"fr": {"title": "...", "description": "..."}, "en": {...}}
            $table->json('translations');
            $table->timestamps();

            $table->index('is_active');
            $table->index('order');
            $table->index('role_target');
        });

        // ─── Articles du guide utilisateur ───────────────────────────────────
        Schema::create('guide_articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guide_section_id')
                  ->constrained('guide_sections')
                  ->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->unsignedSmallInteger('order')->default(0);
            $table->unsignedTinyInteger('read_time_minutes')->default(5);
            // {"fr": {"title": "...", "content": "<html>...", "summary": "..."}, "en": {...}}
            $table->json('translations');
            $table->timestamps();

            $table->index('guide_section_id');
            $table->index('order');
            $table->index(['guide_section_id', 'order']);
        });

        // ─── FAQ bilingues ────────────────────────────────────────────────────
        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            // demarrage | agenda | documents | taches | visiteurs |
            // paiements | utilisateurs | rapports | sara | securite
            $table->string('category', 50);
            $table->unsignedSmallInteger('order')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            // {"fr": {"question": "...", "answer": "..."}, "en": {...}}
            $table->json('translations');
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
            $table->index('is_featured');
            $table->index(['category', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guide_articles');
        Schema::dropIfExists('guide_sections');
        Schema::dropIfExists('faqs');
    }
};
