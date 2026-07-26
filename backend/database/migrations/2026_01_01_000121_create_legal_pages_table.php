<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SECRETIS ERP — Migration : Tables des pages légales
 *
 * Deux tables :
 *   - legal_pages        : Contenu des 18 pages légales (bilingue FR/EN)
 *   - legal_page_acceptances : Traçabilité des acceptations utilisateurs (CGU, RGPD…)
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Table principale des pages légales ────────────────────────────────
        Schema::create('legal_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique()->comment('Identifiant URL (ex: mentions-legales, cgu, cgv)');
            $table->json('title')->comment('Titre bilingue {"fr": "...", "en": "..."}');
            $table->json('content')->comment('Contenu HTML bilingue {"fr": "...", "en": "..."}');
            $table->string('icon')->nullable()->comment('Nom icône Heroicons (ex: shield-check)');
            $table->string('category')->default('general')
                  ->comment('Catégorie : general, privacy, commercial, usage, support');
            $table->string('version')->default('1.0')->comment('Numéro de version sémantique');
            $table->boolean('is_active')->default(true);
            $table->boolean('requires_acceptance')->default(false)
                  ->comment('true pour CGU, RGPD — impose un bandeau d\'acceptation');
            $table->boolean('is_public')->default(true)
                  ->comment('Visible sans connexion (ex: mentions légales, CGU)');
            $table->integer('display_order')->default(0)->comment('Ordre d\'affichage dans le menu');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('effective_date')->nullable()->comment('Date d\'entrée en vigueur');
            $table->timestamps();

            $table->index(['is_active', 'display_order']);
            $table->index('category');
        });

        // ── Table de traçabilité des acceptations ─────────────────────────────
        Schema::create('legal_page_acceptances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('page_slug')->comment('Référence au slug de la page légale');
            $table->string('version')->comment('Version acceptée au moment de l\'acceptation');
            $table->string('ip_address', 45)->nullable()->comment('IPv4 ou IPv6 de l\'utilisateur');
            $table->string('user_agent')->nullable()->comment('Navigateur au moment de l\'acceptation');
            $table->timestamp('accepted_at')->comment('Horodatage de l\'acceptation');
            $table->timestamps();

            // Unicité : un utilisateur accepte une version une seule fois
            $table->unique(['user_id', 'page_slug', 'version']);
            $table->index(['user_id', 'page_slug']);
            $table->index('page_slug');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_page_acceptances');
        Schema::dropIfExists('legal_pages');
    }
};
