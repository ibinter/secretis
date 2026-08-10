<?php

namespace App\Services;

use App\Models\Meeting;
use App\Models\Task;
use App\Models\User;
use App\Notifications\MeetingInvitationNotification;
use App\Services\TeamsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MeetingService
{
    // -------------------------------------------------------------------------
    // Création de réunion
    // -------------------------------------------------------------------------

    /**
     * Crée une réunion et invite automatiquement les participants par email.
     *
     * @param  array $data     Données validées depuis MeetingController::store()
     * @param  User  $organizer Utilisateur connecté (organisateur)
     * @return Meeting
     */
    public function createMeeting(array $data, User $organizer): Meeting
    {
        $meeting = Meeting::create([
            ...$data,
            'organization_id' => $organizer->organization_id,
            'organizer_id'    => $organizer->id,
            'status'          => 'planned',
            'agenda_items'    => $data['agenda_items'] ?? [],
            'decisions'       => [],
        ]);

        // Inviter les participants si fournis
        if (! empty($data['participant_ids'])) {
            $this->inviteParticipants($meeting, $data['participant_ids']);
        }

        // Créer automatiquement une réunion Teams si l'organisateur a Microsoft connecté
        $this->createTeamsMeetingIfEnabled($meeting, $organizer);

        return $meeting->load(['organizer', 'participants']);
    }

    // -------------------------------------------------------------------------
    // Intégration Teams — Création automatique
    // -------------------------------------------------------------------------

    /**
     * Crée automatiquement une réunion Teams si :
     *  1. L'organisateur a un compte Microsoft connecté
     *  2. L'option "teams_auto_create" est activée dans les settings de l'organisation
     *
     * Le joinUrl est stocké dans meetings.online_meeting_url.
     *
     * @param Meeting $meeting
     * @param User    $organizer
     */
    private function createTeamsMeetingIfEnabled(Meeting $meeting, User $organizer): void
    {
        // Vérifier si l'organisateur a un compte Microsoft connecté
        if (! $organizer->microsoft_access_token) {
            return;
        }

        // Vérifier si la création automatique Teams est activée pour l'organisation
        $teamsAutoCreate = $organizer->organization?->getSetting('integrations.teams.auto_create', false);
        if (! $teamsAutoCreate) {
            return;
        }

        try {
            /** @var TeamsService $teamsService */
            $teamsService = app(TeamsService::class);
            $teamsService->createOnlineMeeting($meeting);
        } catch (\Throwable $e) {
            // Ne pas bloquer la création de la réunion si Teams échoue
            Log::warning('MeetingService: Impossible de créer la réunion Teams', [
                'meeting_id' => $meeting->id,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Gestion des participants
    // -------------------------------------------------------------------------

    /**
     * Attache les participants et envoie les invitations email.
     *
     * @param  Meeting $meeting
     * @param  array   $userIds  Liste d'UUIDs d'utilisateurs
     */
    public function inviteParticipants(Meeting $meeting, array $userIds): void
    {
        $users = User::whereIn('id', $userIds)
                     ->where('organization_id', $meeting->organization_id)
                     ->get();

        foreach ($users as $user) {
            // Attacher au pivot (évite les doublons)
            $meeting->participants()->syncWithoutDetaching([
                $user->id => [
                    'role'              => 'attendee',
                    'invitation_status' => 'pending',
                    'invited_at'        => now(),
                ],
            ]);

            // Envoyer l'email d'invitation via Notification Laravel
            try {
                $user->notify(new MeetingInvitationNotification($meeting));
            } catch (\Throwable $e) {
                // On logue sans bloquer la création
                Log::error('MeetingService: échec envoi invitation', [
                    'meeting_id' => $meeting->id,
                    'user_id'    => $user->id,
                    'error'      => $e->getMessage(),
                ]);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Compte rendu
    // -------------------------------------------------------------------------

    /**
     * Sauvegarde le compte rendu et enregistre l'auteur.
     *
     * @param  Meeting $meeting
     * @param  string  $content  HTML depuis TipTap
     * @param  User    $user     Auteur de la saisie
     */
    public function saveMinutes(Meeting $meeting, string $content, User $user): void
    {
        $meeting->update([
            'minutes_content' => $content,
        ]);

        // Enregistrement dans l'historique d'audit
        app(AuditService::class)->log(
            organizationId: $meeting->organization_id,
            userId:         $user->id,
            action:         'meeting.minutes_saved',
            modelType:      Meeting::class,
            modelId:        $meeting->id,
            meta:           ['char_count' => mb_strlen($content)],
        );
    }

    // -------------------------------------------------------------------------
    // IA SARA — Extraction des décisions (Groq API)
    // -------------------------------------------------------------------------

    /**
     * Appelle l'API Groq (LLaMA-3-70B) pour extraire les décisions du compte rendu.
     *
     * L'IA analyse le texte du CR et retourne un tableau structuré de décisions
     * avec responsable, délai et priorité suggérée.
     *
     * @param  Meeting $meeting  Réunion avec minutes_content renseigné
     * @return array             Tableau de décisions [{ title, description, responsible, due_date, priority }]
     * @throws \RuntimeException Si l'API est indisponible ou le CR vide
     */
    public function extractDecisionsWithAI(Meeting $meeting): array
    {
        if (empty($meeting->minutes_content)) {
            throw new \RuntimeException('Le compte rendu est vide. Impossible d\'extraire les décisions.');
        }

        // Nettoyer le HTML pour n'envoyer que du texte brut à l'IA
        $plainText = strip_tags($meeting->minutes_content);

        // Prompt système SARA — agent spécialisé extraction de décisions
        $systemPrompt = <<<PROMPT
Tu es SARA, l'assistant IA de SECRETIS ERP. Tu analyses les comptes rendus de réunion
et extrais les décisions, actions et engagements de manière structurée.

Pour chaque décision identifiée, retourne un objet JSON avec :
- title       : intitulé court (max 100 caractères)
- description : détail de la décision
- responsible : nom ou rôle du responsable désigné (null si non précisé)
- due_date    : date limite au format YYYY-MM-DD (null si non précisée)
- priority    : low | normal | high | urgent (selon le contexte)

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour.
Exemple de format : [{"title":"...", "description":"...", "responsible":null, "due_date":null, "priority":"normal"}]
PROMPT;

        $userPrompt = "Voici le compte rendu de la réunion \"{$meeting->title}\" du "
                    . $meeting->scheduled_at->format('d/m/Y')
                    . " :\n\n{$plainText}";

        // Appel API Groq avec timeout de 30 secondes
        $response = Http::withToken(config('services.groq.api_key'))
            ->timeout(30)
            ->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'       => 'llama3-70b-8192',
                'messages'    => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user',   'content' => $userPrompt],
                ],
                'temperature' => 0.2,   // Faible pour maximiser la précision structurelle
                'max_tokens'  => 2048,
                'response_format' => ['type' => 'json_object'], // Force JSON mode si disponible
            ]);

        if ($response->failed()) {
            Log::error('MeetingService: Groq API error', [
                'status'     => $response->status(),
                'body'       => $response->body(),
                'meeting_id' => $meeting->id,
            ]);
            throw new \RuntimeException('Le service IA SARA est temporairement indisponible.');
        }

        $raw = $response->json('choices.0.message.content', '[]');

        // Parser la réponse JSON (l'IA peut retourner un objet ou un tableau)
        try {
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            // Si l'IA a retourné { "decisions": [...] } au lieu de [...]
            $decisions = isset($decoded['decisions']) ? $decoded['decisions'] : $decoded;
        } catch (\JsonException $e) {
            Log::warning('MeetingService: JSON parse error sur réponse Groq', [
                'raw'        => $raw,
                'meeting_id' => $meeting->id,
            ]);
            $decisions = [];
        }

        // Valider et nettoyer chaque décision
        $decisions = array_map(fn($d) => [
            'id'          => Str::uuid()->toString(),
            'title'       => $d['title']       ?? 'Décision sans titre',
            'description' => $d['description'] ?? '',
            'responsible' => $d['responsible'] ?? null,
            'due_date'    => $d['due_date']    ?? null,
            'priority'    => in_array($d['priority'] ?? '', ['low','normal','high','urgent'])
                             ? $d['priority'] : 'normal',
            'status'      => 'pending',         // Statut initial
            'task_id'     => null,              // Sera lié si converti en tâche
        ], $decisions);

        // Persister les décisions dans la réunion
        $meeting->update(['decisions' => $decisions]);

        return $decisions;
    }

    // -------------------------------------------------------------------------
    // Conversion décisions → tâches
    // -------------------------------------------------------------------------

    /**
     * Crée des tâches depuis les décisions extraites par l'IA.
     * Chaque décision devient une tâche liée à la réunion.
     *
     * @param  Meeting $meeting
     * @param  array   $decisions Tableau de décisions (peut être un sous-ensemble)
     */
    public function createTasksFromDecisions(Meeting $meeting, array $decisions): void
    {
        foreach ($decisions as $decision) {
            // Ne pas recréer si déjà converti
            if (! empty($decision['task_id'])) {
                continue;
            }

            $task = Task::create([
                'organization_id' => $meeting->organization_id,
                'meeting_id'      => $meeting->id,
                'project_id'      => null,
                'title'           => $decision['title'],
                'description'     => $decision['description'],
                'priority'        => $decision['priority'] ?? 'normal',
                'status'          => 'todo',
                'created_by'      => $meeting->organizer_id,
                'due_date'        => $decision['due_date'] ?? null,
            ]);

            // Mettre à jour le task_id dans la décision
            $decisions = array_map(function ($d) use ($decision, $task) {
                if ($d['id'] === $decision['id']) {
                    $d['task_id'] = $task->id;
                }
                return $d;
            }, $meeting->decisions ?? []);

            $meeting->update(['decisions' => $decisions]);
        }
    }

    // -------------------------------------------------------------------------
    // Génération du PDF du compte rendu
    // -------------------------------------------------------------------------

    /**
     * Génère un PDF du compte rendu et retourne son chemin de stockage.
     *
     * @param  Meeting $meeting
     * @return string  Chemin relatif dans le disque 'local'
     */
    public function generateMeetingSummaryPdf(Meeting $meeting): string
    {
        $meeting->load(['organizer', 'participants', 'president']);

        // Génération via barryvdh/laravel-dompdf
        $pdf = Pdf::pourOrganisation($meeting->organization_id)
        ->loadView('pdf.meeting-minutes', [
            'meeting'     => $meeting,
            'agendaItems' => $meeting->getSortedAgendaItems(),
            'decisions'   => $meeting->decisions ?? [],
        ])
        ->setPaper('A4', 'portrait')
        ->setOptions([
            'defaultFont' => 'DejaVu Sans',
            'isHtml5ParserEnabled' => true,
            'isRemoteEnabled'      => false,
        ]);

        // Stockage : storage/app/meetings/{org_id}/{meeting_id}/compte-rendu.pdf
        $path = "meetings/{$meeting->organization_id}/{$meeting->id}/compte-rendu.pdf";
        Storage::put($path, $pdf->output());

        // Mettre à jour le chemin dans la réunion
        $meeting->update(['minutes_pdf_path' => $path]);

        return $path;
    }
}
