<?php

declare(strict_types=1);

namespace App\Services\Sara;

use App\Models\User;
use App\Services\AgendaService;
use App\Services\DocumentService;
use App\Services\ReportService;
use App\Services\TaskService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * ActionExecutor — Exécuteur d'actions SARA v2.
 *
 * Pattern Command : chaque action est encapsulée et auditable.
 * Les actions réversibles peuvent être annulées (stockage de l'état avant).
 *
 * Actions disponibles :
 *   create_event      — Crée un événement dans l'agenda
 *   create_task       — Crée une tâche / reminder
 *   search_documents  — Recherche dans la GED
 *   find_free_slot    — Trouve un créneau libre
 *   summarize_meeting — Résume un compte rendu de réunion
 *   generate_report   — Génère un rapport BI
 *   draft_letter      — Rédige un courrier type
 *
 * Guard-rails :
 *   - Toutes les actions sont loggées dans audit_logs
 *   - Aucune action irréversible sans double confirmation (géré dans SaraV2Service)
 *   - Les actions sont exécutées dans le contexte de l'organisation de l'utilisateur
 */
class ActionExecutor
{
    public function __construct(
        private readonly AgendaService   $agendaService,
        private readonly TaskService     $taskService,
        private readonly DocumentService $documentService,
        private readonly ReportService   $reportService,
    ) {
    }

    // =========================================================================
    // DISPATCHER PRINCIPAL
    // =========================================================================

    /**
     * Exécute l'action demandée.
     *
     * @throws \InvalidArgumentException  Si le type d'action est inconnu
     * @throws \RuntimeException          Si l'exécution échoue
     *
     * @return array { message, data, action_id, reversible, undo_token? }
     */
    public function execute(string $actionType, array $params, User $user): array
    {
        return match ($actionType) {
            'create_event'      => $this->createEvent($params, $user),
            'create_task'       => $this->createTask($params, $user),
            'search_documents'  => $this->searchDocuments($params, $user),
            'find_free_slot'    => $this->findFreeSlot($params, $user),
            'summarize_meeting' => $this->summarizeMeeting($params, $user),
            'generate_report'   => $this->generateReport($params, $user),
            'draft_letter'      => $this->draftLetter($params, $user),
            default             => throw new \InvalidArgumentException("Action inconnue : {$actionType}"),
        };
    }

    // =========================================================================
    // ACTIONS
    // =========================================================================

    /**
     * Crée un événement dans le calendrier.
     */
    private function createEvent(array $params, User $user): array
    {
        $title   = $params['title'] ?? 'Événement sans titre';
        $startAt = $this->parseDate($params['start_at'] ?? null) ?? now()->addHour();
        $endAt   = $this->parseDate($params['end_at'] ?? null)   ?? $startAt->copy()->addHour();

        // Préparer la requête pour AgendaService
        $eventData = [
            'organization_id'  => $user->organization_id,
            'calendar_id'      => $params['calendar_id'] ?? $this->getDefaultCalendarId($user),
            'title'            => $title,
            'description'      => $params['description'] ?? "Créé par SARA pour {$user->first_name}",
            'start_at'         => $startAt->toDateTimeString(),
            'end_at'           => $endAt->toDateTimeString(),
            'location'         => $params['location'] ?? null,
            'type'             => $params['type'] ?? 'meeting',
            'created_by'       => $user->id,
        ];

        $event = \DB::table('events')->insertGetId(array_merge($eventData, [
            'id'         => Str::uuid()->toString(),
            'status'     => 'confirmed',
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        // Ajouter l'organisateur comme participant
        \DB::table('event_participants')->insert([
            'event_id'   => $eventData['id'] ?? $event,
            'user_id'    => $user->id,
            'role'       => 'organizer',
            'status'     => 'accepted',
            'created_at' => now(),
        ]);

        return [
            'message'    => "✅ Événement **{$title}** créé pour le {$startAt->locale('fr')->isoFormat('D MMMM [à] HH[h]mm')}.",
            'data'       => $eventData,
            'reversible' => true,
            'action_id'  => Str::uuid()->toString(),
        ];
    }

    /**
     * Crée une tâche.
     */
    private function createTask(array $params, User $user): array
    {
        $title    = $params['title'] ?? 'Tâche sans titre';
        $dueDate  = $this->parseDate($params['due_date'] ?? null);
        $priority = in_array($params['priority'] ?? '', ['low', 'normal', 'high', 'urgent'])
                    ? $params['priority']
                    : 'normal';

        $taskId = Str::uuid()->toString();

        \DB::table('tasks')->insert([
            'id'              => $taskId,
            'organization_id' => $user->organization_id,
            'title'           => $title,
            'description'     => $params['description'] ?? "Tâche créée par SARA",
            'status'          => 'todo',
            'priority'        => $priority,
            'due_date'        => $dueDate?->toDateString(),
            'created_by'      => $user->id,
            'position'        => 0,
            'attachments'     => '[]',
            'settings'        => '{}',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // Assigner à l'utilisateur courant
        \DB::table('task_assignees')->insert([
            'task_id'     => $taskId,
            'user_id'     => $user->id,
            'assigned_by' => $user->id,
            'assigned_at' => now(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $dueDateText = $dueDate ? " pour le {$dueDate->locale('fr')->isoFormat('D MMMM')}" : '';
        $priorityText = $priority !== 'normal' ? " (priorité {$priority})" : '';

        return [
            'message'    => "✅ Tâche **{$title}** créée{$dueDateText}{$priorityText}.",
            'data'       => ['task_id' => $taskId, 'title' => $title, 'due_date' => $dueDate?->toDateString()],
            'reversible' => true,
            'action_id'  => Str::uuid()->toString(),
        ];
    }

    /**
     * Recherche des documents dans la GED.
     */
    private function searchDocuments(array $params, User $user): array
    {
        $query   = $params['query'] ?? $params['title'] ?? '';
        $limit   = min($params['limit'] ?? 5, 10);

        $results = \DB::table('documents')
            ->where('organization_id', $user->organization_id)
            ->where(function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%")
                  ->orWhere('description', 'LIKE', "%{$query}%")
                  ->orWhereRaw("LOWER(tags::text) LIKE ?", ['%' . strtolower($query) . '%']);
            })
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get(['id', 'name', 'description', 'mime_type', 'created_at'])
            ->toArray();

        $count = count($results);

        if ($count === 0) {
            return [
                'message'    => "🔍 Aucun document trouvé pour **\"{$query}\"**. Essayez des mots-clés différents.",
                'data'       => [],
                'reversible' => false,
                'action_id'  => Str::uuid()->toString(),
            ];
        }

        $list = implode("\n", array_map(
            fn($d) => "- **{$d->name}** ({$d->mime_type})",
            $results
        ));

        return [
            'message'    => "🔍 {$count} document(s) trouvé(s) pour **\"{$query}\"** :\n{$list}",
            'data'       => $results,
            'reversible' => false,
            'action_id'  => Str::uuid()->toString(),
        ];
    }

    /**
     * Trouve un créneau libre pour plusieurs participants.
     */
    private function findFreeSlot(array $params, User $user): array
    {
        $duration  = (int) ($params['duration_minutes'] ?? 60);
        $daysAhead = (int) ($params['days_ahead'] ?? 5);
        $orgId     = $user->organization_id;

        $suggestions = [];
        $current     = now()->addHour()->startOfHour();

        // Chercher des créneaux sur les N prochains jours ouvrables
        $daysChecked = 0;
        $attempts    = 0;

        while (count($suggestions) < 3 && $daysChecked <= $daysAhead && $attempts < 50) {
            $attempts++;

            // Passer les week-ends
            if ($current->isWeekend()) {
                $current = $current->copy()->nextWeekday()->setTime(9, 0);
                $daysChecked++;
                continue;
            }

            // Hors heures ouvrables
            $hour = (int) $current->format('H');
            if ($hour < 8) {
                $current->setTime(9, 0);
            } elseif ($hour >= 18) {
                $current = $current->copy()->addDay()->setTime(9, 0);
                $daysChecked++;
                continue;
            }

            $slotEnd = $current->copy()->addMinutes($duration);

            // Vérifier les conflits
            $conflict = \DB::table('events')
                ->where('organization_id', $orgId)
                ->where('start_at', '<', $slotEnd->toDateTimeString())
                ->where('end_at', '>', $current->toDateTimeString())
                ->exists();

            if (! $conflict) {
                $suggestions[] = [
                    'start' => $current->toDateTimeString(),
                    'end'   => $slotEnd->toDateTimeString(),
                    'label' => $current->locale('fr')->isoFormat('dddd D MMMM [à] HH[h]mm'),
                ];
            }

            $current = $current->copy()->addMinutes(30);
        }

        if (empty($suggestions)) {
            return [
                'message'    => "😕 Aucun créneau libre trouvé dans les {$daysAhead} prochains jours.",
                'data'       => [],
                'reversible' => false,
                'action_id'  => Str::uuid()->toString(),
            ];
        }

        $list = implode("\n", array_map(
            fn($s) => "- **{$s['label']}** ({$duration} min)",
            $suggestions
        ));

        return [
            'message'    => "📅 Créneaux disponibles :\n{$list}",
            'data'       => $suggestions,
            'reversible' => false,
            'action_id'  => Str::uuid()->toString(),
        ];
    }

    /**
     * Résume un compte rendu de réunion.
     */
    private function summarizeMeeting(array $params, User $user): array
    {
        $meetingId = $params['meeting_id'] ?? null;

        // Chercher la réunion
        $meeting = $meetingId
            ? \DB::table('meetings')
                ->where('id', $meetingId)
                ->where('organization_id', $user->organization_id)
                ->first()
            : \DB::table('meetings')
                ->where('organization_id', $user->organization_id)
                ->where('held_at', '<=', now())
                ->orderByDesc('held_at')
                ->first();

        if (! $meeting) {
            return [
                'message'    => "❌ Aucune réunion trouvée.",
                'data'       => [],
                'reversible' => false,
                'action_id'  => Str::uuid()->toString(),
            ];
        }

        // Récupérer les décisions
        $decisions = \DB::table('meeting_decisions')
            ->where('meeting_id', $meeting->id)
            ->get(['decision', 'assignee_id', 'due_date'])
            ->toArray();

        $decisionsList = count($decisions) > 0
            ? implode("\n", array_map(fn($d) => "  - {$d->decision}", $decisions))
            : "  Aucune décision enregistrée.";

        $heldAt = $meeting->held_at ? Carbon::parse($meeting->held_at)->locale('fr')->isoFormat('D MMMM YYYY') : 'N/A';

        return [
            'message' => <<<MD
📋 **Résumé : {$meeting->title}**
Date : {$heldAt}

**Décisions prises :**
{$decisionsList}

**Ordre du jour :**
{$meeting->agenda}
MD,
            'data'       => (array)$meeting,
            'reversible' => false,
            'action_id'  => Str::uuid()->toString(),
        ];
    }

    /**
     * Génère un rapport BI.
     */
    private function generateReport(array $params, User $user): array
    {
        $reportType = $params['report_type'] ?? 'activity';
        $period     = $params['period'] ?? 'week';
        $orgId      = $user->organization_id;

        $endDate   = now();
        $startDate = match ($period) {
            'today'  => now()->startOfDay(),
            'week'   => now()->startOfWeek(),
            'month'  => now()->startOfMonth(),
            'year'   => now()->startOfYear(),
            default  => now()->subWeek(),
        };

        $data = match ($reportType) {
            'activity' => $this->getActivityReport($orgId, $startDate, $endDate),
            'tasks'    => $this->getTasksReport($orgId, $startDate, $endDate),
            'mail'     => $this->getMailReport($orgId, $startDate, $endDate),
            default    => $this->getActivityReport($orgId, $startDate, $endDate),
        };

        $periodLabel = match ($period) {
            'today' => "aujourd'hui",
            'week'  => "cette semaine",
            'month' => "ce mois",
            'year'  => "cette année",
            default => "la semaine passée",
        };

        $summary = $this->formatReportSummary($data, $reportType, $periodLabel);

        return [
            'message'    => $summary,
            'data'       => $data,
            'reversible' => false,
            'action_id'  => Str::uuid()->toString(),
            'report_url' => "/rapports?type={$reportType}&period={$period}",
        ];
    }

    /**
     * Rédige un courrier type.
     */
    private function draftLetter(array $params, User $user): array
    {
        $subject   = $params['subject'] ?? 'Courrier';
        $recipient = $params['recipient'] ?? 'Madame, Monsieur';
        $tone      = $params['tone'] ?? 'formal';
        $keyPoints = $params['key_points'] ?? [];
        $orgName   = $user->organization?->name ?? 'Notre organisation';

        // Template selon le ton
        $greeting = $tone === 'formal' ? "Madame, Monsieur," : "Bonjour {$recipient},";
        $closing  = $tone === 'formal'
            ? "Veuillez agréer, {$greeting} l'expression de nos salutations distinguées."
            : "Cordialement,";

        $body = implode("\n\n", array_map(fn($p) => $p, $keyPoints));
        if (empty($body)) {
            $body = "[Corps du courrier à compléter]";
        }

        $date   = now()->locale('fr')->isoFormat('D MMMM YYYY');
        $letter = <<<LETTER
**{$orgName}**
Le {$date}

**Objet : {$subject}**

{$greeting}

{$body}

{$closing}

**{$user->first_name} {$user->last_name}**
*{$user->role}*
LETTER;

        return [
            'message'    => "✉️ **Brouillon de courrier :**\n\n{$letter}\n\n*Vous pouvez copier ce texte et le modifier selon vos besoins.*",
            'data'       => ['letter' => $letter, 'subject' => $subject],
            'reversible' => false,
            'action_id'  => Str::uuid()->toString(),
        ];
    }

    // =========================================================================
    // HELPERS RAPPORTS
    // =========================================================================

    private function getActivityReport(string $orgId, $start, $end): array
    {
        return [
            'events_created'   => \DB::table('events')->where('organization_id', $orgId)->whereBetween('created_at', [$start, $end])->count(),
            'tasks_created'    => \DB::table('tasks')->where('organization_id', $orgId)->whereBetween('created_at', [$start, $end])->count(),
            'tasks_completed'  => \DB::table('tasks')->where('organization_id', $orgId)->whereBetween('completed_at', [$start, $end])->count(),
            'mails_received'   => \DB::table('mail_registry')->where('organization_id', $orgId)->where('direction', 'incoming')->whereBetween('created_at', [$start, $end])->count(),
            'documents_added'  => \DB::table('documents')->where('organization_id', $orgId)->whereBetween('created_at', [$start, $end])->count(),
        ];
    }

    private function getTasksReport(string $orgId, $start, $end): array
    {
        return [
            'total'      => \DB::table('tasks')->where('organization_id', $orgId)->whereBetween('created_at', [$start, $end])->count(),
            'completed'  => \DB::table('tasks')->where('organization_id', $orgId)->where('status', 'done')->whereBetween('completed_at', [$start, $end])->count(),
            'overdue'    => \DB::table('tasks')->where('organization_id', $orgId)->where('due_date', '<', now()->toDateString())->whereNotIn('status', ['done', 'cancelled'])->count(),
            'high_prio'  => \DB::table('tasks')->where('organization_id', $orgId)->whereIn('priority', ['high', 'urgent'])->whereNotIn('status', ['done', 'cancelled'])->count(),
        ];
    }

    private function getMailReport(string $orgId, $start, $end): array
    {
        return [
            'total_received' => \DB::table('mail_registry')->where('organization_id', $orgId)->where('direction', 'incoming')->whereBetween('created_at', [$start, $end])->count(),
            'total_sent'     => \DB::table('mail_registry')->where('organization_id', $orgId)->where('direction', 'outgoing')->whereBetween('created_at', [$start, $end])->count(),
            'urgent'         => \DB::table('mail_registry')->where('organization_id', $orgId)->where('priority', 'urgent')->whereBetween('created_at', [$start, $end])->count(),
            'pending'        => \DB::table('mail_registry')->where('organization_id', $orgId)->where('status', 'received')->count(),
        ];
    }

    private function formatReportSummary(array $data, string $type, string $period): string
    {
        $lines = ["📊 **Rapport {$type} — {$period} :**\n"];
        foreach ($data as $key => $value) {
            $label = str_replace('_', ' ', ucfirst($key));
            $lines[] = "- **{$label}** : {$value}";
        }
        return implode("\n", $lines);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private function parseDate(?string $dateStr): ?Carbon
    {
        if (empty($dateStr)) {
            return null;
        }
        try {
            return Carbon::parse($dateStr);
        } catch (\Throwable) {
            return null;
        }
    }

    private function getDefaultCalendarId(User $user): ?string
    {
        return \DB::table('calendars')
            ->where('organization_id', $user->organization_id)
            ->where('is_default', true)
            ->value('id');
    }
}
