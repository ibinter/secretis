<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Étapes d'onboarding (définition) ─────────────────────────────────
        if (! Schema::hasTable('onboarding_steps')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('onboarding_steps')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('onboarding_steps', function (Blueprint $table) {
                    $table->id();
                    $table->string('key', 50)->unique();
                    $table->unsignedSmallInteger('order')->default(0);
                    $table->string('icon', 10)->default('⭐');
                    $table->unsignedSmallInteger('points')->default(50);
                    $table->boolean('is_required')->default(false);
                    $table->json('translations');
                    // { "fr": {"title":"...","description":"...","action_label":"..."},
                    //   "en": {"title":"...","description":"...","action_label":"..."} }
                    $table->string('route_name', 100)->nullable();
                    $table->timestamps();

                    $table->index('order');
                });
            }
        }

        // ── Complétion par user ───────────────────────────────────────────────
        if (! Schema::hasTable('onboarding_completions')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('onboarding_completions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')
                      ->constrained('organizations')
                      ->cascadeOnDelete();
                $table->foreignId('user_id')
                      ->constrained('users')
                      ->cascadeOnDelete();
                $table->string('step_key', 50);
                $table->timestamp('completed_at')->useCurrent();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'step_key']);
                $table->index('organization_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_completions');
        Schema::dropIfExists('onboarding_steps');
    }
};
