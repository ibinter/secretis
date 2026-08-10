<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('practical_cases')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('practical_cases', function (Blueprint $table) {
                $table->id();
                $table->string('slug')->unique();
                $table->enum('category', ['agenda', 'ged', 'tasks', 'visitors', 'hr', 'accounting', 'reporting', 'admin']);
                $table->enum('difficulty', ['beginner', 'intermediate', 'advanced']);
                $table->unsignedSmallInteger('duration_minutes')->default(15);
                $table->json('prerequisites')->default('[]')->comment('Array of slug strings');
                $table->json('learning_objectives')->default('[]')->comment('Array of objective strings (FR)');
                $table->unsignedSmallInteger('order')->default(0);
                $table->boolean('is_featured')->default(false);
                $table->json('translations')->default('{}')->comment('{fr:{title,description,context,steps,expected_result}, en:{...}}');
                $table->timestamps();

                $table->index(['category', 'difficulty']);
                $table->index(['order', 'category']);
            });
        }

        if (! Schema::hasTable('practical_case_completions')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('practical_case_completions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('practical_case_id')->constrained()->cascadeOnDelete();
                $table->timestamp('completed_at')->useCurrent();

                $table->unique(['user_id', 'practical_case_id']);
                $table->index('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('practical_case_completions');
        Schema::dropIfExists('practical_cases');
    }
};
