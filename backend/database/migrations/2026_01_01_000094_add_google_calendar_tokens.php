<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute les colonnes Google Calendar sur la table users.
 *
 * Sécurité : Les tokens sont chiffrés en AES-256 (Laravel Crypt) avant stockage.
 * Ne jamais stocker de tokens en clair.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Token d'accès OAuth2 — chiffré, courte durée (1h)
            $table->text('google_calendar_token')
                ->nullable()
                ->after('preferences')
                ->comment('Access token OAuth2 Google, chiffré AES-256');

            // Refresh token OAuth2 — chiffré, longue durée
            $table->text('google_calendar_refresh_token')
                ->nullable()
                ->after('google_calendar_token')
                ->comment('Refresh token OAuth2 Google, chiffré AES-256');

            // Date d'expiration du token d'accès
            $table->timestamp('google_calendar_token_expires_at')
                ->nullable()
                ->after('google_calendar_refresh_token')
                ->comment('Expiration du access token (UTC)');

            // ID du calendrier Google lié (ex: user@gmail.com)
            $table->string('google_calendar_id', 255)
                ->nullable()
                ->after('google_calendar_token_expires_at')
                ->comment('ID du calendrier Google Calendar (email ou ID spécifique)');

            // Horodatage de dernière synchronisation
            $table->timestamp('google_calendar_synced_at')
                ->nullable()
                ->after('google_calendar_id')
                ->comment('Dernière synchronisation réussie');
        });

        // Ajouter google_event_id sur la table events pour le tracking
        Schema::table('events', function (Blueprint $table) {
            $table->string('google_event_id', 255)
                ->nullable()
                ->after('meet_link')
                ->comment('ID de l\'événement dans Google Calendar');

            $table->timestamp('google_synced_at')
                ->nullable()
                ->after('google_event_id')
                ->comment('Horodatage de dernière sync Google');

            $table->index('google_event_id', 'events_google_event_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex('events_google_event_id_index');
            $table->dropColumn(['google_event_id', 'google_synced_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'google_calendar_token',
                'google_calendar_refresh_token',
                'google_calendar_token_expires_at',
                'google_calendar_id',
                'google_calendar_synced_at',
            ]);
        });
    }
};
