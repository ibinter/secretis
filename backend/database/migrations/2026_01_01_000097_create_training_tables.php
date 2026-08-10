<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Cours de formation ───────────────────────────────────────────────
        if (! Schema::hasTable('training_courses')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_courses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('category')->default('general');
                $table->string('thumbnail_path')->nullable();
                $table->unsignedInteger('duration_minutes')->default(0);
                $table->enum('level', ['beginner', 'intermediate', 'advanced'])->default('beginner');
                $table->boolean('is_published')->default(false);
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->index('organization_id');
                $table->index('category');
                $table->index('level');
                $table->index('is_published');
            });
        }

        // ─── Modules de cours ─────────────────────────────────────────────────
        if (! Schema::hasTable('training_modules')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_modules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
                $table->string('title');
                $table->enum('content_type', ['video', 'text', 'quiz', 'file'])->default('text');
                $table->json('content')->nullable();          // JSONB: { url, html, quiz_id, file_path }
                $table->unsignedInteger('duration_minutes')->default(0);
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->boolean('is_required')->default(true);
                $table->timestamps();

                $table->index('course_id');
                $table->index('sort_order');
            });
        }

        // ─── Inscriptions ─────────────────────────────────────────────────────
        if (! Schema::hasTable('training_enrollments')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_enrollments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->enum('status', ['enrolled', 'in_progress', 'completed'])->default('enrolled');
                $table->unsignedTinyInteger('progress_percent')->default(0);
                $table->timestamp('enrolled_at')->useCurrent();
                $table->timestamp('completed_at')->nullable();
                $table->timestamp('certificate_issued_at')->nullable();
                $table->timestamps();

                $table->unique(['course_id', 'user_id']);
                $table->index('organization_id');
                $table->index('user_id');
                $table->index('status');
            });
        }

        // ─── Progression par module ───────────────────────────────────────────
        if (! Schema::hasTable('training_progress')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_progress', function (Blueprint $table) {
                $table->id();
                $table->foreignId('enrollment_id')->constrained('training_enrollments')->cascadeOnDelete();
                $table->foreignId('module_id')->constrained('training_modules')->cascadeOnDelete();
                $table->enum('status', ['not_started', 'in_progress', 'completed'])->default('not_started');
                $table->unsignedInteger('time_spent_seconds')->default(0);
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->unique(['enrollment_id', 'module_id']);
                $table->index('enrollment_id');
            });
        }

        // ─── Quiz ─────────────────────────────────────────────────────────────
        if (! Schema::hasTable('training_quizzes')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_quizzes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('module_id')->constrained('training_modules')->cascadeOnDelete();
                $table->string('title');
                $table->unsignedTinyInteger('pass_score')->default(70); // 0-100
                // questions: [{id, text, type: single|multiple, answers: [{id, text, is_correct}]}]
                $table->json('questions');
                $table->unsignedSmallInteger('time_limit_minutes')->nullable();
                $table->timestamps();

                $table->index('module_id');
            });
        }

        // ─── Tentatives de quiz ───────────────────────────────────────────────
        if (! Schema::hasTable('training_quiz_attempts')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_quiz_attempts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('quiz_id')->constrained('training_quizzes')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->unsignedTinyInteger('score')->default(0); // 0-100
                $table->boolean('passed')->default(false);
                // answers: {question_id: [answer_id, ...]}
                $table->json('answers')->nullable();
                $table->timestamp('started_at')->useCurrent();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index('quiz_id');
                $table->index('user_id');
            });
        }

        // ─── Certificats ──────────────────────────────────────────────────────
        if (! Schema::hasTable('training_certificates')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_certificates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('enrollment_id')->constrained('training_enrollments')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
                $table->string('certificate_number')->unique(); // CERT-2026-XXXXX
                $table->timestamp('issued_at')->useCurrent();
                $table->timestamp('expires_at')->nullable();
                $table->string('verification_token', 64)->unique();
                $table->timestamps();

                $table->index('user_id');
                $table->index('verification_token');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('training_certificates');
        Schema::dropIfExists('training_quiz_attempts');
        Schema::dropIfExists('training_quizzes');
        Schema::dropIfExists('training_progress');
        Schema::dropIfExists('training_enrollments');
        Schema::dropIfExists('training_modules');
        Schema::dropIfExists('training_courses');
    }
};
