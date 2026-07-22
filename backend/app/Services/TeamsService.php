<?php

namespace App\Services;

use App\Models\Meeting;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * TeamsService — Intégration Microsoft Teams via Graph API
 *
 * Gère :
 *  - Création/mise à jour/annulation de réunions Teams en ligne
 *  - Récupération des transcriptions de réunion
 *  - Envoi de messages dans les canaux Teams
 *  - Création de canaux Teams pour les projets SECRETIS
 *
 * Pré-requis :
 *  - Scope : OnlineMeetings.ReadWrite, Chat.ReadWrite, ChannelMessage.Send
 *  - Pour les transcriptions : OnlineMeetingTranscript.Read.All (Application permission)
 */
class TeamsService
{
    private const GRAPH_URL   = 'https://graph.microsoft.com/v1.0';
    private const MAX_RETRIES = 3;

    public function __construct(
        private readonly MicrosoftAuthService $authService
    ) {}

    // -------------------------------------------------------------------------
    // Réunions Teams en ligne
    // -------------------------------------------------------------------------

    /**
     * Crée une réunion Teams et retourne les détails de connexion.
     *
     * @param  Meeting $meeting  Réunion SECRETIS avec organizer chargé
     * @return array {
     *   id: string,
     *   joinUrl: string,
     *   joinWebUrl: string,
     *   videoTeleconferenceId: string,
     *   audioConferencing: { tollNumber, conferenceId }
     * }
     * @throws \RuntimeException Si l'organisateur n'a pas de compte Teams
     */
    public function createOnlineMeeting(Meeting $meeting): array
    {
        $organizer = $meeting->organizer ?? User::find($meeting->organizer_id);

        if (! $organizer?->microsoft_access_token) {
            throw new \RuntimeException(
                "L'organisateur de la réunion #{$meeting->id} n'a pas de compte Microsoft Teams connecté."
            );
        }

        $token = $this->authService->refreshTokenIfNeeded($organizer);

        $scheduledEnd = $meeting->scheduled_at->copy()->addMinutes($meeting->duration_minutes);

        $payload = [
            'startDateTime'        => $meeting->scheduled_at->toIso8601String(),
            'endDateTime'          => $scheduledEnd->toIso8601String(),
            'subject'              => $meeting->title,
            'lobbyBypassSettings'  => [
                'scope'                     => 'organization',
                'isDialInBypassEnabled'     => true,
            ],
            'allowedPresenters'    => 'organizer',
            'recordAutomatically'  => false,
            'participants'         => [
                'organizer' => [
                    'identity' => [
                        'user' => ['id' => $organizer->microsoft_id],
                    ],
                    'upn'  => $organizer->microsoft_email,
                    'role' => 'presenter',
                ],
            ],
        ];

        $response = $this->graphRequest('POST', '/me/onlineMeetings', $token, $payload);

        // Stocker le Teams meeting ID et le join URL dans la réunion SECRETIS
        $meeting->update([
            'online_meeting_url'      => $response['joinWebUrl'] ?? $response['joinUrl'] ?? null,
            'teams_meeting_id'        => $response['id'] ?? null,
        ]);

        Log::info('TeamsService: Réunion Teams créée', [
            'meeting_id'    => $meeting->id,
            'teams_id'      => $response['id'] ?? null,
            'join_url'      => $response['joinWebUrl'] ?? null,
        ]);

        return $response;
    }

    /**
     * Met à jour une réunion Teams existante (titre, dates).
     *
     * @param Meeting $meeting
     */
    public function updateOnlineMeeting(Meeting $meeting): void
    {
        if (! $meeting->teams_meeting_id) {
            // Pas encore de réunion Teams → créer
            $this->createOnlineMeeting($meeting);
            return;
        }

        $organizer = $meeting->organizer ?? User::find($meeting->organizer_id);
        if (! $organizer?->microsoft_access_token) {
            return;
        }

        $token        = $this->authService->refreshTokenIfNeeded($organizer);
        $scheduledEnd = $meeting->scheduled_at->copy()->addMinutes($meeting->duration_minutes);

        $this->graphRequest('PATCH', "/me/onlineMeetings/{$meeting->teams_meeting_id}", $token, [
            'subject'       => $meeting->title,
            'startDateTime' => $meeting->scheduled_at->toIso8601String(),
            'endDateTime'   => $scheduledEnd->toIso8601String(),
        ]);

        Log::info('TeamsService: Réunion Teams mise à jour', ['meeting_id' => $meeting->id]);
    }

    /**
     * Annule une réunion Teams (la supprime côté Microsoft).
     *
     * @param Meeting $meeting
     */
    public function cancelOnlineMeeting(Meeting $meeting): void
    {
        if (! $meeting->teams_meeting_id) {
            return;
        }

        $organizer = $meeting->organizer ?? User::find($meeting->organizer_id);
        if (! $organizer?->microsoft_access_token) {
            return;
        }

        try {
            $token = $this->authService->refreshTokenIfNeeded($organizer);
            $this->graphRequest('DELETE', "/me/onlineMeetings/{$meeting->teams_meeting_id}", $token);

            $meeting->update([
                'online_meeting_url' => null,
                'teams_meeting_id'   => null,
            ]);

            Log::info('TeamsService: Réunion Teams annulée', ['meeting_id' => $meeting->id]);
        } catch (\Throwable $e) {
            Log::error('TeamsService: Échec annulation réunion Teams', [
                'meeting_id' => $meeting->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Transcriptions
    // -------------------------------------------------------------------------

    /**
     * Récupère la transcription d'une réunion Teams si disponible.
     * La transcription est disponible uniquement après la fin de la réunion.
     *
     * Note : Nécessite la permission OnlineMeetingTranscript.Read.All (Application)
     *        ou que la transcription soit activée dans Teams Admin Center.
     *
     * @param  string $teamsMeetingId  ID de la réunion Teams (meeting->teams_meeting_id)
     * @param  User   $organizer       Organisateur de la réunion
     * @return string|null             Transcription en texte brut, ou null si non disponible
     */
    public function getTranscript(string $teamsMeetingId, User $organizer): ?string
    {
        if (! $organizer->microsoft_access_token) {
            return null;
        }

        try {
            $token = $this->authService->refreshTokenIfNeeded($organizer);

            // Lister les transcriptions disponibles pour la réunion
            $transcripts = $this->graphRequest(
                'GET',
                "/me/onlineMeetings/{$teamsMeetingId}/transcripts",
                $token
            );

            if (empty($transcripts['value'])) {
                return null; // Pas encore de transcription
            }

            // Prendre la transcription la plus récente
            $latestTranscript = end($transcripts['value']);
            $transcriptId     = $latestTranscript['id'];

            // Télécharger le contenu de la transcription (format VTT ou texte)
            $content = Http::withToken($token)
                ->timeout(30)
                ->withHeaders(['Accept' => 'text/vtt'])
                ->get(self::GRAPH_URL . "/me/onlineMeetings/{$teamsMeetingId}/transcripts/{$transcriptId}/content");

            if ($content->failed()) {
                return null;
            }

            // Convertir VTT en texte brut
            return $this->parseVttToText($content->body());
        } catch (\Throwable $e) {
            Log::warning('TeamsService: Impossible de récupérer la transcription', [
                'teams_meeting_id' => $teamsMeetingId,
                'error'            => $e->getMessage(),
            ]);
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // Messages Teams
    // -------------------------------------------------------------------------

    /**
     * Envoie un message dans un canal Teams.
     *
     * @param  string $channelId  ID du canal Teams (format: groupId/channels/channelId)
     * @param  string $message    Message en HTML ou texte
     * @param  User   $sender     Expéditeur (doit avoir le scope Chat.ReadWrite)
     */
    public function sendMessage(string $channelId, string $message, User $sender): void
    {
        if (! $sender->microsoft_access_token) {
            throw new \RuntimeException("L'utilisateur #{$sender->id} n'a pas de compte Teams connecté.");
        }

        $token = $this->authService->refreshTokenIfNeeded($sender);

        // channelId format attendu : "{teamId}/channels/{channelId}"
        [$teamId, $channelIdOnly] = $this->parseChannelId($channelId);

        $this->graphRequest('POST', "/teams/{$teamId}/channels/{$channelIdOnly}/messages", $token, [
            'body' => [
                'contentType' => 'html',
                'content'     => $message,
            ],
        ]);

        Log::info('TeamsService: Message envoyé', [
            'channel_id' => $channelId,
            'user_id'    => $sender->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // Canaux Teams
    // -------------------------------------------------------------------------

    /**
     * Crée un canal Teams pour un projet SECRETIS.
     *
     * @param  string $teamId     ID de l'équipe Teams (Microsoft 365 Group)
     * @param  string $name       Nom du canal
     * @param  string $description Description optionnelle
     * @param  User   $creator    Créateur (doit être membre de l'équipe)
     * @return string             ID du canal créé
     */
    public function createTeamsChannel(string $teamId, string $name, User $creator, string $description = ''): string
    {
        if (! $creator->microsoft_access_token) {
            throw new \RuntimeException("L'utilisateur #{$creator->id} n'a pas de compte Teams connecté.");
        }

        $token = $this->authService->refreshTokenIfNeeded($creator);

        $response = $this->graphRequest('POST', "/teams/{$teamId}/channels", $token, [
            'displayName' => $name,
            'description' => $description,
            'membershipType' => 'standard',
        ]);

        $channelId = $response['id'];

        Log::info('TeamsService: Canal Teams créé', [
            'team_id'    => $teamId,
            'channel_id' => $channelId,
            'name'       => $name,
        ]);

        return $channelId;
    }

    // -------------------------------------------------------------------------
    // Méthodes privées
    // -------------------------------------------------------------------------

    /**
     * Exécute une requête Microsoft Graph avec gestion du throttling (429).
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

            if ($response->successful()) {
                return $response->json() ?? [];
            }

            if ($response->status() === 204) {
                return [];
            }

            // Throttling
            if ($response->status() === 429) {
                $retryAfter = (int) ($response->header('Retry-After') ?? pow(2, $attempt));
                $retryAfter = min($retryAfter, 60);

                Log::warning('TeamsService: Throttling Graph API (429)', [
                    'endpoint'    => $endpoint,
                    'retry_after' => $retryAfter,
                    'attempt'     => $attempt,
                ]);

                if ($attempt < self::MAX_RETRIES) {
                    sleep($retryAfter);
                    continue;
                }
            }

            if ($response->status() === 404) {
                return [];
            }

            Log::error('TeamsService: Erreur Microsoft Graph', [
                'method'   => $method,
                'endpoint' => $endpoint,
                'status'   => $response->status(),
                'error'    => $response->json('error.message') ?? $response->body(),
            ]);

            throw new \RuntimeException(
                "Erreur Graph Teams ({$response->status()}) : "
                . ($response->json('error.message') ?? 'Erreur inconnue')
            );
        }

        throw new \RuntimeException("Graph Teams indisponible après " . self::MAX_RETRIES . " tentatives.");
    }

    /**
     * Parse un ID de canal au format "teamId/channels/channelId".
     *
     * @return array [teamId, channelId]
     */
    private function parseChannelId(string $channelId): array
    {
        // Si le format est déjà séparé par "/"
        $parts = explode('/channels/', $channelId);
        if (count($parts) === 2) {
            return [$parts[0], $parts[1]];
        }

        // Sinon, chercher dans les settings de l'organisation
        throw new \InvalidArgumentException("Format de channelId invalide : {$channelId}. Format attendu: teamId/channels/channelId");
    }

    /**
     * Convertit un fichier VTT (Web Video Text Tracks) en texte brut.
     * Supprime les timestamps et les métadonnées VTT.
     */
    private function parseVttToText(string $vtt): string
    {
        $lines  = explode("\n", $vtt);
        $text   = [];
        $inCue  = false;

        foreach ($lines as $line) {
            $line = trim($line);

            // Ignorer l'entête WEBVTT et les lignes vides
            if (empty($line) || $line === 'WEBVTT' || str_starts_with($line, 'NOTE')) {
                $inCue = false;
                continue;
            }

            // Ignorer les lignes de timestamp (format: 00:00:00.000 --> 00:00:00.000)
            if (preg_match('/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/', $line)) {
                $inCue = true;
                continue;
            }

            // Ignorer les identifiants de cue (nombre seul)
            if (preg_match('/^\d+$/', $line)) {
                continue;
            }

            if ($inCue) {
                // Supprimer les balises VTT (<v Speaker>, <c>, etc.)
                $clean = preg_replace('/<[^>]+>/', '', $line);
                $text[] = trim($clean);
            }
        }

        return implode(' ', array_filter($text));
    }
}
