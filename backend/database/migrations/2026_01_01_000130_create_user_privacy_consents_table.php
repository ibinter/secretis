<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Crée la table de consentements cookies RGPD par utilisateur.
     * Une ligne par utilisateur (UPSERT via updateOrCreate).
     */
    public function up(): void
    {
        Schema::create('user_privacy_consents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                  ->constrained()
                  ->cascadeOnDelete();

            // Catégories de consentement
            $table->boolean('preferences')->default(false)->comment('Cookies de préférences (langue, thème, fuseau)');
            $table->boolean('statistics')->default(false)->comment('Cookies statistiques anonymisés');
            $table->boolean('marketing')->default(false)->comment('Cookies de marketing et retargeting');
            $table->boolean('ai_sara')->default(false)->comment('Cookies IA SARA (contexte conversationnel)');

            // Métadonnées de consentement (audit RGPD)
            $table->timestamp('consented_at')->nullable()->comment('Date du dernier choix explicite');
            $table->string('ip_address', 45)->nullable()->comment('Adresse IP au moment du consentement (IPv4/IPv6)');

            $table->timestamps();

            // Un seul enregistrement par utilisateur
            $table->unique('user_id');
        });
    }

    /**
     * Supprime la table.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_privacy_consents');
    }
};
