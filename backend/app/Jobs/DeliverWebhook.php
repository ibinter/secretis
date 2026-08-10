<?php

namespace App\Jobs;

use App\Models\WebhookDelivery;
use App\Models\WebhookEndpoint;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * DeliverWebhook — Job de livraison d'un webhook sortant.
 *
 * Stratégie de retry exponentiel :
 *   Tentative 1 : immédiat
 *   Tentative 2 : +1 min
 *   Tentative 3 : +5 min
 *   Tentative 4 : +30 min
 *   Tentative 5 : +2h
 *   (max 5 tentatives, délai total ~2h37)
 *
 * Headers envoyés :
 *   Content-Type: application/json
 *   X-Secretis-Signature: sha256=<hmac>
 *   X-Secretis-Event: <event_type>
 *   X-Secretis-Delivery: <uuid>
 *   User-Agent: SECRETIS-ERP-Webhook/1.0
 */
class DeliverWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Délais de retry en secondes (index = numéro de tentative - 1).
     */
    private const RETRY_DELAYS = [
        0  => 0,
        1  => 60,        // 1 minute
        2  => 300,       // 5 minutes
        3  => 1800,      // 30 minutes
        4  => 7200,      // 2 heures
    ];

    public int $tries    = 1; // On gère nous-mêmes les retries
    public int $timeout  = 30;

    public function __construct(
        private readonly int $deliveryId
    ) {}

    // -------------------------------------------------------------------------
    // Exécution
    // -------------------------------------------------------------------------

    public function handle(): void
    {
        $delivery = WebhookDelivery::with('endpoint')->find($this->deliveryId);

        if (! $delivery) {
            Log::warning('DeliverWebhook : livraison introuvable', ['delivery_id' => $this->deliveryId]);
            return;
        }

        $endpoint = $delivery->endpoint;

        if (! $endpoint || ! $endpoint->is_active) {
            Log::info('DeliverWebhook : endpoint inactif, annulation', [
                'delivery_id' => $this->deliveryId,
                'endpoint_id' => $endpoint?->id,
            ]);
            return;
        }

        // Incrémenter le compteur de tentatives
        $delivery->increment('attempts');
        $delivery->refresh();

        $attempt = $delivery->attempts;

        // Construire le payload JSON
        $payloadJson = json_encode($delivery->payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $signature   = $endpoint->generateSignature($payloadJson);

        try {
            $response = Http::withHeaders([
                'Content-Type'         => 'application/json',
                'X-Secretis-Signature' => $signature,
                'X-Secretis-Event'     => $delivery->event_type,
                'X-Secretis-Delivery'  => $delivery->delivery_id,
                'User-Agent'           => 'SECRETIS-ERP-Webhook/1.0',
            ])
            ->timeout(10)
            ->send('POST', $endpoint->url, ['body' => $payloadJson]);

            $statusCode   = $response->status();
            $responseBody = mb_substr($response->body(), 0, 2000);

            $delivery->update([
                'response_status' => $statusCode,
                'response_body'   => $responseBody,
                'next_retry_at'   => null,
            ]);

            if ($response->successful()) {
                // Succès
                $delivery->update(['delivered_at' => now()]);
                $endpoint->recordSuccess();

                Log::info('Webhook livré avec succès', [
                    'delivery_id' => $delivery->delivery_id,
                    'endpoint_id' => $endpoint->id,
                    'status'      => $statusCode,
                    'attempt'     => $attempt,
                ]);
            } else {
                // Réponse HTTP non-2xx : planifier un retry
                $this->scheduleRetry($delivery, $endpoint, $attempt, "HTTP {$statusCode}");
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            // Timeout ou erreur réseau
            $delivery->update([
                'response_status' => null,
                'response_body'   => 'Connection error: ' . mb_substr($e->getMessage(), 0, 500),
            ]);

            $this->scheduleRetry($delivery, $endpoint, $attempt, 'Connection error: ' . $e->getMessage());
        } catch (\Exception $e) {
            $delivery->update([
                'response_status' => null,
                'response_body'   => 'Error: ' . mb_substr($e->getMessage(), 0, 500),
            ]);

            $this->scheduleRetry($delivery, $endpoint, $attempt, $e->getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Gestion des retries
    // -------------------------------------------------------------------------

    /**
     * Planifie un retry ou marque la livraison comme définitivement échouée.
     */
    private function scheduleRetry(
        WebhookDelivery $delivery,
        WebhookEndpoint $endpoint,
        int $attempt,
        string $reason
    ): void {
        Log::warning('Webhook livraison échouée', [
            'delivery_id' => $delivery->delivery_id,
            'endpoint_id' => $endpoint->id,
            'attempt'     => $attempt,
            'reason'      => $reason,
        ]);

        // Incrémenter le compteur d'échecs de l'endpoint
        $endpoint->recordFailure();
        $endpoint->update(['last_called_at' => now()]);

        if (! $endpoint->shouldRetry($attempt)) {
            // Échec définitif
            $delivery->update(['next_retry_at' => null]);

            Log::error('Webhook définitivement échoué après max tentatives', [
                'delivery_id' => $delivery->delivery_id,
                'endpoint_id' => $endpoint->id,
                'url'         => $endpoint->url,
            ]);

            // Notifier l'admin si l'endpoint est désactivé automatiquement
            if ($endpoint->failure_count >= 10) {
                $this->notifyAdminEndpointDisabled($endpoint);
            }

            return;
        }

        // Calculer le délai du prochain retry
        $delaySeconds = self::RETRY_DELAYS[$attempt] ?? 7200;
        $nextRetryAt  = now()->addSeconds($delaySeconds);

        $delivery->update(['next_retry_at' => $nextRetryAt]);

        // Re-dispatcher après le délai
        static::dispatch($delivery->id)
            ->onQueue('webhooks')
            ->delay($nextRetryAt);

        Log::info('Webhook retry planifié', [
            'delivery_id'   => $delivery->delivery_id,
            'next_retry_at' => $nextRetryAt->toIso8601String(),
            'delay_seconds' => $delaySeconds,
        ]);
    }

    /**
     * Envoie un email à l'admin de l'organisation quand un endpoint est auto-désactivé.
     */
    private function notifyAdminEndpointDisabled(WebhookEndpoint $endpoint): void
    {
        try {
            $org        = $endpoint->organization;
            $adminEmail = $org?->admin_email ?? config('mail.from.address');

            Mail::raw(
                sprintf(
                    "Bonjour,\n\nL'endpoint webhook suivant a été automatiquement désactivé après 10 échecs consécutifs :\n\nURL : %s\nOrganisation : %s\n\nVeuillez vérifier la configuration de votre endpoint dans les Paramètres > Intégrations > Webhooks.\n\nL'équipe SECRETIS ERP",
                    $endpoint->url,
                    $org?->name ?? 'N/A'
                ),
                function ($message) use ($adminEmail, $endpoint) {
                    $message->to($adminEmail)
                        ->subject('[SECRETIS] Webhook désactivé : ' . $endpoint->url);
                }
            );
        } catch (\Exception $e) {
            Log::error('Échec envoi email admin webhook désactivé', ['error' => $e->getMessage()]);
        }
    }
}
