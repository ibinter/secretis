<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Étapes d'onboarding ────────────────────────────────────────────────
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
                    $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                    $table->string('step_key', 60);   // ex: 'organization_profile'
                    $table->enum('status', ['pending', 'skipped', 'completed'])->default('pending');
                    $table->timestamp('completed_at')->nullable();
                    $table->jsonb('data')->nullable();  // données saisies à cette étape
                    $table->timestamps();

                    $table->unique(['organization_id', 'step_key']);
                    $table->index(['organization_id', 'status']);
                });
            }
        }

        // ── Activations de trial ───────────────────────────────────────────────
        if (! Schema::hasTable('trial_activations')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('trial_activations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('plan_id');                       // ex: 'pro_monthly'
                $table->timestamp('trial_start');
                $table->timestamp('trial_end');
                $table->timestamp('converted_at')->nullable();
                $table->string('converted_plan_id')->nullable();
                $table->enum('source', ['web', 'api', 'partner'])->default('web');
                $table->string('utm_source')->nullable();
                $table->string('utm_medium')->nullable();
                $table->string('utm_campaign')->nullable();
                $table->timestamps();

                $table->index('organization_id');
                $table->index('trial_end');
            });
        }

        // ── Invitations membres ────────────────────────────────────────────────
        if (! Schema::hasTable('organization_invitations')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('organization_invitations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('email');
                $table->string('role', 40)->default('member');
                $table->uuid('token')->unique();
                $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
                $table->timestamp('accepted_at')->nullable();
                $table->timestamp('expires_at');
                $table->timestamps();

                $table->index(['organization_id', 'email']);
                $table->index('expires_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_invitations');
        Schema::dropIfExists('trial_activations');
        Schema::dropIfExists('onboarding_steps');
    }
};
