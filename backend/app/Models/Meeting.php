<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Meeting — Réunion SECRETIS ERP
 *
 * Cycle de vie : planned → ongoing → completed | cancelled
 * Multi-tenant : toutes les requêtes sont scopées à organization_id.
 *
 * @property string      $id               UUID
 * @property string      $organization_id
 * @property string      $title
 * @property string|null $description
 * @property string      $meeting_type     board | team | project | extraordinary
 * @property string      $status           meeting_status_enum
 * @property string      $location
 * @property string      $organizer_id     FK users
 * @property string|null $president_id     Président de séance (valide CR)
 * @property Carbon      $scheduled_at
 * @property int         $duration_minutes Durée prévue en minutes
 * @property Carbon|null $started_at
 * @property Carbon|null $ended_at
 * @property string|null $minutes_content  Compte rendu (HTML TipTap)
 * @property string|null $minutes_approved_by
 * @property Carbon|null $minutes_approved_at
 * @property string|null $minutes_pdf_path Chemin du PDF généré
 * @property array       $agenda_items     JSONB [{ order, title, description, duration_min }]
 * @property array       $decisions        JSONB extraites par IA ou manuellement
 * @property array       $settings         JSONB
 */
class Meeting extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType   = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'organization_id',
        'title',
        'description',
        'meeting_type',
        'status',
        'location',
        'organizer_id',
        'president_id',
        'scheduled_at',
        'duration_minutes',
        'started_at',
        'ended_at',
        'minutes_content',
        'minutes_approved_by',
        'minutes_approved_at',
        'minutes_pdf_path',
        'agenda_items',
        'decisions',
        'settings',
    ];

    protected $casts = [
        'scheduled_at'        => 'datetime',
        'started_at'          => 'datetime',
        'ended_at'            => 'datetime',
        'minutes_approved_at' => 'datetime',
        'agenda_items'        => 'array',
        'decisions'           => 'array',
        'settings'            => 'array',
        'duration_minutes'    => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function president(): BelongsTo
    {
        return $this->belongsTo(User::class, 'president_id');
    }

    public function minutesApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'minutes_approved_by');
    }

    /** Participants (pivot : meeting_participants) */
    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'meeting_participants', 'meeting_id', 'user_id')
                    ->withPivot(['role', 'invitation_status', 'invited_at', 'responded_at'])
                    ->withTimestamps();
    }

    /** Tâches créées depuis les décisions de cette réunion */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'meeting_id');
    }

    // -------------------------------------------------------------------------
    // Scopes multi-tenant
    // -------------------------------------------------------------------------

    /** Scope obligatoire : toujours filtrer par organisation */
    public function scopeForOrganization($query, string $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopePlanned($query)
    {
        return $query->where('status', 'planned');
    }

    public function scopeOngoing($query)
    {
        return $query->where('status', 'ongoing');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeUpcoming($query)
    {
        return $query->where('status', 'planned')
                     ->where('scheduled_at', '>=', now());
    }

    public function scopePast($query)
    {
        return $query->whereIn('status', ['completed', 'cancelled']);
    }

    /** Filtre par organisateur */
    public function scopeByOrganizer($query, string $userId)
    {
        return $query->where('organizer_id', $userId);
    }

    /** Filtre par plage de dates */
    public function scopeBetweenDates($query, string $from, string $to)
    {
        return $query->whereBetween('scheduled_at', [$from, $to]);
    }

    // -------------------------------------------------------------------------
    // Accesseurs / Mutateurs
    // -------------------------------------------------------------------------

    /** Durée réelle de la réunion une fois terminée */
    public function getActualDurationMinutesAttribute(): ?int
    {
        if ($this->started_at && $this->ended_at) {
            return (int) $this->started_at->diffInMinutes($this->ended_at);
        }
        return null;
    }

    /** La réunion est-elle en retard par rapport à l'heure prévue ? */
    public function getIsLateAttribute(): bool
    {
        return $this->status === 'planned' && $this->scheduled_at->isPast();
    }

    /** Nombre de décisions extraites */
    public function getDecisionsCountAttribute(): int
    {
        return count($this->decisions ?? []);
    }

    /** Le CR a-t-il été approuvé ? */
    public function getMinutesApprovedAttribute(): bool
    {
        return $this->minutes_approved_at !== null;
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /** Peut-on démarrer la réunion ? */
    public function canStart(): bool
    {
        return $this->status === 'planned';
    }

    /** Peut-on terminer la réunion ? */
    public function canEnd(): bool
    {
        return $this->status === 'ongoing';
    }

    /** Le compte rendu peut-il être validé ? */
    public function canApproveMinutes(): bool
    {
        return $this->status === 'completed'
            && ! empty($this->minutes_content)
            && ! $this->minutes_approved;
    }

    /** Retourne les items de l'ODJ triés par ordre */
    public function getSortedAgendaItems(): array
    {
        $items = $this->agenda_items ?? [];
        usort($items, fn($a, $b) => ($a['order'] ?? 0) <=> ($b['order'] ?? 0));
        return $items;
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        static::creating(function (self $meeting) {
            if (empty($meeting->id)) {
                $meeting->id = \Str::uuid()->toString();
            }
            $meeting->agenda_items = $meeting->agenda_items ?? [];
            $meeting->decisions    = $meeting->decisions    ?? [];
            $meeting->settings     = $meeting->settings     ?? [];
        });
    }
}
