<?php

namespace App\Services;

use App\Models\Event;
use App\Models\Meeting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * SmartAgendaService — Extensions IA pour l'agenda SECRETIS
 *
 * Enrichit AgendaService avec des fonctionnalités intelligentes :
 *  - Suggestions de créneaux optimaux (analyse free/busy multi-participants)
 *  - Détection de patterns récurrents
 *  - Brief automatique avant les réunions
 *  - Détection de journées surchargées
 *
 * Toutes les analyses sont basées sur l'historique stocké en base,
 * sans dépendance à une API externe par défaut (Outlook optionnel).
 */
class SmartAgendaService
{
    // ─── Heures de travail standard ───────────────────────────────────────────
    private const WORK_START = 8;   // 8h00
    private const WORK_END   = 18;  // 18h00
    private const PEAK_HOURS = [9, 10, 11, 14, 15, 16]; // Heures préférées pour réunions

    // ─── Seuil de journée surchargée ──────────────────────────────────────────
    private const OVERLOADED_HOURS = 6; // >6h de réunions dans la journée

    // ─── Fenêtre d'analyse des patterns ───────────────────────────────────────
    private const PATTERN_ANALYSIS_WEEKS = 8;

    // =========================================================================
    // suggestMeetingTime() — Créneaux optimaux multi-participants
    // =========================================================================

    /**
     * Analyse les disponibilités de tous les participants et suggère les 3 meilleurs créneaux.
     *
     * Algorithme :
     *  1. Récupérer les événements de chaque participant sur ±7 jours autour de la date préférée
     *  2. Construire une grille de disponibilité (créneaux de 30 min)
     *  3. Scorer chaque créneau libre : heure de travail, heure de pointe, jour de semaine
     *  4. Retourner les 3 meilleurs créneaux triés par score
     *
     * @param  array  $participantIds IDs des participants SECRETIS
     * @param  int    $durationMin    Durée souhaitée en minutes
     * @param  Carbon $preferredDate  Date préférée (recherche ±3 jours)
     * @return array  Tableau de [{start, end, score, conflicts, label}]
     */
    public function suggestMeetingTime(
        array  $participantIds,
        int    $durationMin,
        Carbon $preferredDate
    ): array {
        // Fenêtre de recherche : ±3 jours ouvrables autour de la date préférée
        $searchStart = $preferredDate->copy()->startOfDay()->subDays(1);
        $searchEnd   = $preferredDate->copy()->endOfDay()->addDays(3);

        // Récupérer tous les événements des participants dans la fenêtre
        $busySlots = $this->getBusySlotsForParticipants($participantIds, $searchStart, $searchEnd);

        // Générer les créneaux candidats (intervalles de 30 min durant les heures de travail)
        $candidates = $this->generateCandidateSlots($searchStart, $searchEnd, $durationMin);

        // Filtrer les créneaux occupés et scorer les créneaux libres
        $scoredSlots = [];
        foreach ($candidates as $candidate) {
            $conflicts = $this->countConflicts($candidate['start'], $candidate['end'], $busySlots);

            if ($conflicts === 0) {
                $score = $this->scoreMeetingSlot($candidate['start'], $preferredDate, count($participantIds));
                $scoredSlots[] = [
                    'start'     => $candidate['start']->toIso8601String(),
                    'end'       => $candidate['end']->toIso8601String(),
                    'score'     => $score,
                    'conflicts' => 0,
                    'label'     => $this->formatSlotLabel($candidate['start'], $candidate['end']),
                    'day_label' => $this->getDayLabel($candidate['start'], $preferredDate),
                ];
            }
        }

        // Trier par score décroissant et retourner les 3 meilleurs
        usort($scoredSlots, fn($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($scoredSlots, 0, 3);
    }

    // =========================================================================
    // detectMeetingPatterns() — Détection de réunions récurrentes
    // =========================================================================

    /**
     * Analyse l'historique des événements pour détecter des patterns récurrents.
     *
     * Détecte les réunions qui se reproduisent régulièrement mais qui ne sont
     * pas encore définies comme récurrentes dans le système.
     *
     * @param  User  $user Utilisateur cible
     * @return array Tableau de patterns détectés [{title, day_of_week, hour, frequency, suggestion}]
     */
    public function detectMeetingPatterns(User $user): array
    {
        $since = Carbon::now()->subWeeks(self::PATTERN_ANALYSIS_WEEKS);

        // Récupérer les événements passés de l'utilisateur (non-récurrents uniquement)
        $events = Event::where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('participants', fn($q2) => $q2->where('user_id', $user->id));
            })
            ->where('start_at', '>=', $since)
            ->whereNull('recurrence_rule')
            ->with('participants:id,name')
            ->get();

        if ($events->isEmpty()) {
            return [];
        }

        // Regrouper par titre normalisé (minuscules, sans espaces supplémentaires)
        $grouped = $events->groupBy(fn($e) => $this->normalizeTitle($e->title));

        $patterns = [];
        foreach ($grouped as $normalizedTitle => $group) {
            if ($group->count() < 3) {
                continue; // Minimum 3 occurrences pour détecter un pattern
            }

            // Analyser la fréquence et le jour/heure récurrents
            $dayHourCounts = [];
            foreach ($group as $event) {
                $key = $event->start_at->format('l') . '_' . $event->start_at->hour;
                $dayHourCounts[$key] = ($dayHourCounts[$key] ?? 0) + 1;
            }

            // Trouver le jour/heure dominant
            arsort($dayHourCounts);
            $dominantKey   = array_key_first($dayHourCounts);
            $dominantCount = $dayHourCounts[$dominantKey];

            // Confidence : au moins 60% des occurrences sur le même créneau
            $confidence = $dominantCount / $group->count();
            if ($confidence < 0.6) {
                continue;
            }

            [$dayName, $hour] = explode('_', $dominantKey);

            // Estimer la fréquence (hebdomadaire ou bihebdomadaire)
            $weeksCovered = self::PATTERN_ANALYSIS_WEEKS;
            $frequency    = $group->count() >= ($weeksCovered * 0.8) ? 'weekly' : 'biweekly';

            $patterns[] = [
                'title'       => $group->first()->title,
                'day_of_week' => $dayName,
                'hour'        => (int) $hour,
                'frequency'   => $frequency,
                'occurrences' => $group->count(),
                'confidence'  => round($confidence * 100),
                'suggestion'  => "Créer une série récurrente « {$group->first()->title} » chaque {$this->translateDay($dayName)} à {$hour}h",
                'sample_event_id' => $group->first()->id,
            ];
        }

        // Trier par nombre d'occurrences décroissant
        usort($patterns, fn($a, $b) => $b['occurrences'] <=> $a['occurrences']);

        return array_slice($patterns, 0, 5); // Max 5 patterns suggérés
    }

    // =========================================================================
    // suggestDuration() — Durée suggérée basée sur l'historique
    // =========================================================================

    /**
     * Suggère la durée optimale pour une réunion basée sur l'historique.
     *
     * @param  string $title        Titre de la réunion
     * @param  array  $participants IDs des participants
     * @return int    Durée en minutes (default: 60)
     */
    public function suggestDuration(string $title, array $participants): int
    {
        $normalized = $this->normalizeTitle($title);

        // Rechercher des réunions similaires dans l'historique
        $similar = Event::where('title', 'LIKE', "%{$normalized}%")
            ->whereNotNull('end_at')
            ->whereRaw('TIMESTAMPDIFF(MINUTE, start_at, end_at) BETWEEN 15 AND 480')
            ->latest('start_at')
            ->limit(10)
            ->get();

        if ($similar->isEmpty()) {
            // Durée par défaut selon le nombre de participants
            return count($participants) > 5 ? 90 : 60;
        }

        // Calculer la durée médiane des réunions similaires
        $durations = $similar->map(fn($e) => $e->start_at->diffInMinutes($e->end_at))->sort()->values();
        $median    = $durations->get((int) ($durations->count() / 2), 60);

        // Arrondir au quart d'heure le plus proche
        return (int) (round($median / 15) * 15);
    }

    // =========================================================================
    // autoCategorizeEvent() — Catégorisation automatique
    // =========================================================================

    /**
     * Catégorise automatiquement un événement basé sur son titre et contexte.
     *
     * @param  Event $event Événement à catégoriser
     * @return string MEETING | TASK_REMINDER | EXTERNAL | PERSONAL | DEADLINE
     */
    public function autoCategorizeEvent(Event $event): string
    {
        $title = strtolower($event->title);
        $participantCount = $event->participants()->count();

        // Mots-clés pour chaque catégorie
        $categories = [
            'DEADLINE'      => ['deadline', 'livraison', 'rendu', 'échéance', 'limite'],
            'TASK_REMINDER' => ['rappel', 'reminder', 'todo', 'tâche', 'task', 'faire'],
            'EXTERNAL'      => ['client', 'fournisseur', 'partenaire', 'rdv externe', 'visite'],
            'PERSONAL'      => ['personnel', 'congé', 'absent', 'formation', 'médecin'],
            'MEETING'       => ['réunion', 'meeting', 'codir', 'comité', 'synchro', 'point', 'standup'],
        ];

        foreach ($categories as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($title, $keyword)) {
                    return $category;
                }
            }
        }

        // Heuristique : si >2 participants → MEETING
        if ($participantCount > 2) {
            return 'MEETING';
        }

        // Événement sur toute la journée → souvent PERSONAL ou DEADLINE
        if ($event->is_all_day) {
            return 'DEADLINE';
        }

        return 'MEETING';
    }

    // =========================================================================
    // prepareForMeeting() — Brief pré-réunion
    // =========================================================================

    /**
     * Prépare un brief complet 30 minutes avant une réunion.
     *
     * Inclut :
     *  - Ordre du jour (extrait de la description)
     *  - Participants avec leur dernière interaction connue
     *  - Documents pertinents (basé sur les mots-clés du titre)
     *  - Compte rendu de la dernière réunion similaire
     *  - Lien Teams/Meet si configuré
     *
     * @param  Meeting $meeting Réunion imminente
     * @param  User    $user    Utilisateur demandant le brief
     * @return array   Brief structuré
     */
    public function prepareForMeeting(Meeting $meeting, User $user): array
    {
        // ── Participants avec contexte ────────────────────────────────────────
        $participants = $meeting->participants()
            ->with(['user:id,name,avatar,email'])
            ->get()
            ->map(function ($participant) {
                $u = $participant->user;
                return [
                    'id'     => $u?->id,
                    'name'   => $u?->name ?? $participant->name ?? 'Invité externe',
                    'avatar' => $u?->avatar,
                    'email'  => $u?->email ?? $participant->email,
                    'status' => $participant->status,
                    'role'   => $participant->role,
                ];
            })
            ->toArray();

        // ── Ordre du jour (parsing de la description) ─────────────────────────
        $agenda = $this->extractAgendaItems($meeting->description ?? '');

        // ── Documents pertinents ─────────────────────────────────────────────
        $relevantDocs = $this->findRelevantDocuments($meeting->title, $user->organization_id);

        // ── Dernière réunion similaire ────────────────────────────────────────
        $lastSimilar = $this->findLastSimilarMeeting($meeting, $user);

        // ── Lien de conférence ────────────────────────────────────────────────
        $conferenceLink = $meeting->meet_link
            ?? $meeting->teams_link
            ?? null;

        return [
            'meeting'         => [
                'id'          => $meeting->id,
                'title'       => $meeting->title,
                'start_at'    => $meeting->start_at->toIso8601String(),
                'end_at'      => $meeting->end_at->toIso8601String(),
                'location'    => $meeting->location,
                'description' => $meeting->description,
            ],
            'participants'    => $participants,
            'agenda_items'    => $agenda,
            'relevant_docs'   => $relevantDocs,
            'last_similar'    => $lastSimilar,
            'conference_link' => $conferenceLink,
            'minutes_until'   => (int) now()->diffInMinutes($meeting->start_at, false),
        ];
    }

    // =========================================================================
    // detectConflicts() — Détection de journées surchargées
    // =========================================================================

    /**
     * Détecte les journées surchargées et suggère des réaménagements.
     *
     * Une journée est surchargée si elle contient plus de OVERLOADED_HOURS heures de réunions.
     *
     * @param  User   $user   Utilisateur cible
     * @param  Carbon $period Date de début de la période à analyser (par défaut : semaine courante)
     * @return array  Tableau de conflits [{date, total_hours, meetings, suggestion}]
     */
    public function detectConflicts(User $user, Carbon $period): array
    {
        $weekStart = $period->copy()->startOfWeek();
        $weekEnd   = $period->copy()->endOfWeek();

        // Récupérer tous les événements de la semaine
        $events = Event::where(function ($q) use ($user) {
                $q->where('creator_id', $user->id)
                  ->orWhereHas('participants', fn($q2) => $q2->where('user_id', $user->id));
            })
            ->whereBetween('start_at', [$weekStart, $weekEnd])
            ->whereNull('recurrence_rule')
            ->orderBy('start_at')
            ->get();

        // Grouper par jour
        $byDay   = $events->groupBy(fn($e) => $e->start_at->toDateString());
        $conflicts = [];

        foreach ($byDay as $date => $dayEvents) {
            $totalMinutes = $dayEvents->sum(fn($e) => $e->start_at->diffInMinutes($e->end_at ?? $e->start_at->addHour()));
            $totalHours   = $totalMinutes / 60;

            if ($totalHours > self::OVERLOADED_HOURS) {
                // Identifier les réunions non-critiques à déplacer
                $movable = $dayEvents->filter(fn($e) => !in_array($e->type, ['external', 'deadline']))
                    ->sortBy(fn($e) => $e->participants()->count()) // Moins de participants = plus facile à déplacer
                    ->first();

                $conflicts[] = [
                    'date'           => $date,
                    'total_hours'    => round($totalHours, 1),
                    'event_count'    => $dayEvents->count(),
                    'events'         => $dayEvents->map(fn($e) => [
                        'id'       => $e->id,
                        'title'    => $e->title,
                        'start_at' => $e->start_at->toIso8601String(),
                        'end_at'   => $e->end_at?->toIso8601String(),
                        'duration' => $e->start_at->diffInMinutes($e->end_at ?? $e->start_at->addHour()),
                    ])->values()->toArray(),
                    'suggestion'     => $movable
                        ? "Envisagez de déplacer « {$movable->title} » vers un autre jour pour libérer du temps."
                        : "Cette journée est très chargée ({$totalHours}h de réunions). Bloquez du temps pour vos tâches.",
                    'movable_event'  => $movable ? ['id' => $movable->id, 'title' => $movable->title] : null,
                ];
            }
        }

        return $conflicts;
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    /**
     * Récupère les créneaux occupés de tous les participants.
     */
    private function getBusySlotsForParticipants(array $userIds, Carbon $start, Carbon $end): Collection
    {
        return Event::where(function ($q) use ($userIds) {
                $q->whereIn('creator_id', $userIds)
                  ->orWhereHas('participants', fn($q2) => $q2->whereIn('user_id', $userIds));
            })
            ->where('start_at', '<', $end)
            ->where('end_at', '>', $start)
            ->get(['id', 'start_at', 'end_at']);
    }

    /**
     * Génère les créneaux candidats (intervalles de 30 min, heures de travail, jours ouvrables).
     */
    private function generateCandidateSlots(Carbon $start, Carbon $end, int $durationMin): array
    {
        $slots   = [];
        $current = $start->copy()->startOfDay()->setHour(self::WORK_START);

        while ($current->lt($end)) {
            // Ignorer les week-ends
            if ($current->isWeekend()) {
                $current->addDay()->setHour(self::WORK_START)->setMinute(0);
                continue;
            }

            // Ignorer les heures hors travail
            if ($current->hour >= self::WORK_END || $current->hour < self::WORK_START) {
                $current->addDay()->setHour(self::WORK_START)->setMinute(0);
                continue;
            }

            $slotEnd = $current->copy()->addMinutes($durationMin);

            // La réunion doit se terminer dans les heures de travail
            if ($slotEnd->hour < self::WORK_END || ($slotEnd->hour === self::WORK_END && $slotEnd->minute === 0)) {
                $slots[] = [
                    'start' => $current->copy(),
                    'end'   => $slotEnd,
                ];
            }

            $current->addMinutes(30);
        }

        return $slots;
    }

    /**
     * Compte les conflits d'un créneau avec les événements existants.
     */
    private function countConflicts(Carbon $start, Carbon $end, Collection $busySlots): int
    {
        return $busySlots->filter(fn($e) =>
            $e->start_at->lt($end) && $e->end_at->gt($start)
        )->count();
    }

    /**
     * Calcule le score d'un créneau de réunion (0-100).
     */
    private function scoreMeetingSlot(Carbon $slot, Carbon $preferredDate, int $participantCount): int
    {
        $score = 50; // Score de base

        // Bonus si c'est une heure de pointe
        if (in_array($slot->hour, self::PEAK_HOURS)) {
            $score += 20;
        }

        // Bonus si le créneau est proche de la date préférée
        $daysDiff = abs($slot->diffInDays($preferredDate));
        $score += max(0, 20 - ($daysDiff * 5));

        // Malus pour lundi matin et vendredi après-midi
        if ($slot->isMonday() && $slot->hour < 10) {
            $score -= 15;
        }
        if ($slot->isFriday() && $slot->hour >= 16) {
            $score -= 10;
        }

        // Bonus pour les matins (généralement plus productifs)
        if ($slot->hour >= 9 && $slot->hour < 12) {
            $score += 10;
        }

        return max(0, min(100, $score));
    }

    /**
     * Formate un label lisible pour un créneau.
     */
    private function formatSlotLabel(Carbon $start, Carbon $end): string
    {
        return $start->format('H:i') . ' – ' . $end->format('H:i');
    }

    /**
     * Génère un label de jour relatif.
     */
    private function getDayLabel(Carbon $slot, Carbon $preferred): string
    {
        $diff = $slot->startOfDay()->diffInDays($preferred->startOfDay(), false);

        return match (true) {
            $diff === 0  => 'Aujourd\'hui',
            $diff === 1  => 'Demain',
            $diff === -1 => 'Hier',
            $diff > 1    => $slot->translatedFormat('l d M'),
            default      => $slot->translatedFormat('l d M'),
        };
    }

    /**
     * Normalise un titre pour comparaison.
     */
    private function normalizeTitle(string $title): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $title)));
    }

    /**
     * Traduit un nom de jour anglais en français.
     */
    private function translateDay(string $day): string
    {
        return match (strtolower($day)) {
            'monday'    => 'lundi',
            'tuesday'   => 'mardi',
            'wednesday' => 'mercredi',
            'thursday'  => 'jeudi',
            'friday'    => 'vendredi',
            'saturday'  => 'samedi',
            'sunday'    => 'dimanche',
            default     => $day,
        };
    }

    /**
     * Extrait les éléments d'ordre du jour depuis une description.
     */
    private function extractAgendaItems(string $description): array
    {
        if (empty($description)) {
            return [];
        }

        $items = [];
        $lines = explode("\n", $description);

        foreach ($lines as $line) {
            $line = trim($line);
            // Détecter les items de liste (-, *, numérotés)
            if (preg_match('/^[-*•]\s+(.+)$/', $line, $match)) {
                $items[] = ['text' => $match[1], 'type' => 'bullet'];
            } elseif (preg_match('/^\d+[.)]\s+(.+)$/', $line, $match)) {
                $items[] = ['text' => $match[1], 'type' => 'numbered'];
            } elseif (strlen($line) > 5) {
                $items[] = ['text' => $line, 'type' => 'paragraph'];
            }
        }

        return $items;
    }

    /**
     * Trouve les documents pertinents pour une réunion.
     */
    private function findRelevantDocuments(string $title, int $organizationId): array
    {
        $keywords = array_filter(explode(' ', strtolower($title)), fn($w) => strlen($w) > 3);

        if (empty($keywords)) {
            return [];
        }

        $query = \App\Models\Document::where('organization_id', $organizationId);
        foreach ($keywords as $keyword) {
            $query->orWhere('name', 'LIKE', "%{$keyword}%");
        }

        return $query->latest('updated_at')
            ->limit(5)
            ->get(['id', 'name', 'type', 'updated_at'])
            ->toArray();
    }

    /**
     * Trouve la dernière réunion similaire.
     */
    private function findLastSimilarMeeting(Meeting $meeting, User $user): ?array
    {
        $similar = Meeting::where('organization_id', $user->organization_id)
            ->where('id', '!=', $meeting->id)
            ->where('title', 'LIKE', '%' . $this->normalizeTitle($meeting->title) . '%')
            ->where('start_at', '<', now())
            ->latest('start_at')
            ->first(['id', 'title', 'start_at']);

        return $similar ? $similar->toArray() : null;
    }
}
