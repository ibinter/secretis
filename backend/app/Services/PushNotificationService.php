<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Device;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * PushNotificationService — Notifications push mobiles via Expo Push API.
 *
 * Prend en charge iOS, Android et web (Expo SDK).
 * Chaque appareil enregistre son token Expo (Device.push_token).
 * Les tokens invalides sont automatiquement désactivés (DeviceNotRegistered).
 *
 * Référence : https://docs.expo.dev/push-notifications/sending-notifications/
 */
class PushNotificationService
{
    private const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    // ─────────────────────────────────────────────────────────────────────────
    // API publique
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Envoyer une notification à un utilisateur (tous ses appareils actifs).
     *
     * @param  User   $user  Destinataire
     * @param  string $type  Type de notification (event_reminder, task_assigned…)
     * @param  array  $data  Données contextuelles (titres, IDs, montants…)
     */
    public function sendToUser(User $user, string $type, array $data): void
    {
        // 1. Vérifier les préférences push de l'utilisateur
        if (!$this->userWantsPush($user, $type)) {
            return;
        }

        // 2. Récupérer les appareils actifs avec token valide
        $devices = Device::where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('push_token')
            ->get();

        if ($devices->isEmpty()) {
            return;
        }

        // 3. Construire les messages Expo
        $messages = $devices
            ->map(fn (Device $device) => $this->buildMessage($device, $type, $data))
            ->toArray();

        // 4. Envoyer par lots de 100 (limite Expo)
        collect($messages)
            ->chunk(100)
            ->each(fn ($batch) => $this->sendBatch($batch->toArray()));
    }

    /**
     * Envoyer une notification à tous les utilisateurs actifs d'une organisation.
     *
     * @param  int    $orgId  Identifiant de l'organisation
     * @param  string $type   Type de notification
     * @param  array  $data   Données contextuelles
     */
    public function sendToOrganization(int $orgId, string $type, array $data): void
    {
        User::where('organization_id', $orgId)
            ->where('is_active', true)
            ->chunk(100, function ($users) use ($type, $data): void {
                foreach ($users as $user) {
                    try {
                        $this->sendToUser($user, $type, $data);
                    } catch (\Throwable $e) {
                        Log::error('PushNotificationService: sendToOrganization error', [
                            'user_id' => $user->id,
                            'type'    => $type,
                            'error'   => $e->getMessage(),
                        ]);
                    }
                }
            });
    }

    /**
     * Diffusion globale — Annonce plateforme SuperAdmin vers TOUS les appareils actifs.
     *
     * @param  string $title  Titre de la notification
     * @param  string $body   Corps du message
     * @param  array  $data   Données supplémentaires (type, url, etc.)
     */
    public function sendBroadcast(string $title, string $body, array $data = []): void
    {
        Device::where('is_active', true)
            ->whereNotNull('push_token')
            ->chunk(100, function ($devices) use ($title, $body, $data): void {
                $messages = $devices->map(fn (Device $d) => [
                    'to'        => $d->push_token,
                    'title'     => $title,
                    'body'      => $body,
                    'data'      => array_merge($data, ['platform' => $d->platform]),
                    'sound'     => 'default',
                    'badge'     => 1,
                    'channelId' => 'system',
                    'priority'  => 'normal',
                ])->toArray();

                $this->sendBatch($messages);
            });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Construction du message
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Construit le payload Expo pour un appareil et un type de notification.
     */
    private function buildMessage(Device $device, string $type, array $data): array
    {
        $templates = [
            'event_reminder' => [
                'title' => '📅 Rappel : ' . ($data['event_title'] ?? 'Événement'),
                'body'  => 'Commence dans ' . ($data['minutes'] ?? '30') . ' min',
            ],
            'task_assigned' => [
                'title' => '✅ Nouvelle tâche assignée',
                'body'  => $data['task_title'] ?? 'Une tâche vous a été assignée',
            ],
            'visitor_arrived' => [
                'title' => '🧑 Visiteur arrivé',
                'body'  => ($data['visitor_name'] ?? 'Un visiteur') . " vous attend à l'accueil",
            ],
            'document_validated' => [
                'title' => '📄 Document validé',
                'body'  => $data['document_name'] ?? 'Un document a été validé',
            ],
            'message_received' => [
                'title' => '💬 Nouveau message',
                'body'  => $data['sender_name'] ?? 'Vous avez un nouveau message',
            ],
            'license_expiring' => [
                'title' => '⚠️ Abonnement bientôt expiré',
                'body'  => 'Votre abonnement expire dans ' . ($data['days'] ?? 7) . ' jours',
            ],
            'payment_received' => [
                'title' => '✅ Paiement confirmé',
                'body'  => 'Votre paiement de ' . ($data['amount'] ?? '') . ' a été confirmé',
            ],
            'system_announcement' => [
                'title' => $data['announcement_title'] ?? '📢 Annonce SECRETIS',
                'body'  => $data['announcement_body'] ?? '',
            ],
        ];

        $template = $templates[$type] ?? [
            'title' => 'SECRETIS',
            'body'  => $data['message'] ?? '',
        ];

        return [
            'to'        => $device->push_token,
            'title'     => $template['title'],
            'body'      => $template['body'],
            'data'      => array_merge($data, [
                'type'     => $type,
                'platform' => $device->platform,
            ]),
            'sound'     => 'default',
            'badge'     => 1,
            'channelId' => $this->getChannelId($type),  // Canal Android
            'priority'  => $this->getPriority($type),
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Envoi HTTP vers Expo
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Envoie un lot de messages à l'API Expo Push et traite les erreurs de token.
     *
     * @param  array $messages  Tableau de payloads Expo (max 100)
     * @return array            Résultats renvoyés par Expo
     */
    private function sendBatch(array $messages): array
    {
        try {
            $response = Http::withHeaders(['Accept-Encoding' => 'gzip'])
                ->timeout(30)
                ->retry(3, 1000)
                ->post(self::EXPO_PUSH_URL, $messages);

            if ($response->failed()) {
                Log::error('Expo Push API — requête échouée', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return [];
            }

            $results = $response->json('data') ?? [];

            // Désactiver les appareils dont le token est invalide
            foreach ($results as $i => $result) {
                if (($result['status'] ?? '') === 'error') {
                    $details = $result['details'] ?? [];
                    if (($details['error'] ?? '') === 'DeviceNotRegistered') {
                        $token = $messages[$i]['to'] ?? null;
                        if ($token) {
                            Device::where('push_token', $token)
                                ->update(['is_active' => false]);

                            Log::info('Expo Push — token invalide désactivé', [
                                'token_prefix' => substr($token, 0, 20) . '…',
                            ]);
                        }
                    }
                }
            }

            return $results;

        } catch (\Throwable $e) {
            Log::error('PushNotificationService: sendBatch exception', [
                'error' => $e->getMessage(),
                'count' => count($messages),
            ]);
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retourne l'identifiant du canal Android selon le type de notification.
     * Les canaux doivent être déclarés dans l'app Expo (app.json → notifications).
     */
    private function getChannelId(string $type): string
    {
        return match (true) {
            in_array($type, ['visitor_arrived', 'message_received'])    => 'urgent',
            in_array($type, ['license_expiring', 'system_announcement']) => 'system',
            default                                                       => 'default',
        };
    }

    /**
     * Retourne la priorité d'envoi Expo selon le type de notification.
     * 'high' = FCM/APNs high priority (réveil de l'écran possible).
     */
    private function getPriority(string $type): string
    {
        return in_array($type, ['visitor_arrived', 'message_received']) ? 'high' : 'normal';
    }

    /**
     * Vérifie si l'utilisateur a activé les push pour ce type de notification.
     * Priorité : préférence spécifique > préférence globale push > true par défaut.
     */
    private function userWantsPush(User $user, string $type): bool
    {
        $specific = $user->getPreference("notifications.{$type}.push");
        if ($specific !== null) {
            return (bool) $specific;
        }

        return (bool) $user->getPreference('notifications.push_enabled', true);
    }
}
