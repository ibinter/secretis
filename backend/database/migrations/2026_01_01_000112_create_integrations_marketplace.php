<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Marketplace d'intégrations IBIG SECRETIS
 *
 * Tables créées :
 *  - integration_connectors    : catalogue des connecteurs disponibles
 *  - organization_integrations : connecteurs installés par organisation
 *  - integration_logs          : journal des événements d'intégration
 *  - partner_apps              : applications partenaires OAuth2
 */
return new class extends Migration
{
    public function up(): void
    {
        // ─── 1. Catalogue des connecteurs ────────────────────────────────────
        if (! Schema::hasTable('integration_connectors')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('integration_connectors', function (Blueprint $table) {
                $table->id();
                $table->string('slug')->unique();
                $table->string('name');
                $table->enum('category', [
                    'communication',
                    'erp',
                    'payment',
                    'storage',
                    'productivity',
                    'hr',
                    'custom',
                ])->default('custom');
                $table->text('description')->nullable();
                $table->string('icon_url')->nullable();
                $table->boolean('is_official')->default(false)->comment('Développé par IBIG Soft');
                $table->boolean('is_premium')->default(false)->comment('Payant / plan supérieur requis');
                $table->enum('required_plan', ['starter', 'pro', 'enterprise'])->default('starter');
                $table->string('documentation_url')->nullable();
                $table->string('webhook_url')->nullable()->comment('URL de callback du connecteur');
                $table->string('api_version')->nullable()->default('v1');
                $table->enum('status', ['active', 'beta', 'deprecated'])->default('active');
                // config_schema : JSON Schema définissant les champs de configuration
                // Ex: {"fields":[{"key":"api_key","label":"Clé API","type":"password","required":true}]}
                $table->jsonb('config_schema')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // ─── 2. Installations par organisation ───────────────────────────────
        if (! Schema::hasTable('organization_integrations')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('organization_integrations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')
                      ->constrained('organizations')
                      ->cascadeOnDelete();
                $table->foreignId('connector_id')
                      ->constrained('integration_connectors')
                      ->cascadeOnDelete();
                $table->enum('status', ['pending', 'active', 'error', 'disabled'])->default('pending');
                // config stocké chiffré en base (encrypt() Laravel)
                $table->jsonb('config')->nullable()->comment('Clés API et paramètres chiffrés');
                $table->timestamp('last_sync_at')->nullable();
                $table->text('error_message')->nullable();
                $table->foreignId('created_by')
                      ->nullable()
                      ->constrained('users')
                      ->nullOnDelete();
                $table->timestamp('created_at')->useCurrent();

                $table->unique(['organization_id', 'connector_id']);
                $table->index('status');
            });
        }

        // ─── 3. Journal des événements ───────────────────────────────────────
        if (! Schema::hasTable('integration_logs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('integration_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')
                      ->constrained('organizations')
                      ->cascadeOnDelete();
                $table->foreignId('connector_id')
                      ->constrained('integration_connectors')
                      ->cascadeOnDelete();
                $table->enum('direction', ['inbound', 'outbound']);
                $table->string('event_type')->comment('Ex: sms.sent, contact.sync, invoice.export');
                $table->char('payload_hash', 64)->nullable()->comment('SHA-256 du payload');
                $table->enum('status', ['success', 'error', 'retry'])->default('success');
                $table->unsignedInteger('duration_ms')->nullable();
                $table->unsignedSmallInteger('http_status')->nullable();
                $table->text('error_detail')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->index(['organization_id', 'connector_id', 'created_at']);
                $table->index(['status', 'created_at']);
            });
        }

        // ─── 4. Applications partenaires (OAuth2) ────────────────────────────
        if (! Schema::hasTable('partner_apps')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('partner_apps', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('partner_email');
                $table->string('webhook_secret', 64)->comment('Secret HMAC pour la signature des webhooks');
                $table->jsonb('scopes')->nullable()->comment('Ex: ["org:read","contacts:read","events:write"]');
                $table->boolean('is_approved')->default(false);
                $table->string('callback_url')->nullable();
                $table->string('client_id', 64)->unique()->nullable();
                $table->string('client_secret', 128)->nullable()->comment('Stocké hashé');
                $table->timestamp('created_at')->useCurrent();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_logs');
        Schema::dropIfExists('organization_integrations');
        Schema::dropIfExists('partner_apps');
        Schema::dropIfExists('integration_connectors');
    }
};
