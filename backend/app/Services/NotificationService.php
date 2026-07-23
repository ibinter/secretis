<?php

namespace App\Services;

use App\Events\NotificationCreated;
use App\Jobs\SendPushNotificationJob;
use App\Models\AppNotification;
use App\Models\Device;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * NotificationService — Gestionnaire multi-canal de notifications
 *
 * Orchestre l'envoi de notifications via plusieurs canaux :
 *  - App    : Notification temps réel via Laravel Reverb (WebSocket)
 *  - Email  : SMTP via Laravel Mail (templates Blade)
 *  - SMS    : API SMS (Orange, Twilio, ou autre selon config)
 *  - WhatsApp : API WhatsApp Business (via Twilio ou 360dialog)
 *
 * Toutes les erreurs sont capturées et loggées sans propager d'exception
 * pour ne jamais bloquer les opérations métier.
 *
 * Les préférences utilisateur (canaux activés/désactivés) sont respectées.
 */
class NotificationService
{
    // -------------------------------------------------------------------------
    // send() — Notifier un utilisateur unique
    // -------------------------------------------------------------------------

    /**
     * Envoie une notification à un utilisateur via les canaux qu'il a activés.
     *
     * @param  User   $user    Destinataire
     * @param  string $type    Type de notification (message, task_assigned, circular, visitor…)
     * @param  string $title   Titre court de la notification
     * @param  string $body    Corps du message
     * @param  array  $data    Données contextuelles (IDs de ressources, liens, etc.)
     */
    public function send(
        User   $user,
        string $type,
        string $title,
        string $body,
        array  $data = [],
    ): void {
        // 1. Toujours créer la notification en base (canal "app")
        $notification = $this->createDbNotification($user, $type, $title, $body, $data);

        // 2. Broadcast Reverb si l'utilisateur est connecté
        $this->broadcastToUser($notification, $user);

        // 3. Email — si l'utilisateur a activé les emails de notifications
        if ($this->userWantsEmail($user, $type)) {
            $this->sendEmail($user, 'notifications.generic', [
                'title'    => $title,
                'body'     => $body,
                'type'     => $type,
                'data'     => $data,
                'userName' => $user->name,
            ]);
        }

        // 4. SMS — si configuré et activé pour ce type
        if ($this->userWantsSms($user, $type) && $user->phone) {
            $this->sendSms($user->phone, "{$title}\n{$body}");
        }

        // 5. Push notification mobile (Expo) — si l'utilisateur possède un appareil actif
        $hasDevice = Device::where('user_id', $user->id)
            ->where('is_active', true)
            ->whereNotNull('push_token')
            ->exists();

        if ($hasDevice) {
            dispatch(new SendPushNotificationJob($user, $type, array_merge($data, [
                'title' => $title,
                'body'  => $body,
            ])));
        }
    }

    // -------------------------------------------------------------------------
    // sendToOrganization() — Notifier toute une organisation
    // -------------------------------------------------------------------------

    /**
     * Diffuse une notification à tous les utilisateurs actifs d'une organisation.
     * Utilise un chunk pour éviter les pics mémoire sur les grandes organisations.
     *
     * @param  Organization $org   Organisation cible
     * @param  string       $type  Type de notification
     * @param  string       $title Titre
     * @param  string       $body  Corps
     */
    public function sendToOrganization(
        Organization $org,
        string       $type,
        string       $title,
        string       $body,
    ): void {
        User::where('organization_id', $org->id)
            ->where('status', 'active')
            ->chunk(100, function ($users) use ($type, $title, $body) {
                foreach ($users as $user) {
                    try {
                        $this->send($user, $type, $title, $body);
                    } catch (\Throwable $e) {
                        Log::error('NotificationService: sendToOrganization error', [
                            'user_id' => $user->id,
                            'error'   => $e->getMessage(),
                        ]);
                    }
                }
            });
    }

    // -------------------------------------------------------------------------
    // sendEmail() — Email SMTP via Mail Facade
    // -------------------------------------------------------------------------

    /**
     * Envoie un email via SMTP avec un template Blade.
     * Le template doit se trouver dans resources/views/emails/{template}.blade.php
     *
     * @param  User   $user     Destinataire
     * @param  string $template Nom du template Blade (ex: 'notifications.generic')
     * @param  array  $data     Variables passées au template
     */
    public function sendEmail(User $user, string $template, array $data): void
    {
        try {
            Mail::send("emails.{$template}", $data, function ($message) use ($user, $data) {
                $message
                    ->to($user->email, $user->name)
                    ->subject($data['title'] ?? config('app.name') . ' — Notification')
                    ->replyTo(config('mail.from.address'), config('mail.from.name'));
            });
        } catch (\Throwable $e) {
            // Ne jamais lever d'exception — juste logger
            Log::channel('notifications')->error('Email notification failed', [
                'user_id'  => $user->id,
                'template' => $template,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // sendSms() — SMS via API configurable
    // -------------------------------------------------------------------------

    /**
     * Envoie un SMS via l'API configurée (Twilio, Orange SMS, CinetPay, etc.)
     * La configuration se fait dans config/secretis.php sous la clé 'sms'.
     *
     * @param  string $phone   Numéro de téléphone (format international E.164 : +225XXXXXXXXXX)
     * @param  string $message Corps du SMS (max 160 chars recommandé)
     */
    public function sendSms(string $phone, string $message): void
    {
        $driver = config('secretis.sms.driver', 'none');

        if ($driver === 'none') {
            Log::debug('SMS non configuré — notification ignorée', compact('phone', 'message'));
            return;
        }

        try {
            match ($driver) {
                'twilio'  => $this->sendViaTwilio($phone, $message),
                'orange'  => $this->sendViaOrangeSms($phone, $message),
                'cinetpay'=> $this->sendViaCinetPay($phone, $message),
                default   => Log::warning("Driver SMS inconnu : {$driver}"),
            };
        } catch (\Throwable $e) {
            Log::channel('notifications')->error('SMS notification failed', [
                'phone'  => substr($phone, 0, 6) . '****', // Masquer le numéro dans les logs
                'driver' => $driver,
                'error'  => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // sendWhatsApp() — WhatsApp Business API
    // -------------------------------------------------------------------------

    /**
     * Envoie un message WhatsApp via l'API Business.
     * Requiert une configuration dans config/secretis.php sous 'whatsapp'.
     *
     * @param  string $phone   Numéro WhatsApp (format international)
     * @param  string $message Corps du message
     * @param  array  $buttons Boutons d'action optionnels (Call-to-Action)
     */
    public function sendWhatsApp(string $phone, string $message, array $buttons = []): void
    {
        $apiUrl   = config('secretis.whatsapp.api_url');
        $apiToken = config('secretis.whatsapp.token');

        if (!$apiUrl || !$apiToken) {
            Log::debug('WhatsApp non configuré — notification ignorée');
            return;
        }

        try {
            $payload = [
                'messaging_product' => 'whatsapp',
                'to'                => ltrim($phone, '+'),
                'type'              => 'text',
                'text'              => ['body' => $message],
            ];

            if (!empty($buttons)) {
                $payload['type'] = 'interactive';
                $payload['interactive'] = [
                    'type' => 'button',
                    'body' => ['text' => $message],
                    'action' => ['buttons' => $buttons],
                ];
                unset($payload['text']);
            }

            Http::withToken($apiToken)
                ->timeout(10)
                ->post($apiUrl, $payload)
                ->throw(); // Lever une exception sur les codes d'erreur HTTP

        } catch (\Throwable $e) {
            Log::channel('notifications')->error('WhatsApp notification failed', [
                'phone' => substr($phone, 0, 6) . '****',
                'error' => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // markAsRead() — Marquer une notification comme lue
    // -------------------------------------------------------------------------

    public function markAsRead(int $notificationId, int $userId): void
    {
        AppNotification::where('id', $notificationId)
            ->where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function markAllAsRead(int $userId): int
    {
        return AppNotification::where('user_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Crée la notification dans la table app_notifications.
     */
    private function createDbNotification(
        User   $user,
        string $type,
        string $title,
        string $body,
        array  $data,
    ): AppNotification {
        return AppNotification::create([
            'user_id'         => $user->id,
            'organization_id' => $user->organization_id,
            'type'            => $type,
            'title'           => $title,
            'body'            => $body,
            'data'            => $data,
            'read_at'         => null,
        ]);
    }

    /**
     * Diffuse la notification via Reverb (WebSocket).
     */
    private function broadcastToUser(AppNotification $notification, User $user): void
    {
        try {
            broadcast(new NotificationCreated($notification, $user));
        } catch (\Throwable $e) {
            Log::channel('notifications')->warning('Reverb broadcast failed', [
                'user_id'         => $user->id,
                'notification_id' => $notification->id,
                'error'           => $e->getMessage(),
            ]);
        }
    }

    /**
     * Vérifie si l'utilisateur veut recevoir des emails pour ce type de notification.
     * Priorité : préférence utilisateur > paramètre organisation > valeur par défaut.
     */
    private function userWantsEmail(User $user, string $type): bool
    {
        $pref = $user->getPreference("notifications.{$type}.email");
        if ($pref !== null) {
            return (bool) $pref;
        }

        return $user->getPreference('notifications.email_enabled', true);
    }

    /**
     * Vérifie si l'utilisateur veut recevoir des SMS pour ce type de notification.
     */
    private function userWantsSms(User $user, string $type): bool
    {
        if (!config('secretis.sms.driver') || config('secretis.sms.driver') === 'none') {
            return false;
        }

        $pref = $user->getPreference("notifications.{$type}.sms");
        if ($pref !== null) {
            return (bool) $pref;
        }

        return $user->getPreference('notifications.sms_enabled', false);
    }

    // ─── Drivers SMS ────────────────────────────────────────────────────────

    private function sendViaTwilio(string $phone, string $message): void
    {
        Http::withBasicAuth(
            config('secretis.sms.twilio.account_sid'),
            config('secretis.sms.twilio.auth_token'),
        )
        ->post("https://api.twilio.com/2010-04-01/Accounts/" . config('secretis.sms.twilio.account_sid') . "/Messages.json", [
            'From' => config('secretis.sms.twilio.from'),
            'To'   => $phone,
            'Body' => $message,
        ])
        ->throw();
    }

    private function sendViaOrangeSms(string $phone, string $message): void
    {
        Http::withToken(config('secretis.sms.orange.token'))
            ->post(config('secretis.sms.orange.api_url'), [
                'outboundSMSMessageRequest' => [
                    'address'               => "tel:{$phone}",
                    'senderAddress'         => config('secretis.sms.orange.sender'),
                    'outboundSMSTextMessage'=> ['message' => $message],
                ],
            ])
            ->throw();
    }

    private function sendViaCinetPay(string $phone, string $message): void
    {
        Http::post(config('secretis.sms.cinetpay.api_url'), [
            'apikey'  => config('secretis.sms.cinetpay.api_key'),
            'to'      => $phone,
            'from'    => config('secretis.sms.cinetpay.sender_name', 'SECRETIS'),
            'message' => $message,
        ])->throw();
    }
}
