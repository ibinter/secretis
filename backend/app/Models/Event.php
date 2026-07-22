<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Event — Événement de l'agenda SECRETIS ERP
 *
 * Supporte la récurrence au format iCalendar RRULE.
 * Multi-tenant strict : chaque événement appartient à une organisation.
 *
 * @property string       $id               UUID
 * @property string       $organization_id
 * @property string       $calendar_id
 * @property string       $creator_id
 * @property string       $title
 * @property string|null  $description
 * @property string|null  $location
 * @property Carbon       $start_at
 * @property Carbon       $end_at
 * @property bool         $is_all_day
 * @property string|null  $recurrence_rule  Format RRULE iCalendar
 * @property string|null  $color            Code hex (#RRGGBB)
 * @property string       $type             event|meeting|task|reminder
 * @property string|null  $meet_link        Lien visioconférence
 * @property array        $reminders        [{minutes: int, channel: string}]
 */
class Event extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'calendar_id',
        'creator_id',
        'title',
        'description',
        'location',
        'start_at',
        'end_at',
        'is_all_day',
        'recurrence_rule',
        'color',
        'type',
        'meet_link',
        'reminders',
    ];

    protected $casts = [
        'start_at'         => 'datetime',
        'end_at'           => 'datetime',
        'is_all_day'       => 'boolean',
        'reminders'        => 'array',
        // recurrence_rule reste string (format RRULE texte standard)
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function calendar(): BelongsTo
    {
        return $this->belongsTo(Calendar::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Participants à l'événement avec leur statut (pending/accepted/declined).
     */
    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'event_participants', 'event_id', 'user_id')
            ->withPivot(['status', 'role'])
            ->withTimestamps();
    }

    /**
     * Réservation de salle associée à cet événement.
     */
    public function roomReservation(): HasOne
    {
        return $this->hasOne(RoomReservation::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Filtre les événements dans une plage de dates.
     * Inclut les événements qui chevauchent partiellement la plage.
     */
    public function scopeInDateRange(Builder $query, Carbon $start, Carbon $end): Builder
    {
        return $query->where(function (Builder $q) use ($start, $end) {
            $q->whereBetween('start_at', [$start, $end])
              ->orWhereBetween('end_at', [$start, $end])
              ->orWhere(function (Builder $q2) use ($start, $end) {
                  // Événement qui englobe toute la plage
                  $q2->where('start_at', '<=', $start)
                     ->where('end_at', '>=', $end);
              });
        });
    }

    /**
     * Filtre par calendrier.
     */
    public function scopeByCalendar(Builder $query, string $calendarId): Builder
    {
        return $query->where('calendar_id', $calendarId);
    }

    /**
     * Événements à venir (non encore démarrés).
     */
    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('start_at', '>', now())->orderBy('start_at');
    }

    /**
     * Filtre par organisation (sécurité multi-tenant).
     */
    public function scopeForOrganization(Builder $query, string $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    /**
     * Filtre par type d'événement.
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Convertit l'événement en format attendu par FullCalendar.js.
     *
     * @return array{id: string, title: string, start: string, end: string, allDay: bool,
     *               color: string, extendedProps: array}
     */
    public function toCalendarFormat(): array
    {
        return [
            'id'    => $this->id,
            'title' => $this->title,
            'start' => $this->is_all_day
                ? $this->start_at->toDateString()
                : $this->start_at->toIso8601String(),
            'end'   => $this->is_all_day
                ? $this->end_at->toDateString()
                : $this->end_at->toIso8601String(),
            'allDay' => $this->is_all_day,
            'color'  => $this->color ?? $this->getDefaultColorForType(),
            'extendedProps' => [
                'type'            => $this->type,
                'description'     => $this->description,
                'location'        => $this->location,
                'meet_link'       => $this->meet_link,
                'recurrence_rule' => $this->recurrence_rule,
                'calendar_id'     => $this->calendar_id,
                'creator_id'      => $this->creator_id,
                'creator_name'    => $this->creator?->name,
                'participants_count' => $this->participants_count ?? 0,
                'has_room'        => $this->roomReservation !== null,
            ],
        ];
    }

    /**
     * Vérifie si l'événement est récurrent (possède une RRULE).
     */
    public function isRecurring(): bool
    {
        return ! empty($this->recurrence_rule);
    }

    /**
     * Durée de l'événement en minutes.
     */
    public function getDurationInMinutes(): int
    {
        return (int) $this->start_at->diffInMinutes($this->end_at);
    }

    /**
     * Couleur par défaut selon le type d'événement.
     */
    public function getDefaultColorForType(): string
    {
        return match ($this->type) {
            'meeting'  => '#8B5CF6', // violet
            'task'     => '#F59E0B', // ambre
            'reminder' => '#EF4444', // rouge
            default    => '#3B82F6', // bleu
        };
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        // Garantir l'isolation tenant à la création
        static::creating(function (self $event) {
            if (empty($event->organization_id) && auth()->check()) {
                $event->organization_id = auth()->user()->organization_id;
            }
        });
    }
}
