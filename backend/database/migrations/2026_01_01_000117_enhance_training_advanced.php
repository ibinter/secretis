<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Enrichissement de training_courses ──────────────────────────────
        // `thumbnail_path` est DEJA creee par 000097_create_training_tables : la
        // migration echouait donc sur toute base neuve, et avec elle les huit
        // tables de formation declarees plus bas.
        //
        // Chaque colonne est testee POUR ELLE-MEME. Un garde-fou pose sur une
        // seule colonne d'un lot n'en protege aucune autre — c'est le meme
        // motif qui bloquait `tasks.estimated_hours`.
        Schema::table('training_courses', function (Blueprint $table) {
            $nouvelles = [
                'thumbnail_path' => fn () => $table->string('thumbnail_path')->nullable(),
                'trailer_url'    => fn () => $table->string('trailer_url')->nullable(),
                'language'       => fn () => $table->string('language', 10)->default('fr'),
                'skills_taught'  => fn () => $table->jsonb('skills_taught')->nullable(),
                'prerequisites'  => fn () => $table->jsonb('prerequisites')->nullable(),
                'rating_avg'     => fn () => $table->decimal('rating_avg', 3, 2)->default(0),
                'rating_count'   => fn () => $table->unsignedInteger('rating_count')->default(0),
                'is_public'      => fn () => $table->boolean('is_public')->default(false),
                'price_xof'      => fn () => $table->unsignedInteger('price_xof')->default(0),
                'tags'           => fn () => $table->jsonb('tags')->nullable(),
            ];

            foreach ($nouvelles as $colonne => $ajouter) {
                if (! Schema::hasColumn('training_courses', $colonne)) {
                    $ajouter();
                }
            }

        });

        // Elargissement de l'enumeration `level`.
        //
        // La migration ecrivait `$table->enum('level', [...])->change()`. Sous
        // PostgreSQL, Laravel ne sait pas modifier la contrainte CHECK qui
        // porte une enumeration : la requete produite echoue (« syntax error at
        // or near "check" »). Cette instruction N'A DONC JAMAIS ETE APPLIQUEE,
        // ni ici ni en production — elle faisait simplement echouer la
        // migration entiere.
        //
        // Ecrite en SQL explicite : on remplace la contrainte plutot que de
        // demander a l'abstraction quelque chose qu'elle ne sait pas faire.
        if (Schema::hasColumn('training_courses', 'level')) {
            DB::statement('ALTER TABLE training_courses DROP CONSTRAINT IF EXISTS training_courses_level_check');
            // Les DEUX vocabulaires sont admis, et c'est volontaire.
            //
            // 000097 cree `level` en ANGLAIS (beginner|intermediate|advanced,
            // defaut « beginner ») ; cette migration-ci le voulait en FRANCAIS.
            // Comme elle n'a jamais pu s'appliquer, la production porte les
            // valeurs anglaises : n'autoriser que le francais invaliderait
            // toutes les lignes existantes au moment ou la contrainte est
            // posee.
            //
            // Unifier le vocabulaire est une decision fonctionnelle, avec une
            // reprise de donnees et des libelles a revoir. Elle est signalee,
            // pas prise ici.
            DB::statement("
                ALTER TABLE training_courses
                ADD CONSTRAINT training_courses_level_check
                CHECK (level IS NULL OR level::text = ANY (ARRAY[
                    'beginner', 'intermediate', 'advanced',
                    'debutant', 'intermediaire', 'avance'
                ]))
            ");
            DB::statement('ALTER TABLE training_courses ALTER COLUMN level DROP NOT NULL');
        }

        // ── 2. Paquets SCORM ───────────────────────────────────────────────────
        if (! Schema::hasTable('training_scorm_packages')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_scorm_packages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('course_id')->nullable()->constrained('training_courses')->nullOnDelete();
                $table->string('title');
                $table->enum('version', ['scorm_12', 'scorm_2004', 'xapi'])->default('scorm_12');
                $table->string('package_path');        // répertoire extrait du ZIP
                $table->string('manifest_path')->nullable(); // imsmanifest.xml
                $table->string('launch_url');          // URL de lancement relative
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // ── 3. Sessions SCORM ──────────────────────────────────────────────────
        if (! Schema::hasTable('training_scorm_sessions')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_scorm_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('scorm_package_id')->constrained('training_scorm_packages')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->jsonb('session_data')->nullable();      // suspend_data, lesson_location, etc.
                $table->string('completion_status', 50)->default('not attempted');
                $table->string('success_status', 50)->nullable();
                $table->decimal('score_raw', 8, 2)->nullable();
                $table->decimal('score_max', 8, 2)->nullable();
                $table->string('total_time')->nullable();       // format HH:MM:SS
                $table->timestamp('started_at')->nullable();
                $table->timestamp('last_accessed_at')->nullable();
            });
        }

        // ── 4. Sessions live ───────────────────────────────────────────────────
        if (! Schema::hasTable('training_live_sessions')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_live_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->foreignId('course_id')->nullable()->constrained('training_courses')->nullOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->foreignId('instructor_user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamp('scheduled_at');
                $table->unsignedSmallInteger('duration_minutes')->default(60);
                $table->enum('platform', ['zoom', 'teams', 'meet', 'secretis_video'])->default('teams');
                $table->string('meeting_url')->nullable();
                $table->string('meeting_id')->nullable();
                $table->unsignedSmallInteger('max_participants')->default(50);
                $table->enum('status', ['scheduled', 'live', 'completed', 'cancelled'])->default('scheduled');
                $table->string('recording_url')->nullable();
                $table->jsonb('materials_paths')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // ── 5. Présence live ───────────────────────────────────────────────────
        if (! Schema::hasTable('training_live_attendees')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_live_attendees', function (Blueprint $table) {
                $table->id();
                $table->foreignId('live_session_id')->constrained('training_live_sessions')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->enum('status', ['registered', 'attended', 'absent', 'excused'])->default('registered');
                $table->timestamp('joined_at')->nullable();
                $table->timestamp('left_at')->nullable();
                $table->unsignedSmallInteger('duration_minutes')->nullable();
                $table->tinyInteger('evaluation_rating')->nullable();
                $table->text('evaluation_comment')->nullable();
                $table->unique(['live_session_id', 'user_id']);
            });
        }

        // ── 6. Parcours d'apprentissage ────────────────────────────────────────
        if (! Schema::hasTable('training_learning_paths')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_learning_paths', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('target_role')->nullable();
                $table->string('thumbnail_path')->nullable();
                $table->unsignedSmallInteger('total_hours')->default(0);
                $table->enum('difficulty', ['debutant', 'intermediaire', 'avance'])->default('debutant');
                // items: [{type: course|live|scorm|quiz, id, order, is_mandatory}]
                $table->jsonb('items')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // ── 7. Inscriptions aux parcours ───────────────────────────────────────
        if (! Schema::hasTable('training_path_enrollments')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_path_enrollments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('path_id')->constrained('training_learning_paths')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->string('status', 50)->default('enrolled');
                $table->tinyInteger('progress_percent')->default(0);
                $table->timestamp('started_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->unique(['path_id', 'user_id']);
            });
        }

        // ── 8. LRS xAPI ───────────────────────────────────────────────────────
        if (! Schema::hasTable('xapi_statements')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('xapi_statements', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->string('actor_email');
                $table->string('verb_id');
                $table->string('verb_display');
                $table->string('object_id');
                $table->string('object_name')->nullable();
                $table->decimal('result_score', 5, 2)->nullable();
                $table->boolean('result_success')->nullable();
                $table->boolean('result_completion')->nullable();
                $table->string('context_registration')->nullable();
                $table->timestamp('stored_at')->useCurrent();

                $table->index(['organization_id', 'actor_email']);
                $table->index(['organization_id', 'stored_at']);
            });
        }

        // ── 9. Évaluations de cours ────────────────────────────────────────────
        if (! Schema::hasTable('training_course_ratings')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('training_course_ratings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('course_id')->constrained('training_courses')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
                $table->tinyInteger('rating');
                $table->text('comment')->nullable();
                $table->timestamp('created_at')->useCurrent();
                $table->unique(['course_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('training_course_ratings');
        Schema::dropIfExists('xapi_statements');
        Schema::dropIfExists('training_path_enrollments');
        Schema::dropIfExists('training_learning_paths');
        Schema::dropIfExists('training_live_attendees');
        Schema::dropIfExists('training_live_sessions');
        Schema::dropIfExists('training_scorm_sessions');
        Schema::dropIfExists('training_scorm_packages');

        Schema::table('training_courses', function (Blueprint $table) {
            $table->dropColumn([
                'thumbnail_path', 'trailer_url', 'language', 'skills_taught',
                'prerequisites', 'rating_avg', 'rating_count', 'is_public',
                'price_xof', 'tags',
            ]);
        });
    }
};
