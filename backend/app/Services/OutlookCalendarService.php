<?php

namespace App\Services;

use App\Models\Event;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * OutlookCalendarService — Synchronisation bidirectionnelle avec Outlook Calendar
 *
 * Utilise Microsoft Graph API v1.0 pour :
 *  - Pousser les événements SECRETIS vers Outlook
 *  - Importer les événements Outlook dans SECRETIS
 *  - Vérifier la disponibilité des participants (free/busy)
 *
 * Gestion des erreurs :
 *  - 429 Too Many Requests → Retry-After respecté (backoff exponentiel)
 *  - 401 Unauthorized → refresh automatique via MicrosoftAuthService
 *  - 404 Not Found → considéré comme suppression côté Outlook
 */
class OutlookCalendarService
{
    private const GRAPH_URL     = 'https://graph.microsoft.com/v1.0';
    private const MAX_RETRIES   = 3;

    public function __construct(
        private readonly MicrosoftAuthService $authService
    ) {}

    // -------------------------------------------------------------------------
    // Sync SECRETIS → Outlook
    // -------------------------------------------------------------------------

    /**
     * Crée ou met à jour un événement SECRETIS dans le calendrier Outlook
     * de l'organisateur.
     *
     * @param  Event $event  Événement SECRETIS avec organizer chargé
     * @return string        ID de l'événement Outlook (microsoft_event_id)
     * @throws \RuntimeException Si la sync échoue après les retries
     */
    public function syncEventToOutlook(Event $event): string
    {
        $organizer = $event->creator ?? User::find($event->created_by);

        if (! $organizer?->microsoft_access_token) {
            throw new \RuntimeException(
                "L'organisateur de l'événement #{$event->id} n'a pas de compte Microsoft connecté."
            );
        }

        $token       = $this->authService->refreshTokenIfNeeded($organizer);
        $graphEvent  = $this->convertToGraphEvent($event);
        $outlookId   = $event->microsoft_event_id ?? null;

        if ($outlookId) {
            // Mise à jour d'un événement existant
            $response = $this->graphRequest('PATCH', "/me/events/{$outlookId}", $token, $graphEvent);
        } else {
            // Création d'un nouvel événement
            $response = $this->graphRequest('POST', '/me/events', $token, $graphEvent);
            $outlookId = $response['id'];

            // Persister l'ID Outlook sur l'événement SECRETIS
            $event->update(['microsoft_event_id' => $outlookId]);
        }

        Log::info('OutlookCalendarService: Événement synchronisé vers Outlook', [
            'event_id'   => $event->id,
            'outlook_id' => $outlookId,
        ]);

        return $outlookId;
    }

    // -------------------------------------------------------------------------
    // Sync Outlook → SECRETIS
    // -------------------------------------------------------------------------

    /**
     * Importe les événements Outlook de l'utilisateur dans SECRETIS.
     * Synchronise les 30 derniers jours et les 60 prochains.
     *
     * @param  User  $user
     * @return array Tableau d'événements importés/mis à jour
     */
    public function syncFromOutlook(User $user): array
    {
        $token = $this->authService->refreshTokenIfNeeded($user);

        $startDate = now()->subDays(30)->toIso8601String();
        $endDate   = now()->addDays(60)->toIso8601String();

        // Récupérer les événements Outlook avec pagination
        $outlookEvents = $this->fetchOutlookEvents($token, $startDate, $endDate);

        $imported = [];

        foreach ($outlookEvents as $graphEvent) {
            try {
                $secretisData = $this->convertFromGraphEvent($graphEvent);

                // Chercher si l'événement existe déjà (par microsoft_event_id)
                $existing = Event::where('organization_id', $user->organization_id)
                    ->where('microsoft_event_id', $graphEvent['id'])
                    ->first();

                if ($existing) {
                    $existing->update($secretisData);
                    $imported[] = $existing;
                } else {
                    // Créer uniquement si l'événement n'est pas déjà géré par SECRETIS
                    if ($graphEvent['isOrganizer'] === false || ($graphEvent['organizer']['emailAddress']['address'] ?? '') !== $user->microsoft_email) {
                        $event = Event::create([
                            ...$secretisData,
                            'organization_id'    => $user->organization_id,
                            'created_by'         => $user->id,
                            'microsoft_event_id' => $graphEvent['id'],
                            'source'             => 'outlook',
                        ]);
                        $imported[] = $event;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('OutlookCalendarService: Impossible d\'importer un événement Outlook', [
                    'outlook_id' => $graphEvent['id'] ?? 'unknown',
                    'error'      => $e->getMessage(),
                ]);
            }
        }

        Log::info('OutlookCalendarService: Import Outlook terminé', [
            'user_id'   => $user->id,
            'imported'  => count($imported),
            'total_ms'  => count($outlookEvents),
        ]);

        return $imported;
    }

    // -------------------------------------------------------------------------
    // Suppression côté Outlook
    // -------------------------------------------------------------------------

    /**
     * Supprime un événement du calendrier Outlook de l'organisateur.
     *
     * @param Event $event
     */
    public function deleteFromOutlook(Event $event): void
    {
        if (! $event->microsoft_event_id) {
            return; // Pas encore synchronisé, rien à faire
        }

        $organizer = User::find($event->created_by);

        if (! $organizer?->microsoft_access_token) {
            Log::warning('OutlookCalendarService: Pas de token pour supprimer l\'événement Outlook', [
                'event_id' => $event->id,
            ]);
            return;
        }

        try {
            $token = $this->authService->refreshTokenIfNeeded($organizer);
            $this->graphRequest('DELETE', "/me/events/{$event->microsoft_event_id}", $token);
            $event->update(['microsoft_event_id' => null]);
        } catch (\Throwable $e) {
            Log::error('OutlookCalendarService: Échec suppression événement Outlook', [
                'event_id'   => $event->id,
                'outlook_id' => $event->microsoft_event_id,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Disponibilité — Free/Busy via getSchedule API
    // -------------------------------------------------------------------------

    /**
     * Récupère les créneaux disponibles d'un utilisateur pour une date donnée.
     * Utilise l'API getSchedule de Microsoft Graph.
     *
     * @param  User   $user  Utilisateur dont on consulte la disponibilité
     * @param  Carbon $date  Date pour laquelle vérifier la disponibilité
     * @return array         Tableau de créneaux { start, end, status: free|busy|tentative|oof }
     */
    public function getAvailableSlots(User $user, Carbon $date): array
    {
        if (! $user->microsoft_access_token || ! $user->microsoft_email) {
            return []; // Pas de compte Microsoft → on ne peut pas vérifier
        }

        $token = $this->authService->refreshTokenIfNeeded($user);

        $startOfDay = $date->copy()->startOfDay()->toIso8601String();
        $endOfDay   = $date->copy()->endOfDay()->toIso8601String();

        $response = $this->graphRequest('POST', '/me/calendar/getSchedule', $token, [
            'schedules'            => [$user->microsoft_email],
            'startTime'            => ['dateTime' => $startOfDay, 'timeZone' => 'UTC'],
            'endTime'              => ['dateTime' => $endOfDay,   'timeZone' => 'UTC'],
            'availabilityViewInterval' => 30, // Granularité : 30 minutes
        ]);

        $slots = [];

        foreach ($response['value'] ?? [] as $schedule) {
            foreach ($schedule['scheduleItems'] ?? [] as $item) {
                $slots[] = [
                    'start'  => Carbon::parse($item['start']['dateTime']),
                    'end'    => Carbon::parse($item['end']['dateTime']),
                    'status' => $item['status'], // free | busy | tentative | oof | workingElsewhere
                    'subject'=> $item['subject'] ?? null,
                ];
            }
        }

        return $slots;
    }

    /**
     * Récupère la disponibilité de plusieurs utilisateurs simultanément.
     * Utile pour l'AvailabilityPicker frontend.
     *
     * @param  array  $users  Liste d'utilisateurs SECRETIS avec Microsoft connecté
     * @param  Carbon $start  Début de la période
     * @param  Carbon $end    Fin de la période
     * @return array          { email => [slots] }
     */
    public function getBulkAvailability(array $users, Carbon $start, Carbon $end): array
    {
        $usersWithMs = array_filter($users, fn(User $u) => $u->microsoft_access_token && $u->microsoft_email);

        if (empty($usersWithMs)) {
            return [];
        }

        // On utilise le token du premier utilisateur connecté pour la requête groupée
        $caller = reset($usersWithMs);
        $token  = $this->authService->refreshTokenIfNeeded($caller);

        $emails = array_map(fn(User $u) => $u->microsoft_email, $usersWithMs);

        $response = $this->graphRequest('POST', '/me/calendar/getSchedule', $token, [
            'schedules'                => array_values($emails),
            'startTime'                => ['dateTime' => $start->toIso8601String(), 'timeZone' => 'UTC'],
            'endTime'                  => ['dateTime' => $end->toIso8601String(),   'timeZone' => 'UTC'],
            'availabilityViewInterval' => 30,
        ]);

        $result = [];

        foreach ($response['value'] ?? [] as $schedule) {
            $email = $schedule['scheduleId'];
            $result[$email] = [];

            foreach ($schedule['scheduleItems'] ?? [] as $item) {
                $result[$email][] = [
                    'start'  => $item['start']['dateTime'],
                    'end'    => $item['end']['dateTime'],
                    'status' => $item['status'],
                ];
            }
        }

        return $result;
    }

    // -------------------------------------------------------------------------
    // Conversion SECRETIS ↔ Microsoft Graph
    // -------------------------------------------------------------------------

    /**
     * Convertit un événement SECRETIS au format Microsoft Graph API.
     *
     * @param  Event $event
     * @return array         Payload compatible Graph API /me/events
     */
    public function convertToGraphEvent(Event $event): array
    {
        $graphEvent = [
            'subject'  => $event->title,
            'body'     => [
                'contentType' => 'HTML',
                'content'     => $event->description ?? '',
            ],
            'start' => [
                'dateTime' => Carbon::parse($event->start_at)->toIso8601String(),
                'timeZone' => 'UTC',
            ],
            'end' => [
                'dateTime' => Carbon::parse($event->end_at)->toIso8601String(),
                'timeZone' => 'UTC',
            ],
            'isAllDay'  => (bool) ($event->all_day ?? false),
            'location'  => [
                'displayName' => $event->location ?? '',
            ],
            'isReminderOn'      => true,
            'reminderMinutesBeforeStart' => 15,
        ];

        // Ajouter les participants si disponibles
        if ($event->relationLoaded('participants') && $event->participants->isNotEmpty()) {
            $graphEvent['attendees'] = $event->participants->map(fn(User $p) => [
                'emailAddress' => [
                    'address' => $p->microsoft_email ?? $p->email,
                    'name'    => $p->name,
                ],
                'type' => 'required',
            ])->values()->toArray();
        }

        // Catégorie SECRETIS pour identifier les événements créés par l'app
        $graphEvent['categories'] = ['SECRETIS ERP'];

        return $graphEvent;
    }

    /**
     * Convertit un événement Microsoft Graph au format SECRETIS.
     *
     * @param  array $graphEvent   Événement brut depuis l'API Graph
     * @return array               Données pour Event::create() / Event::update()
     */
    public function convertFromGraphEvent(array $graphEvent): array
    {
        $startRaw = $graphEvent['start']['dateTime'] ?? null;
        $endRaw   = $graphEvent['end']['dateTime']   ?? null;

        return [
            'title'       => $graphEvent['subject'] ?? 'Événement sans titre',
            'description' => strip_tags($graphEvent['body']['content'] ?? ''),
            'start_at'    => $startRaw ? Carbon::parse($startRaw)->toDateTimeString() : null,
            'end_at'      => $endRaw   ? Carbon::parse($endRaw)->toDateTimeString()   : null,
            'all_day'     => (bool) ($graphEvent['isAllDay'] ?? false),
            'location'    => $graphEvent['location']['displayName'] ?? null,
            'color'       => '#0078d4', // Bleu Microsoft
            'type'        => 'outlook_import',
        ];
    }

    // -------------------------------------------------------------------------
    // Méthodes privées — HTTP avec gestion throttling
    // -------------------------------------------------------------------------

    /**
     * Exécute une requête Microsoft Graph avec gestion du throttling (429)
     * et backoff exponentiel.
     *
     * @param  string      $method   GET, POST, PATCH, DELETE
     * @param  string      $endpoint Endpoint Graph (ex: /me/events)
     * @param  string      $token    Access token valide
     * @param  array|null  $body     Corps de la requête (JSON)
     * @return array                 Réponse JSON décodée
     * @throws \RuntimeException     Après MAX_RETRIES tentatives
     */
    private function graphRequest(string $method, string $endpoint, string $token, ?array $body = null): array
    {
        $url     = self::GRAPH_URL . $endpoint;
        $attempt = 0;

        while ($attempt < self::MAX_RETRIES) {
            $attempt++;

            $request = Http::withToken($token)
                ->timeout(20)
                ->withHeaders(['Accept' => 'application/json']);

            $response = match (strtoupper($method)) {
                'GET'    => $request->get($url),
                'POST'   => $request->post($url, $body ?? []),
                'PATCH'  => $request->patch($url, $body ?? []),
                'DELETE' => $request->delete($url),
                default  => throw new \InvalidArgumentException("Méthode HTTP non supportée : {$method}"),
            };

            // Succès
            if ($response->successful()) {
                return $response->json() ?? [];
            }

            // 204 No Content (suppression réussie)
            if ($response->status() === 204) {
                return [];
            }

            // 429 Too Many Requests — respecter le Retry-After
            if ($response->status() === 429) {
                $retryAfter = (int) ($response->header('Retry-After') ?? pow(2, $attempt));
                $retryAfter = min($retryAfter, 60); // Max 60 secondes d'attente

                Log::warning('OutlookCalendarService: Throttling Microsoft Graph (429)', [
                    'endpoint'    => $endpoint,
                    'retry_after' => $retryAfter,
                    'attempt'     => $attempt,
                ]);

                if ($attempt < self::MAX_RETRIES) {
                    sleep($retryAfter);
                    continue;
                }
            }

            // 404 — ressource introuvable (événement supprimé côté Outlook)
            if ($response->status() === 404) {
                return [];
            }

            // Erreur non récupérable
            Log::error('OutlookCalendarService: Erreur Microsoft Graph', [
                'method'   => $method,
                'endpoint' => $endpoint,
                'status'   => $response->status(),
                'error'    => $response->json('error.message') ?? $response->body(),
            ]);

            throw new \RuntimeException(
                "Erreur Microsoft Graph ({$response->status()}) : "
                . ($response->json('error.message') ?? 'Erreur inconnue')
            );
        }

        throw new \RuntimeException(
            "Impossible de contacter Microsoft Graph après " . self::MAX_RETRIES . " tentatives."
        );
    }

    /**
     * Récupère tous les événements Outlook avec pagination.
     *
     * @param  string $token
     * @param  string $startDate ISO 8601
     * @param  string $endDate   ISO 8601
     * @return array
     */
    private function fetchOutlookEvents(string $token, string $startDate, string $endDate): array
    {
        $events   = [];
        $endpoint = '/me/calendarView?' . http_build_query([
            'startDateTime' => $startDate,
            'endDateTime'   => $endDate,
            '$top'          => 100,
            '$select'       => 'id,subject,body,start,end,location,isAllDay,isOrganizer,organizer,categories',
            '$orderby'      => 'start/dateTime asc',
        ]);

        while ($endpoint) {
            $response = $this->graphRequest('GET', str_replace(self::GRAPH_URL, '', $endpoint), token: $token);
            $events   = array_merge($events, $response['value'] ?? []);

            // Pagination via @odata.nextLink
            $nextLink  = $response['@odata.nextLink'] ?? null;
            $endpoint  = $nextLink ? str_replace(self::GRAPH_URL, '', $nextLink) : null;
        }

        return $events;
    }
}
