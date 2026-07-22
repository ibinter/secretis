<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

/**
 * PushNotificationService — Notifications Web Push via VAPID (RFC 8292).
 *
 * Basé sur minishlink/web-push.
 * Configuration (.env) :
 *   VAPID_PUBLIC_KEY   → clé publique Base64URL (partagée avec le frontend)
 *   VAPID_PRIVATE_KEY  → clé privée Base64URL (secrète)
 *   VAPID_SUBJECT      → mailto: ou URL de l'application
 *
 * Pour générer les clés VAPID :
 *   php artisan webpush:vapid
 *
 * Stockage des abonnements :
 *   Table push_subscriptions (voir migration associée si besoin)
 *   Ou colonne JSON push_subscription sur users pour usage simple
 */
class PushNotificationService
{
    private WebPush $webPush;

    public function __construct()
    {
        $auth = [
            'VAPID' => [
                'subject'    => config('webpush.vapid.subject', 'mailto:' . config('mail.from.address')),
                'publicKey'  => config('webpush.vapid.public_key'),
                'privateKey' => config('webpush.vapid.private_key'),
            ],
        ];

        $this->webPush = new WebPush($auth, [
            'TTL'     => 86400,  // 24h
            'urgency' => 'normal',
        ]);
    }

    // -------------------------------------------------------------------------
    // Gestion des abonnements
    // -------------------------------------------------------------------------

    /**
     * Enregistre un abonnement Push pour un utilisateur.
     *
     * @param User  $user         Utilisateur
     * @param array $subscription {endpoint, keys: {p256dh, auth}}
     */
    public function subscribe(User $user, array $subscription): void
    {
        // Validation minimale de la structure
        if (empty($subscription['endpoint']) || empty($subscription['keys']['p256dh']) || empty($subscription['keys']['auth'])) {
            throw new \InvalidArgumentException('Structure d\'abonnement Push invalide.');
        }

        // Stocker l'abonnement en JSON sur l'utilisateur
        // Pour un usage multi-device, utiliser une table dédiée push_subscriptions
        $subscriptions = $user->push_subscriptions ?? [];

        // Déduplication par endpoint
        $subscriptions = array_filter(
            $subscriptions,
            fn($s) => ($s['endpoint'] ?? '') !== $subscription['endpoint']
        );

        $subscriptions[] = [
            'endpoint' => $subscription['endpoint'],
            'keys'     => [
                'p256dh' => $subscription['keys']['p256dh'],
                'auth'   => $subscription['keys']['auth'],
            ],
            'subscribed_at' => now()->toIso8601String(),
        ];

        $user->update(['push_subscriptions' => array_values($subscriptions)]);

        Log::info('Push subscription enregistrée', ['user_id' => $user->id]);
    }

    /**
     * Supprime l'abonnement Push d'un utilisateur (par endpoint).
     */
    public function unsubscribe(User $user, string $endpoint = null): void
    {
        if ($endpoint) {
            $subscriptions = array_filter(
                $user->push_subscriptions ?? [],
                fn($s) => ($s['endpoint'] ?? '') !== $endpoint
            );
            $user->update(['push_subscriptions' => array_values($subscriptions)]);
        } else {
            // Supprimer tous les abonnements
            $user->update(['push_subscriptions' => []]);
        }

        Log::info('Push subscription supprimée', ['user_id' => $user->id]);
    }

    // -------------------------------------------------------------------------
    // Envoi de notifications
    // -------------------------------------------------------------------------

    /**
     * Envoie une notification push à un utilisateur spécifique.
     *
     * @param User   $user    Destinataire
     * @param string $title   Titre de la notification
     * @param string $body    Corps de la notification
     * @param array  $options Options supplémentaires :
     *                        - icon : URL de l'icône
     *                        - badge : URL du badge
     *                        - url : URL de redirection au clic
     *                        - actions : [{action: string, title: string}]
     *                        - tag : identifiant pour regroupement/remplacement
     *                        - requireInteraction : bool
     */
    public function push(User $user, string $title, string $body, array $options = []): void
    {
        $subscriptions = $user->push_subscriptions ?? [];

        if (empty($subscriptions)) {
            return;
        }

        $payload = json_encode(array_merge([
            'title' => $title,
            'body'  => mb_substr($body, 0, 200),
            'icon'  => $options['icon']  ?? '/icons/icon-192x192.png',
            'badge' => $options['badge'] ?? '/icons/badge-72x72.png',
            'url'   => $options['url']   ?? '/',
            'tag'   => $options['tag']   ?? null,
            'requireInteraction' => $options['requireInteraction'] ?? false,
            'actions' => $options['actions'] ?? [],
            'data'    => $options['data']    ?? [],
        ], array_diff_key($options, array_flip(['icon', 'badge', 'url', 'tag', 'requireInteraction', 'actions', 'data']))));

        $failedEndpoints = [];

        foreach ($subscriptions as $subscriptionData) {
            try {
                $subscription = Subscription::create([
                    'endpoint'        => $subscriptionData['endpoint'],
                    'publicKey'       => $subscriptionData['keys']['p256dh'],
                    'authToken'       => $subscriptionData['keys']['auth'],
                    'contentEncoding' => 'aesgcm',
                ]);

                $this->webPush->queueNotification($subscription, $payload);
            } catch (\Exception $e) {
                Log::warning('Push : abonnement invalide', [
                    'user_id'  => $user->id,
                    'endpoint' => $subscriptionData['endpoint'] ?? 'unknown',
                    'error'    => $e->getMessage(),
                ]);
                $failedEndpoints[] = $subscriptionData['endpoint'] ?? null;
            }
        }

        // Flush et vérifier les résultats
        foreach ($this->webPush->flush() as $report) {
            if (! $report->isSuccess()) {
                $endpoint = $report->getRequest()->getUri()->__toString();

                Log::warning('Push notification échouée', [
                    'user_id'  => $user->id,
                    'endpoint' => $endpoint,
                    'reason'   => $report->getReason(),
                ]);

                // Supprimer l'abonnement expiré ou invalide
                if ($report->isSubscriptionExpired()) {
                    $this->removeSubscriptionByEndpoint($user, $endpoint);
                }
            }
        }
    }

    /**
     * Envoie une notification push à tous les utilisateurs d'une organisation.
     *
     * @param int    $orgId ID de l'organisation
     * @param string $title Titre
     * @param string $body  Corps
     * @param array  $options Options
     */
    public function pushToOrganization(int $orgId, string $title, string $body, array $options = []): void
    {
        // Traitement par batch pour éviter de charger tous les utilisateurs en mémoire
        User::where('organization_id', $orgId)
            ->where('status', 'active')
            ->whereNotNull('push_subscriptions')
            ->chunkById(50, function ($users) use ($title, $body, $options) {
                foreach ($users as $user) {
                    try {
                        $this->push($user, $title, $body, $options);
                    } catch (\Exception $e) {
                        Log::error('Push to org : erreur utilisateur', [
                            'user_id' => $user->id,
                            'error'   => $e->getMessage(),
                        ]);
                    }
                }
            });
    }

    // -------------------------------------------------------------------------
    // Clé publique VAPID
    // -------------------------------------------------------------------------

    /**
     * Retourne la clé publique VAPID à fournir au frontend.
     * Le frontend en a besoin pour appeler PushManager.subscribe().
     */
    public function getPublicVapidKey(): string
    {
        return config('webpush.vapid.public_key', '');
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    private function removeSubscriptionByEndpoint(User $user, string $endpoint): void
    {
        $subscriptions = array_filter(
            $user->push_subscriptions ?? [],
            fn($s) => ($s['endpoint'] ?? '') !== $endpoint
        );

        $user->update(['push_subscriptions' => array_values($subscriptions)]);
    }
}
