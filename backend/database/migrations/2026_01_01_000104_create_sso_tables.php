<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration SSO — SECRETIS ERP
 *
 * Crée les tables :
 *  - sso_providers  : configuration des fournisseurs SSO par organisation
 *  - sso_sessions   : sessions SSO actives (audit + invalidation)
 *
 * Et ajoute sur `users` :
 *  - sso_provider_id, sso_external_id, sso_synced_at, is_sso_only
 *
 * SÉCURITÉ :
 *  - La colonne `config` est stockée en JSON chiffré (chiffrement applicatif dans SamlService)
 *  - Les tokens de session SSO sont hachés en base (SHA-256)
 *  - sso_sessions.expires_at permet l'invalidation automatique des sessions expirées
 */
return new class extends Migration
{
    public function up(): void
    {
        // ------------------------------------------------------------------
        // TABLE sso_providers
        // Stocke la configuration SSO d'une organisation (SAML, LDAP, OIDC).
        // Une organisation peut avoir plusieurs providers mais un seul actif
        // par type à la fois (géré au niveau applicatif).
        // ------------------------------------------------------------------
        Schema::create('sso_providers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('organization_id')
                  ->constrained()
                  ->cascadeOnDelete();

            // Nom lisible par l'admin (ex: "Azure AD Production", "OpenLDAP Serveur 1")
            $table->string('name', 100);

            // Type de protocole SSO
            $table->enum('type', ['saml', 'ldap', 'oidc']);

            $table->boolean('is_active')->default(false);

            // Configuration spécifique au type, chiffrée côté application
            // (AES-256-GCM via encrypt()/decrypt() Laravel)
            // SAML  : entity_id, idp_sso_url, idp_cert, sp_cert, sp_key, attribute_mapping, ...
            // LDAP  : host, port, base_dn, bind_dn, bind_password, user_filter, group_filter, ...
            // OIDC  : client_id, client_secret, discovery_url, scopes, redirect_uri, ...
            $table->json('config');

            // Domaines email gérés par ce provider (ex: ["acme.com", "acme.fr"])
            // Utilisé pour la détection automatique du SSO
            $table->json('email_domains')->nullable();

            // Métadonnées de synchronisation (LDAP uniquement)
            $table->timestamp('last_sync_at')->nullable();
            $table->json('last_sync_stats')->nullable();  // {created, updated, disabled}

            $table->timestamps();

            $table->index('organization_id');
            $table->index(['organization_id', 'type', 'is_active']);
            $table->index('is_active');
        });

        // ------------------------------------------------------------------
        // TABLE sso_sessions
        // Trace chaque session SSO initiée (SAML Assertion ou OIDC token).
        // Permet : audit de sécurité, invalidation ciblée, détection d'anomalies.
        // ------------------------------------------------------------------
        Schema::create('sso_sessions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained()
                  ->cascadeOnDelete();

            $table->foreignId('provider_id')
                  ->constrained('sso_providers')
                  ->cascadeOnDelete();

            // Identifiant de l'utilisateur côté IdP (NameID SAML, sub OIDC, dn LDAP)
            $table->string('external_id', 255);

            // Token de session hashé (SHA-256) — jamais stocké en clair
            $table->string('session_token', 64)->unique();

            // Contexte réseau pour la détection d'anomalies
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();

            // Dates de validité
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('expires_at');

            // Révocation manuelle (déconnexion SSO / admin)
            $table->timestamp('revoked_at')->nullable();

            $table->index('user_id');
            $table->index('provider_id');
            $table->index(['session_token']);
            $table->index('expires_at');
            $table->index(['user_id', 'provider_id', 'expires_at']);
        });

        // ------------------------------------------------------------------
        // COLONNES SSO sur la table users
        // Ajout des métadonnées SSO sans perturber les colonnes existantes.
        // ------------------------------------------------------------------
        Schema::table('users', function (Blueprint $table) {
            // FK vers le provider SSO qui a créé/géré cet utilisateur
            $table->foreignId('sso_provider_id')
                  ->nullable()
                  ->after('organization_id')
                  ->constrained('sso_providers')
                  ->nullOnDelete();

            // Identifiant externe chez l'IdP (NameID, sub, dn)
            $table->string('sso_external_id', 255)
                  ->nullable()
                  ->after('sso_provider_id');

            // Dernière synchronisation des attributs depuis l'IdP
            $table->timestamp('sso_synced_at')
                  ->nullable()
                  ->after('sso_external_id');

            // Quand true : empêche la connexion par mot de passe local
            // (sauf super admins et comptes de secours)
            $table->boolean('is_sso_only')
                  ->default(false)
                  ->after('sso_synced_at');

            $table->index('sso_provider_id');
            $table->index(['sso_provider_id', 'sso_external_id']);
            $table->index('is_sso_only');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['sso_provider_id']);
            $table->dropIndex(['sso_provider_id']);
            $table->dropIndex(['sso_provider_id', 'sso_external_id']);
            $table->dropIndex(['is_sso_only']);
            $table->dropColumn(['sso_provider_id', 'sso_external_id', 'sso_synced_at', 'is_sso_only']);
        });

        Schema::dropIfExists('sso_sessions');
        Schema::dropIfExists('sso_providers');
    }
};
