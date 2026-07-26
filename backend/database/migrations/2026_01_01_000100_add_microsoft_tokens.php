<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration : Intégration Microsoft 365 — IBIG SECRETIS ERP
 *
 * Ajoute les colonnes nécessaires pour stocker les tokens OAuth2 Microsoft
 * sur les utilisateurs et les credentials Azure AD par organisation.
 *
 * SÉCURITÉ :
 *  - Les tokens et secrets sont chiffrés en base (cast 'encrypted')
 *  - Les scopes sont stockés en JSON pour auditer les permissions accordées
 *  - microsoft_token_expires_at permet de détecter les tokens expirés
 */
return new class extends Migration
{
    public function up(): void
    {
        // -------------------------------------------------------------------------
        // Table users — tokens OAuth2 par utilisateur
        // -------------------------------------------------------------------------
        Schema::table('users', function (Blueprint $table) {
            // Identifiant unique Microsoft (objet ID Azure AD)
            $table->string('microsoft_id')->nullable()->after('last_login_ip');

            // Access token chiffré (validité ~1h)
            $table->text('microsoft_access_token')->nullable()->after('microsoft_id');

            // Refresh token chiffré (validité ~90 jours, renouvellement silencieux)
            $table->text('microsoft_refresh_token')->nullable()->after('microsoft_access_token');

            // Date d'expiration de l'access token courant
            $table->timestamp('microsoft_token_expires_at')->nullable()->after('microsoft_refresh_token');

            // Email Microsoft (peut différer de l'email SECRETIS)
            $table->string('microsoft_email')->nullable()->after('microsoft_token_expires_at');

            // Scopes accordés par l'utilisateur lors du consentement OAuth2
            // Ex: ["Calendars.ReadWrite", "Mail.Send", "Files.ReadWrite"]
            $table->json('microsoft_scopes')->nullable()->after('microsoft_email');

            // Index pour lookup rapide par microsoft_id
            $table->index('microsoft_id', 'users_microsoft_id_idx');
        });

        // -------------------------------------------------------------------------
        // Table organizations — credentials Azure AD par tenant
        // -------------------------------------------------------------------------
        Schema::table('organizations', function (Blueprint $table) {
            // Identifiant du tenant Azure AD (Directory ID)
            // Null = utiliser l'app Azure globale IBIG
            $table->string('microsoft_tenant_id')->nullable()->after('settings');

            // Client ID de l'application Azure AD de l'organisation (si app dédiée)
            $table->text('microsoft_client_id')->nullable()->after('microsoft_tenant_id');

            // Client Secret chiffré
            $table->text('microsoft_client_secret')->nullable()->after('microsoft_client_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_microsoft_id_idx');
            $table->dropColumn([
                'microsoft_id',
                'microsoft_access_token',
                'microsoft_refresh_token',
                'microsoft_token_expires_at',
                'microsoft_email',
                'microsoft_scopes',
            ]);
        });

        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn([
                'microsoft_tenant_id',
                'microsoft_client_id',
                'microsoft_client_secret',
            ]);
        });
    }
};
