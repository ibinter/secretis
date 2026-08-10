<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catalogue de formations : le contrôleur trie/filtre sur `rating_count`,
 * `rating_avg`, `price_xof` et `language`, et l'écran affiche prix, note et
 * langue — mais aucune de ces colonnes n'existait.
 * Conséquence : dès qu'un cours était publié, /formation/catalogue renvoyait
 * « column rating_count does not exist » (invisible tant que la table restait vide).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('training_courses')) {
            return;
        }

        Schema::table('training_courses', function (Blueprint $table) {
            if (! Schema::hasColumn('training_courses', 'language')) {
                $table->string('language', 5)->default('fr');
            }
            if (! Schema::hasColumn('training_courses', 'price_xof')) {
                $table->decimal('price_xof', 12, 2)->default(0);
            }
            if (! Schema::hasColumn('training_courses', 'rating_avg')) {
                $table->decimal('rating_avg', 3, 2)->default(0);
            }
            if (! Schema::hasColumn('training_courses', 'rating_count')) {
                $table->unsignedInteger('rating_count')->default(0);
            }
            if (! Schema::hasColumn('training_courses', 'enrollment_count')) {
                $table->unsignedInteger('enrollment_count')->default(0);
            }
            if (! Schema::hasColumn('training_courses', 'trailer_url')) {
                $table->string('trailer_url')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('training_courses')) {
            return;
        }

        Schema::table('training_courses', function (Blueprint $table) {
            foreach (['language', 'price_xof', 'rating_avg', 'rating_count', 'enrollment_count', 'trailer_url'] as $col) {
                if (Schema::hasColumn('training_courses', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
