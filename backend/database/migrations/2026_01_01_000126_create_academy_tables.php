<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Espace Académie IBIG SECRETIS (Section 12.4)
 *
 * Tables créées :
 *   - academy_categories      : Catégories de formation (démarrage, modules-metier, finance…)
 *   - academy_courses         : Cours (associés à une catégorie)
 *   - academy_lessons         : Leçons d'un cours (vidéo, article, quiz, exercice, document)
 *   - academy_quizzes         : Questions de quiz attachées aux leçons
 *   - academy_user_progress   : Progression par utilisateur × cours × leçon
 *   - academy_resources       : Bibliothèque de ressources téléchargeables
 *   - academy_certificates    : Certificats d'accomplissement (avec UUID public)
 */
return new class extends Migration
{
    public function up(): void
    {
        // =====================================================================
        // 1. Catégories
        // =====================================================================
        if (! Schema::hasTable('academy_categories')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('academy_categories', function (Blueprint $table) {
                $table->id();
                $table->string('slug')->unique();
                $table->json('name');            // {"fr": "Démarrage", "en": "Getting Started"}
                $table->json('description')->nullable();
                $table->string('icon')->nullable();   // nom d'icône Lucide (ex : "Rocket")
                $table->string('color')->nullable();  // couleur hexadécimale (ex : "#1E8449")
                $table->integer('order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        // =====================================================================
        // 2. Cours
        // =====================================================================
        if (! Schema::hasTable('academy_courses')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('academy_courses', function (Blueprint $table) {
                $table->id();
                $table->string('slug')->unique();
                $table->foreignId('category_id')
                    ->constrained('academy_categories')
                    ->cascadeOnDelete();
                $table->json('title');                   // {"fr": "...", "en": "..."}
                $table->json('description');
                $table->json('objectives')->nullable();  // ["savoir faire X", "comprendre Y"]
                $table->enum('level', ['debutant', 'intermediaire', 'avance'])->default('debutant');
                $table->integer('duration_minutes')->nullable();
                $table->string('thumbnail')->nullable();
                $table->json('roles')->nullable();              // rôles utilisateurs concernés
                $table->string('version_compatible')->nullable(); // ex : "v1.0+"
                $table->boolean('is_active')->default(true);
                $table->boolean('is_featured')->default(false);
                $table->integer('order')->default(0);
                $table->timestamps();
            });
        }

        // =====================================================================
        // 3. Leçons
        // =====================================================================
        if (! Schema::hasTable('academy_lessons')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('academy_lessons', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')
                    ->constrained('academy_courses')
                    ->cascadeOnDelete();
                $table->string('slug');
                $table->json('title');
                $table->enum('type', ['video', 'article', 'quiz', 'exercise', 'document'])
                    ->default('article');
                $table->json('content')->nullable();     // HTML ou config vidéo
                $table->string('video_url')->nullable(); // URL YouTube embed ou vidéo interne
                $table->integer('duration_minutes')->nullable();
                $table->string('resource_file')->nullable(); // chemin vers PDF téléchargeable
                $table->boolean('is_active')->default(true);
                $table->boolean('is_preview')->default(false); // accessible sans authentification
                $table->integer('order')->default(0);
                $table->timestamps();

                $table->unique(['course_id', 'slug']);
            });
        }

        // =====================================================================
        // 4. Questions de quiz
        // =====================================================================
        if (! Schema::hasTable('academy_quizzes')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('academy_quizzes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lesson_id')
                    ->constrained('academy_lessons')
                    ->cascadeOnDelete();
                $table->json('question');
                $table->json('options'); // [{"text": "...", "is_correct": true}, ...]
                $table->json('explanation')->nullable();
                $table->integer('order')->default(0);
                $table->timestamps();
            });
        }

        // =====================================================================
        // 5. Progression utilisateur
        // =====================================================================
        if (! Schema::hasTable('academy_user_progress')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('academy_user_progress', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')
                    ->constrained()
                    ->cascadeOnDelete();
                $table->foreignId('course_id')
                    ->constrained('academy_courses')
                    ->cascadeOnDelete();
                $table->foreignId('lesson_id')
                    ->nullable()
                    ->constrained('academy_lessons')
                    ->nullOnDelete();
                $table->integer('progress_percent')->default(0);
                $table->integer('quiz_score')->nullable(); // 0-100
                $table->boolean('is_completed')->default(false);
                $table->timestamp('completed_at')->nullable();
                $table->timestamp('last_accessed_at')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'course_id', 'lesson_id']);
                $table->index(['user_id', 'is_completed']);
            });
        }

        // =====================================================================
        // 6. Ressources téléchargeables
        // =====================================================================
        if (! Schema::hasTable('academy_resources')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('academy_resources', function (Blueprint $table) {
                $table->id();
                $table->foreignId('category_id')
                    ->nullable()
                    ->constrained('academy_categories')
                    ->nullOnDelete();
                $table->json('title');
                $table->json('description')->nullable();
                $table->enum('type', ['pdf', 'excel', 'word', 'csv', 'zip', 'link'])->default('pdf');
                $table->string('file_path')->nullable();      // chemin stockage privé
                $table->string('external_url')->nullable();
                $table->string('module')->nullable();          // module SECRETIS concerné
                $table->json('roles')->nullable();
                $table->integer('download_count')->default(0);
                $table->boolean('is_active')->default(true);
                $table->integer('order')->default(0);
                $table->timestamps();
            });
        }

        // =====================================================================
        // 7. Certificats d'accomplissement
        // =====================================================================
        if (! Schema::hasTable('academy_certificates')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('academy_certificates', function (Blueprint $table) {
                $table->id();
                $table->string('uuid')->unique(); // identifiant public pour vérification
                $table->foreignId('user_id')
                    ->constrained()
                    ->cascadeOnDelete();
                $table->foreignId('course_id')
                    ->constrained('academy_courses')
                    ->cascadeOnDelete();
                $table->string('user_name');   // dénormalisé au moment de l'émission
                $table->string('course_title'); // dénormalisé au moment de l'émission
                $table->integer('score')->nullable(); // score du quiz (0-100)
                $table->timestamp('issued_at');
                $table->timestamps();

                $table->unique(['user_id', 'course_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('academy_certificates');
        Schema::dropIfExists('academy_user_progress');
        Schema::dropIfExists('academy_quizzes');
        Schema::dropIfExists('academy_resources');
        Schema::dropIfExists('academy_lessons');
        Schema::dropIfExists('academy_courses');
        Schema::dropIfExists('academy_categories');
    }
};
