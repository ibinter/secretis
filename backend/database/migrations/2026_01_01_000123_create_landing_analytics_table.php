<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('landing_analytics')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('landing_analytics', function (Blueprint $table) {
                $table->id();

                // Type d'événement : page_view, cta_click, demo_request, trial_signup,
                // sara_open, whatsapp_click, pwa_install, partner_click, etc.
                $table->string('event_type', 64);

                // Page concernée (ex: /, /tarifs, /demonstration)
                $table->string('page', 255)->nullable();

                // Identifiant du bouton ou de la section cliquée
                $table->string('element', 255)->nullable();

                // Identifiant de session anonyme — jamais de user_id
                $table->string('session_id', 64)->nullable();

                // Origine de la visite
                $table->string('referrer', 500)->nullable();

                // Paramètres UTM
                $table->string('utm_source', 100)->nullable();
                $table->string('utm_medium', 100)->nullable();
                $table->string('utm_campaign', 100)->nullable();
                $table->string('utm_term', 100)->nullable();
                $table->string('utm_content', 100)->nullable();

                // Géolocalisation approximative via GeoIP (jamais d'IP stockée)
                $table->string('country', 2)->nullable();    // Code ISO-3166-1 alpha-2
                $table->string('region', 100)->nullable();

                // Appareil et navigateur
                $table->enum('device_type', ['mobile', 'tablet', 'desktop', 'unknown'])->nullable();
                $table->string('browser', 50)->nullable();
                $table->string('os', 50)->nullable();

                // Comportement
                $table->boolean('is_returning')->default(false);
                $table->boolean('cookie_consent')->default(false);

                // Durée sur la page en secondes (envoyée au beforeunload)
                $table->unsignedSmallInteger('time_on_page')->nullable();

                $table->timestamps();

                // Index pour les requêtes analytiques fréquentes
                $table->index(['event_type', 'created_at']);
                $table->index(['page', 'created_at']);
                $table->index('utm_source');
                $table->index('session_id');
                $table->index('country');
                $table->index(['device_type', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_analytics');
    }
};
