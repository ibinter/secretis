<?php

namespace App\Services;

use App\Jobs\DeliverWebhook;
use App\Models\WebhookDelivery;
use App\Models\WebhookEndpoint;
use Illuminate\Support\Str;

/**
 * OutgoingWebhookService — Orchestrateur des webhooks sortants SECRETIS.
 *
 * Événements disponibles :
 *   Agenda   : event.created, event.updated
 *   Tâches   : task.created, task.completed
 *   Courrier : courrier.received, courrier.processed
 *   Accueil  : visitor.arrived, visitor.departed
 *   Comptab. : invoice.created, invoice.paid
 *   RH       : user.invited, leave.approved
 */
class OutgoingWebhookService
{
    /**
     * Liste exhaustive des événements supportés.
     * Utilisée pour la validation et l'affichage dans l'UI.
     */
    public const SUPPORTED_EVENTS = [
        // Agenda
        'event.created',
        'event.updated',

        // Tâches & Projets
        'task.created',
        'task.completed',

        // Courrier
        'courrier.received',
        'courrier.processed',

        // Gestion des visiteurs
        'visitor.arrived',
        'visitor.departed',

        // Comptabilité
        'invoice.created',
        'invoice.paid',

        // RH & Utilisateurs
        'user.invited',
        'leave.approved',
    ];

    // -------------------------------------------------------------------------
    // Dispatch principal
    // -------------------------------------------------------------------------

    /**
     * Dispatch un événement vers tous les endpoints actifs de l'organisation.
     *
     * @param string $event   Type d'événement (ex: "event.created")
     * @param array  $payload Données de l'événement (sérialisables en JSON)
     * @param int    $orgId   ID de l'organisation
     */
    public function dispatch(string $event, array $payload, int $orgId): void
    {
        if (! in_array($event, self::SUPPORTED_EVENTS, true)) {
            return;
        }

        // Trouver tous les endpoints actifs souscrits à cet événement
        $endpoints = WebhookEndpoint::where('organization_id', $orgId)
            ->where('is_active', true)
            ->where('failure_count', '<', 10)
            ->get()
            ->filter(fn(WebhookEndpoint $ep) => $ep->subscribesTo($event));

        foreach ($endpoints as $endpoint) {
            $this->dispatchToEndpoint($endpoint, $event, $payload);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Crée un enregistrement de livraison et dispatch le job asynchrone.
     */
    private function dispatchToEndpoint(WebhookEndpoint $endpoint, string $event, array $payload): void
    {
        $deliveryId = (string) Str::uuid();

        // Envelopper le payload avec des métadonnées SECRETIS
        $wrappedPayload = [
            'id'           => $deliveryId,
            'event'        => $event,
            'created_at'   => now()->toIso8601String(),
            'organization' => $endpoint->organization_id,
            'data'         => $payload,
        ];

        // Créer l'enregistrement de livraison
        $delivery = WebhookDelivery::create([
            'endpoint_id' => $endpoint->id,
            'event_type'  => $event,
            'payload'     => $wrappedPayload,
            'attempts'    => 0,
            'delivery_id' => $deliveryId,
        ]);

        // Dispatcher le job asynchrone (queue: webhooks)
        DeliverWebhook::dispatch($delivery->id)->onQueue('webhooks');
    }

    // -------------------------------------------------------------------------
    // Test d'endpoint
    // -------------------------------------------------------------------------

    /**
     * Envoie un payload de test à un endpoint spécifique.
     * Utilisé depuis l'UI "Tester" du bouton webhook.
     */
    public function test(WebhookEndpoint $endpoint): bool
    {
        $testPayload = [
            'id'           => (string) Str::uuid(),
            'event'        => 'webhook.test',
            'created_at'   => now()->toIso8601String(),
            'organization' => $endpoint->organization_id,
            'data'         => [
                'message' => 'Ceci est un test de webhook SECRETIS ERP',
                'endpoint_id' => $endpoint->id,
            ],
        ];

        $delivery = WebhookDelivery::create([
            'endpoint_id' => $endpoint->id,
            'event_type'  => 'webhook.test',
            'payload'     => $testPayload,
            'attempts'    => 0,
            'delivery_id' => $testPayload['id'],
        ]);

        // Test synchrone pour feedback immédiat dans l'UI
        try {
            DeliverWebhook::dispatchSync($delivery->id);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
