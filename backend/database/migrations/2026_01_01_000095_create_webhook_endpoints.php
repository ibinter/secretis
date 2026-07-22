<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Crée les tables de gestion des webhooks sortants.
 *
 * webhook_endpoints  → configuration des destinations
 * webhook_deliveries → historique des tentatives de livraison
 */
return new class extends Migration
{
    public function up(): void
    {
        // -----------------------------------------------------------------
        // Table webhook_endpoints
        // -----------------------------------------------------------------
        Schema::create('webhook_endpoints', function (Blueprint $table) {
            $table->id();

            $table->foreignId('organization_id')
                ->constrained('organizations')
                ->cascadeOnDelete();

            // URL de destination (obligatoirement HTTPS en production)
            $table->string('url', 2048)
                ->comment('URL de destination du webhook (HTTPS recommandé)');

            // Secret pour signer les payloads HMAC-SHA256
            $table->string('secret', 255)
                ->comment('Secret HMAC-SHA256 pour X-Secretis-Signature');

            // Liste des événements souscrits (JSON array)
            // Ex: ["event.created", "task.completed", "invoice.paid"]
            // "*" = tous les événements
            $table->json('events')
                ->comment('Liste des types d\'événements souscrits');

            $table->boolean('is_active')
                ->default(true)
                ->comment('Désactivé auto après 10 échecs consécutifs');

            $table->timestamp('last_called_at')
                ->nullable()
                ->comment('Dernière tentative de livraison (succès ou échec)');

            $table->unsignedSmallInteger('failure_count')
                ->default(0)
                ->comment('Nombre d\'échecs consécutifs (reset à 0 sur succès)');

            $table->string('description', 500)
                ->nullable()
                ->comment('Description libre de l\'intégration');

            $table->timestamps();

            // Index pour filtrer par organisation et statut actif
            $table->index(['organization_id', 'is_active'], 'wh_endpoints_org_active_idx');
        });

        // -----------------------------------------------------------------
        // Table webhook_deliveries
        // -----------------------------------------------------------------
        Schema::create('webhook_deliveries', function (Blueprint $table) {
            $table->id();

            $table->foreignId('endpoint_id')
                ->constrained('webhook_endpoints')
                ->cascadeOnDelete();

            // Type d'événement : "event.created", "invoice.paid", etc.
            $table->string('event_type', 100);

            // Payload JSON envoyé
            $table->json('payload');

            // Résultat HTTP
            $table->unsignedSmallInteger('response_status')
                ->nullable()
                ->comment('Code HTTP de la réponse (null si timeout/réseau)');

            $table->text('response_body')
                ->nullable()
                ->comment('Corps de la réponse HTTP, tronqué à 2000 chars');

            // Gestion des tentatives et retry
            $table->unsignedTinyInteger('attempts')
                ->default(0)
                ->comment('Nombre de tentatives effectuées');

            $table->timestamp('next_retry_at')
                ->nullable()
                ->comment('Prochaine tentative planifiée (null si définitivement échoué)');

            $table->timestamp('delivered_at')
                ->nullable()
                ->comment('Horodatage de la livraison réussie');

            // UUID unique de cette livraison, envoyé dans X-Secretis-Delivery
            $table->uuid('delivery_id')
                ->unique()
                ->comment('UUID unique envoyé dans X-Secretis-Delivery');

            $table->timestamps();

            // Index pour les requêtes fréquentes
            $table->index(['endpoint_id', 'event_type'], 'wh_deliveries_endpoint_event_idx');
            $table->index('next_retry_at', 'wh_deliveries_retry_idx');
            $table->index('delivered_at', 'wh_deliveries_delivered_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_deliveries');
        Schema::dropIfExists('webhook_endpoints');
    }
};
