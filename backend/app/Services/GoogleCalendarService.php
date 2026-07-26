<?php

namespace App\Services;

use App\Models\Event;
use App\Models\User;
use Carbon\Carbon;
use Google\Client as GoogleClient;
use Google\Service\Calendar as GoogleCalendarApi;
use Google\Service\Calendar\Event as GoogleEvent;
use Google\Service\Calendar\EventDateTime;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * GoogleCalendarService — Synchronisation bidirectionnelle avec Google Calendar.
 *
 * Flux OAuth2 :
 *   1. getAuthUrl()      → redirige l'utilisateur vers Google
 *   2. handleCallback()  → échange le code contre des tokens, stocke chiffrés
 *   3. syncToGoogle()    → pousse un événement SECRETIS → Google
 *   4. syncFromGoogle()  → importe les événements Google → SECRETIS
 *
 * Politique de conflit : Google est prioritaire en cas de modification simultanée.
 */
class GoogleCalendarService
{
    private ?GoogleClient $client = null;

    public function __construct(){
        if (!class_exists(\Google\Client::class)) {
            // SDK Google absent : service inactif (sync calendrier désactivée)
            return;
        }

        $this->client = new GoogleClient();
        $this->client->setClientId(config('services.google.client_id'));
        $this->client->setClientSecret(config('services.google.client_secret'));
        $this->client->setRedirectUri(config('services.google.redirect'));
        $this->client->addScope(GoogleCalendarApi::CALENDAR_EVENTS);
        $this->client->addScope('https://www.googleapis.com/auth/userinfo.email');
        $this->client->setAccessType('offline');
        $this->client->setPrompt('consent');  // Toujours demander le refresh_token
    }

    // -------------------------------------------------------------------------
    // OAuth2
    // -------------------------------------------------------------------------

    /**
     * Génère l'URL d'autorisation Google OAuth2.
     * State encodé = userId pour sécurité CSRF.
     */
    public function getAuthUrl(int $userId): string
    {
        $state = base64_encode(json_encode([
            'user_id' => $userId,
            'nonce'   => bin2hex(random_bytes(16)),
        ]));

        $this->client->setState($state);

        return $this->client->createAuthUrl();
    }

    /**
     * Traite le callback OAuth2, échange le code et stocke les tokens.
     *
     * @throws \RuntimeException si l'échange échoue
     */
    public function handleCallback(string $code, int $userId): void
    {
        $tokenData = $this->client->fetchAccessTokenWithAuthCode($code);

        if (isset($tokenData['error'])) {
            throw new \RuntimeException(
                'Erreur OAuth Google : ' . ($tokenData['error_description'] ?? $tokenData['error'])
            );
        }

        $user = User::findOrFail($userId);

        $calendarId = $this->getPrimaryCalendarId($tokenData['access_token']);

        $user->update([
            'google_calendar_token'            => Crypt::encryptString($tokenData['access_token']),
            'google_calendar_refresh_token'    => isset($tokenData['refresh_token'])
                ? Crypt::encryptString($tokenData['refresh_token'])
                : $user->google_calendar_refresh_token,
            'google_calendar_token_expires_at' => Carbon::now()->addSeconds($tokenData['expires_in'] - 60),
            'google_calendar_id'               => $calendarId,
        ]);

        Log::info('Google Calendar connecté', ['user_id' => $userId, 'calendar_id' => $calendarId]);
    }

    /**
     * Révoque les tokens et supprime la liaison Google Calendar.
     */
    public function disconnect(User $user): void
    {
        try {
            if ($user->google_calendar_token) {
                $token = Crypt::decryptString($user->google_calendar_token);
                $this->client->revokeToken($token);
            }
        } catch (\Exception $e) {
            Log::warning('Révocation token Google échouée', ['user_id' => $user->id, 'error' => $e->getMessage()]);
        }

        $user->update([
            'google_calendar_token'            => null,
            'google_calendar_refresh_token'    => null,
            'google_calendar_token_expires_at' => null,
            'google_calendar_id'               => null,
        ]);
    }

    // -------------------------------------------------------------------------
    // Synchronisation SECRETIS → Google
    // -------------------------------------------------------------------------

    /**
     * Crée ou met à jour un événement SECRETIS dans Google Calendar.
     *
     * @return string Google Event ID
     * @throws \RuntimeException si l'utilisateur n'est pas connecté
     */
    public function syncToGoogle(Event $event): string
    {
        $user = $event->creator ?? User::find($event->creator_id);

        if (! $user || ! $user->google_calendar_token) {
            throw new \RuntimeException('Utilisateur non connecté à Google Calendar');
        }

        $this->refreshTokenIfNeeded($user);
        $this->setClientToken($user);

        $service    = new GoogleCalendarApi($this->client);
        $calendarId = $user->google_calendar_id ?? 'primary';

        $googleEvent = $this->buildGoogleEvent($event);

        // Mise à jour si déjà synchronisé, création sinon
        if ($event->google_event_id) {
            try {
                $result = $service->events->update($calendarId, $event->google_event_id, $googleEvent);
            } catch (\Google\Service\Exception $e) {
                if ($e->getCode() === 404) {
                    // L'événement n'existe plus côté Google : on recrée
                    $result = $service->events->insert($calendarId, $googleEvent);
                } else {
                    throw $e;
                }
            }
        } else {
            $result = $service->events->insert($calendarId, $googleEvent);
        }

        $googleEventId = $result->getId();

        // Stocker l'ID Google sur l'événement SECRETIS
        $event->updateQuietly(['google_event_id' => $googleEventId]);

        Log::info('Événement synchronisé vers Google', [
            'event_id'        => $event->id,
            'google_event_id' => $googleEventId,
        ]);

        return $googleEventId;
    }

    // -------------------------------------------------------------------------
    // Synchronisation Google → SECRETIS
    // -------------------------------------------------------------------------

    /**
     * Importe les événements Google Calendar dans SECRETIS.
     * Politique de conflit : Google prioritaire.
     *
     * @return array Liste des événements importés/mis à jour
     * @throws \RuntimeException
     */
    public function syncFromGoogle(int $userId): array
    {
        $user = User::findOrFail($userId);

        if (! $user->google_calendar_token) {
            throw new \RuntimeException('Utilisateur non connecté à Google Calendar');
        }

        $this->refreshTokenIfNeeded($user);
        $this->setClientToken($user);

        $service    = new GoogleCalendarApi($this->client);
        $calendarId = $user->google_calendar_id ?? 'primary';

        // Récupérer les événements des 30 prochains jours
        $params = [
            'timeMin'      => Carbon::now()->toRfc3339String(),
            'timeMax'      => Carbon::now()->addDays(30)->toRfc3339String(),
            'singleEvents' => true,
            'orderBy'      => 'startTime',
            'maxResults'   => 250,
        ];

        $googleEvents = $service->events->listEvents($calendarId, $params);
        $imported     = [];

        foreach ($googleEvents->getItems() as $gEvent) {
            try {
                $imported[] = $this->upsertFromGoogleEvent($gEvent, $user);
            } catch (\Exception $e) {
                Log::warning('Échec import événement Google', [
                    'google_event_id' => $gEvent->getId(),
                    'error'           => $e->getMessage(),
                ]);
            }
        }

        return array_filter($imported);
    }

    // -------------------------------------------------------------------------
    // Suppression
    // -------------------------------------------------------------------------

    /**
     * Supprime un événement de Google Calendar.
     */
    public function deleteFromGoogle(Event $event): void
    {
        if (! $event->google_event_id) {
            return;
        }

        $user = $event->creator ?? User::find($event->creator_id);

        if (! $user || ! $user->google_calendar_token) {
            return;
        }

        try {
            $this->refreshTokenIfNeeded($user);
            $this->setClientToken($user);

            $service    = new GoogleCalendarApi($this->client);
            $calendarId = $user->google_calendar_id ?? 'primary';

            $service->events->delete($calendarId, $event->google_event_id);

            $event->updateQuietly(['google_event_id' => null]);

            Log::info('Événement supprimé de Google Calendar', ['event_id' => $event->id]);
        } catch (\Google\Service\Exception $e) {
            if ($e->getCode() !== 404 && $e->getCode() !== 410) {
                Log::error('Erreur suppression Google Calendar', [
                    'event_id' => $event->id,
                    'error'    => $e->getMessage(),
                ]);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Refresh Token
    // -------------------------------------------------------------------------

    /**
     * Rafraîchit automatiquement le token d'accès s'il est expiré ou proche de l'expiration.
     */
    public function refreshTokenIfNeeded(User $user): void
    {
        if (! $user->google_calendar_refresh_token) {
            return;
        }

        $expiresAt = $user->google_calendar_token_expires_at;

        // Rafraîchir si expiré ou expirant dans moins de 5 minutes
        if ($expiresAt && Carbon::now()->lt($expiresAt->subMinutes(5))) {
            return;
        }

        try {
            $refreshToken = Crypt::decryptString($user->google_calendar_refresh_token);

            $this->client->refreshToken($refreshToken);
            $newToken = $this->client->getAccessToken();

            $user->update([
                'google_calendar_token'            => Crypt::encryptString($newToken['access_token']),
                'google_calendar_token_expires_at' => Carbon::now()->addSeconds($newToken['expires_in'] - 60),
            ]);

            Log::info('Token Google Calendar rafraîchi', ['user_id' => $user->id]);
        } catch (\Exception $e) {
            Log::error('Échec refresh token Google', [
                'user_id' => $user->id,
                'error'   => $e->getMessage(),
            ]);
            throw new \RuntimeException('Impossible de rafraîchir le token Google Calendar : ' . $e->getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    private function setClientToken(User $user): void
    {
        $token = Crypt::decryptString($user->google_calendar_token);
        $this->client->setAccessToken($token);
    }

    private function getPrimaryCalendarId(string $accessToken): string
    {
        $response = Http::withToken($accessToken)
            ->get('https://www.googleapis.com/calendar/v3/calendars/primary');

        if ($response->successful()) {
            return $response->json('id', 'primary');
        }

        return 'primary';
    }

    private function buildGoogleEvent(Event $event): GoogleEvent
    {
        $googleEvent = new GoogleEvent();
        $googleEvent->setSummary($event->title);
        $googleEvent->setDescription($event->description ?? '');
        $googleEvent->setLocation($event->location ?? '');

        $start = new EventDateTime();
        $end   = new EventDateTime();

        if ($event->is_all_day) {
            $start->setDate($event->start_at->toDateString());
            $end->setDate($event->end_at->toDateString());
        } else {
            $timezone = config('app.timezone', 'UTC');
            $start->setDateTime($event->start_at->toRfc3339String());
            $start->setTimeZone($timezone);
            $end->setDateTime($event->end_at->toRfc3339String());
            $end->setTimeZone($timezone);
        }

        $googleEvent->setStart($start);
        $googleEvent->setEnd($end);

        // Récurrence RRULE
        if ($event->recurrence_rule) {
            $googleEvent->setRecurrence(['RRULE:' . $event->recurrence_rule]);
        }

        // Lien de visio
        if ($event->meet_link) {
            $googleEvent->setHtmlLink($event->meet_link);
        }

        return $googleEvent;
    }

    /**
     * Crée ou met à jour un événement SECRETIS à partir d'un événement Google.
     * Google est prioritaire en cas de conflit.
     */
    private function upsertFromGoogleEvent(GoogleEvent $gEvent, User $user): ?array
    {
        if ($gEvent->getStatus() === 'cancelled') {
            // Supprimer localement si existe
            Event::where('google_event_id', $gEvent->getId())->delete();
            return null;
        }

        $startDateTime = $gEvent->getStart();
        $endDateTime   = $gEvent->getEnd();

        $isAllDay  = ! is_null($startDateTime->getDate());
        $startAt   = $isAllDay
            ? Carbon::parse($startDateTime->getDate())
            : Carbon::parse($startDateTime->getDateTime());
        $endAt     = $isAllDay
            ? Carbon::parse($endDateTime->getDate())
            : Carbon::parse($endDateTime->getDateTime());

        // Trouver le calendrier par défaut de l'utilisateur
        $calendar = $user->organization->calendars()->first();

        if (! $calendar) {
            return null;
        }

        $data = [
            'organization_id' => $user->organization_id,
            'calendar_id'     => $calendar->id,
            'creator_id'      => $user->id,
            'title'           => $gEvent->getSummary() ?? 'Sans titre',
            'description'     => $gEvent->getDescription(),
            'location'        => $gEvent->getLocation(),
            'start_at'        => $startAt,
            'end_at'          => $endAt,
            'is_all_day'      => $isAllDay,
            'type'            => 'event',
            'google_event_id' => $gEvent->getId(),
            'google_synced_at' => Carbon::now(),
        ];

        $event = Event::updateOrCreate(
            ['google_event_id' => $gEvent->getId()],
            $data
        );

        return $data;
    }
}
