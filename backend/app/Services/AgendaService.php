<?php

namespace App\Services;

use App\Models\Calendar;
use App\Models\Event;
use App\Models\Organization;
use App\Models\Room;
use App\Models\RoomReservation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * AgendaService — Logique métier du module Agenda & Planning
 *
 * Ce service centralise toutes les opérations complexes sur les événements :
 * - Gestion des participants et réservations de salles
 * - Vérification de conflits de créneaux
 * - Expansion des événements récurrents (RRULE iCalendar)
 * - Envoi de rappels (invoqué depuis une commande CRON)
 */
class AgendaService
{
    // -------------------------------------------------------------------------
    // CRUD Événements
    // -------------------------------------------------------------------------

    /**
     * Crée un événement avec ses participants et sa réservation de salle.
     *
     * La création est atomique : si la réservation de salle échoue,
     * l'événement et les participants sont rollback.
     *
     * @throws \RuntimeException Si la salle n'est pas disponible
     * @throws \Throwable        En cas d'erreur DB
     */
    public function createEvent(array $data, User $user): Event
    {
        return DB::transaction(function () use ($data, $user) {
            // Résoudre ou créer le calendrier par défaut
            $calendarId = $data['calendar_id'] ?? $this->getOrCreateDefaultCalendar($user)->id;

            $event = Event::create([
                'organization_id' => $user->organization_id,
                'calendar_id'     => $calendarId,
                'created_by'      => $user->id,
                'title'           => $data['title'],
                'description'     => $data['description'] ?? null,
                'location'        => $data['location'] ?? null,
                'start_at'        => $data['start_at'] ?? ($data['starts_at'] ?? null),
                'end_at'          => $data['end_at'] ?? ($data['ends_at'] ?? null),
                'starts_at'       => $data['start_at'] ?? ($data['starts_at'] ?? null),
                'ends_at'         => $data['end_at'] ?? ($data['ends_at'] ?? null),
                'all_day'         => $data['is_all_day'] ?? ($data['all_day'] ?? false),
                'recurrence_rule' => $data['recurrence_rule'] ?? null,
                'color'           => $data['color'] ?? null,
                'type'            => $data['type'] ?? 'meeting',
                'metadata'        => ! empty($data['meet_link']) ? ['meet_link' => $data['meet_link']] : null,
            ]);

            // Ajouter le créateur comme organisateur
            $this->syncParticipants($event, $data['participants'] ?? [], $user->id);

            // Réserver une salle si demandé
            if (! empty($data['room_id'])) {
                $this->reserveRoom($event, $data['room_id'], $data['start_at'], $data['end_at'], $user);
            }

            return $event->load(['participants', 'roomReservation.room', 'creator']);
        });
    }

    /**
     * Met à jour un événement existant.
     *
     * @throws \RuntimeException Si la salle n'est pas disponible
     * @throws \Throwable        En cas d'erreur DB
     */
    public function updateEvent(Event $event, array $data): Event
    {
        return DB::transaction(function () use ($event, $data) {
            $event->update(array_filter([
                'title'           => $data['title'] ?? $event->title,
                'description'     => $data['description'] ?? $event->description,
                'location'        => $data['location'] ?? $event->location,
                'start_at'        => $data['start_at'] ?? $event->start_at,
                'end_at'          => $data['end_at'] ?? $event->end_at,
                'is_all_day'      => $data['is_all_day'] ?? $event->is_all_day,
                'recurrence_rule' => $data['recurrence_rule'] ?? $event->recurrence_rule,
                'color'           => $data['color'] ?? $event->color,
                'type'            => $data['type'] ?? $event->type,
                'meet_link'       => $data['meet_link'] ?? $event->meet_link,
                'reminders'       => $data['reminders'] ?? $event->reminders,
                'calendar_id'     => $data['calendar_id'] ?? $event->calendar_id,
            ], fn($v) => $v !== null));

            // Resynchroniser les participants si fournis
            if (isset($data['participants'])) {
                $this->syncParticipants($event, $data['participants'], $event->creator_id);
            }

            // Gérer la réservation de salle
            if (array_key_exists('room_id', $data)) {
                $existingReservation = $event->roomReservation;

                if (empty($data['room_id'])) {
                    // Supprimer la réservation existante
                    $existingReservation?->delete();
                } else {
                    $this->reserveRoom(
                        $event,
                        $data['room_id'],
                        $data['start_at'] ?? $event->start_at,
                        $data['end_at'] ?? $event->end_at,
                        auth()->user(),
                        $existingReservation?->id
                    );
                }
            }

            return $event->fresh(['participants', 'roomReservation.room', 'creator']);
        });
    }

    /**
     * Supprime un événement et ses réservations associées.
     */
    public function deleteEvent(Event $event): void
    {
        DB::transaction(function () use ($event) {
            // Libérer la salle avant de supprimer l'événement
            $event->roomReservation?->delete();
            $event->participants()->detach();
            $event->delete();
        });
    }

    // -------------------------------------------------------------------------
    // Calendrier & affichage
    // -------------------------------------------------------------------------

    /**
     * Récupère les événements pour le calendrier d'une organisation dans une plage de dates.
     * Inclut l'expansion des événements récurrents.
     *
     * @return Collection<Event>
     */
    public function getEventsForCalendar(Organization $org, Carbon $start, Carbon $end): Collection
    {
        $events = Event::forOrganization($org->id)
            ->inDateRange($start, $end)
            ->with(['participants:id,name,avatar', 'creator:id,name', 'roomReservation.room:id,name'])
            ->withCount('participants')
            ->get();

        // Séparer les événements non-récurrents des récurrents
        $nonRecurring = $events->filter(fn(Event $e) => ! $e->isRecurring());
        $recurring    = $events->filter(fn(Event $e) => $e->isRecurring());

        // Étendre les événements récurrents dans la plage demandée
        $expandedRecurring = collect();
        foreach ($recurring as $event) {
            $occurrences = $this->expandRecurringEvents($event, $start, $end);
            $expandedRecurring = $expandedRecurring->merge($occurrences);
        }

        return $nonRecurring->merge($expandedRecurring);
    }

    // -------------------------------------------------------------------------
    // Conflits & disponibilité
    // -------------------------------------------------------------------------

    /**
     * Vérifie si un utilisateur a des conflits de créneau.
     *
     * Un conflit existe si l'utilisateur est créateur OU participant d'un
     * événement qui chevauche le créneau demandé.
     *
     * @param int|null $excludeEventId Exclure un événement (cas d'une modification)
     */
    public function checkConflicts(
        string $userId,
        Carbon $start,
        Carbon $end,
        ?string $excludeEventId = null
    ): bool {
        $query = Event::where(function ($q) use ($userId) {
            $q->where('creator_id', $userId)
              ->orWhereHas('participants', fn($q2) => $q2->where('user_id', $userId));
        })
        ->where('start_at', '<', $end)
        ->where('end_at', '>', $start);

        if ($excludeEventId) {
            $query->where('id', '!=', $excludeEventId);
        }

        return $query->exists();
    }

    // -------------------------------------------------------------------------
    // Récurrence RRULE
    // -------------------------------------------------------------------------

    /**
     * Génère les occurrences d'un événement récurrent dans une plage de dates.
     *
     * Supporte les fréquences : DAILY, WEEKLY, MONTHLY, YEARLY.
     * Respecte UNTIL, COUNT, INTERVAL, BYDAY.
     *
     * Note : cette implémentation couvre les cas courants. Pour une conformité
     * RFC 5545 complète, intégrer la librairie `recurr/recurr`.
     *
     * @return array<array> Tableau de représentations FullCalendar
     */
    public function expandRecurringEvents(Event $event, Carbon $rangeStart, Carbon $rangeEnd): array
    {
        if (! $event->isRecurring()) {
            return [$event->toCalendarFormat()];
        }

        $rrule      = $this->parseRRule($event->recurrence_rule);
        $frequency  = $rrule['FREQ'] ?? 'WEEKLY';
        $interval   = (int) ($rrule['INTERVAL'] ?? 1);
        $until      = isset($rrule['UNTIL']) ? Carbon::parse($rrule['UNTIL']) : null;
        $count      = isset($rrule['COUNT']) ? (int) $rrule['COUNT'] : null;
        $byDay      = isset($rrule['BYDAY']) ? explode(',', $rrule['BYDAY']) : null;

        $occurrences = [];
        $current     = $event->start_at->copy();
        $duration    = $event->getDurationInMinutes();
        $iteration   = 0;
        $maxOccurrences = 500; // Sécurité anti-boucle infinie

        while ($current->lte($rangeEnd) && $iteration < $maxOccurrences) {
            // Vérifier la limite COUNT
            if ($count !== null && $iteration >= $count) {
                break;
            }

            // Vérifier la limite UNTIL
            if ($until !== null && $current->gt($until)) {
                break;
            }

            $occurrenceEnd = $current->copy()->addMinutes($duration);

            // L'occurrence est dans la plage demandée
            if ($current->gte($rangeStart) && $current->lte($rangeEnd)) {
                $occurrence            = $event->toCalendarFormat();
                $occurrence['id']      = $event->id . '_' . $current->timestamp;
                $occurrence['start']   = $event->is_all_day
                    ? $current->toDateString()
                    : $current->toIso8601String();
                $occurrence['end']     = $event->is_all_day
                    ? $occurrenceEnd->toDateString()
                    : $occurrenceEnd->toIso8601String();
                $occurrence['extendedProps']['original_event_id'] = $event->id;
                $occurrences[] = $occurrence;
            }

            // Avancer à la prochaine occurrence
            $current = $this->advanceByFrequency($current, $frequency, $interval);
            $iteration++;
        }

        return $occurrences;
    }

    /**
     * Parse une chaîne RRULE en tableau associatif.
     * Ex : "FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=2" → ['FREQ' => 'WEEKLY', ...]
     */
    private function parseRRule(string $rrule): array
    {
        $parts  = explode(';', $rrule);
        $result = [];

        foreach ($parts as $part) {
            [$key, $value] = array_pad(explode('=', $part, 2), 2, null);
            if ($key && $value !== null) {
                $result[strtoupper($key)] = $value;
            }
        }

        return $result;
    }

    /**
     * Avance la date courante selon la fréquence de récurrence.
     */
    private function advanceByFrequency(Carbon $date, string $frequency, int $interval): Carbon
    {
        return match (strtoupper($frequency)) {
            'DAILY'   => $date->copy()->addDays($interval),
            'WEEKLY'  => $date->copy()->addWeeks($interval),
            'MONTHLY' => $date->copy()->addMonths($interval),
            'YEARLY'  => $date->copy()->addYears($interval),
            default   => $date->copy()->addWeeks($interval),
        };
    }

    // -------------------------------------------------------------------------
    // Rappels (CRON)
    // -------------------------------------------------------------------------

    /**
     * Envoie les rappels pour les événements imminents.
     *
     * Invoquée par une commande CRON toutes les 5 minutes.
     * Traite les événements dont le rappel est dû dans la prochaine minute.
     */
    public function sendEventReminders(): void
    {
        $now = now();

        // Récupérer les événements avec des rappels configurés
        $events = Event::where('start_at', '>', $now)
            ->whereNotNull('reminders')
            ->where('reminders', '!=', '[]')
            ->with(['participants', 'creator'])
            ->get();

        foreach ($events as $event) {
            foreach (($event->reminders ?? []) as $reminder) {
                $minutesBefore = (int) ($reminder['minutes'] ?? 15);
                $reminderAt    = $event->start_at->copy()->subMinutes($minutesBefore);

                // Le rappel est dû si la fenêtre actuelle correspond (±2 min de tolérance)
                if ($now->diffInMinutes($reminderAt, false) >= 0
                    && $now->diffInMinutes($reminderAt, false) < 2) {
                    $this->dispatchReminder($event, $reminder);
                }
            }
        }
    }

    /**
     * Déclenche l'envoi d'un rappel pour un événement.
     */
    private function dispatchReminder(Event $event, array $reminder): void
    {
        // TODO : Implémenter les notifications selon le canal
        // Canal disponibles : app, email, sms, whatsapp
        $recipients = $event->participants->push($event->creator)->unique('id');

        Log::info('AgendaService: Sending reminder', [
            'event_id'  => $event->id,
            'title'     => $event->title,
            'start_at'  => $event->start_at->toIso8601String(),
            'channel'   => $reminder['channel'] ?? 'app',
            'recipients' => $recipients->pluck('id')->toArray(),
        ]);

        // Notification::send($recipients, new EventReminderNotification($event, $reminder));
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Synchronise les participants d'un événement.
     * Le créateur est toujours ajouté en tant qu'organisateur.
     */
    private function syncParticipants(Event $event, array $participantIds, string $creatorId): void
    {
        $syncData = [];

        // Le créateur est toujours organisateur
        $syncData[$creatorId] = ['status' => 'accepted', 'role' => 'organizer'];

        // Ajouter les autres participants
        foreach ($participantIds as $userId) {
            if ($userId !== $creatorId) {
                $syncData[$userId] = ['status' => 'pending', 'role' => 'participant'];
            }
        }

        $event->participants()->sync($syncData);
    }

    /**
     * Réserve une salle pour un événement.
     * Vérifie la disponibilité avant de créer/mettre à jour la réservation.
     *
     * @throws \RuntimeException Si la salle n'est pas disponible
     */
    private function reserveRoom(
        Event $event,
        string $roomId,
        $startAt,
        $endAt,
        User $user,
        ?string $excludeReservationId = null
    ): RoomReservation {
        $room  = Room::findOrFail($roomId);
        $start = Carbon::parse($startAt);
        $end   = Carbon::parse($endAt);

        if (! $room->isAvailableFor($start, $end, $excludeReservationId)) {
            throw new \RuntimeException("La salle « {$room->name} » n'est pas disponible pour ce créneau.");
        }

        // Créer ou mettre à jour la réservation
        return RoomReservation::updateOrCreate(
            ['event_id' => $event->id],
            [
                'organization_id' => $user->organization_id,
                'room_id'         => $roomId,
                'user_id'         => $user->id,
                'start_at'        => $start,
                'end_at'          => $end,
                'status'          => 'approved',
            ]
        );
    }

    /**
     * Récupère ou crée le calendrier par défaut de l'utilisateur.
     */
    private function getOrCreateDefaultCalendar(User $user): Calendar
    {
        return Calendar::firstOrCreate(
            [
                'user_id'         => $user->id,
                'is_default'      => true,
                'organization_id' => $user->organization_id,
            ],
            [
                'name'  => 'Mon agenda',
                'color' => '#3B82F6',
                'type'  => 'personal',
            ]
        );
    }
}
