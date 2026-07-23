<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Annonces plateforme (bandeau / modal) publiées depuis le SuperAdmin IBIG.
 *
 * - announcements         : annonces avec ciblage (all / plan / org)
 * - announcement_dismissals : suivi des fermetures par utilisateur
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Table principale ──────────────────────────────────────────────────
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();

            // Contenu multilingue ({"fr": "...", "en": "..."})
            $table->json('title');
            $table->json('message');

            // Type visuel : info | warning | success | maintenance | feature
            $table->enum('type', ['info', 'warning', 'success', 'maintenance', 'feature'])
                  ->default('info');

            // Couleur de fond personnalisée (ex: #FF6B00) — null = couleur par défaut du type
            $table->string('color', 20)->nullable();

            // Mode d'affichage : bandeau sous navbar | modal | les deux
            $table->enum('display', ['banner', 'modal', 'both'])->default('banner');

            // Ciblage : all = tous | plan = plans spécifiques | org = organisations spécifiques
            $table->enum('target', ['all', 'plan', 'org'])->default('all');

            // IDs ciblés selon le type de ciblage :
            //   target=plan → IDs de plans, ex: [1, 3]
            //   target=org  → IDs d'organisations, ex: [12, 45, 67]
            $table->json('target_ids')->nullable();

            // Appel à l'action optionnel
            $table->string('cta_label', 100)->nullable();
            $table->string('cta_url', 500)->nullable();

            // Comportement
            $table->boolean('is_dismissible')->default(true);
            $table->boolean('is_active')->default(false);

            // Fenêtre de diffusion
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();

            // Audit
            $table->foreignId('created_by')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->timestamps();

            // Index pour la requête des annonces actives (exécutée fréquemment)
            $table->index(['is_active', 'starts_at', 'ends_at'], 'idx_announcements_active_window');
        });

        // ── Fermetures par utilisateur ────────────────────────────────────────
        Schema::create('announcement_dismissals', function (Blueprint $table) {
            $table->id();

            $table->foreignId('announcement_id')
                  ->constrained('announcements')
                  ->cascadeOnDelete();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->timestamp('dismissed_at');

            // Un utilisateur ne peut fermer une annonce qu'une seule fois
            $table->unique(['announcement_id', 'user_id'], 'uq_announcement_dismissal');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_dismissals');
        Schema::dropIfExists('announcements');
    }
};
