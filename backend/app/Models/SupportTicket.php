<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * SupportTicket — Ticket de support client SECRETIS ERP
 *
 * @property int         $id
 * @property int         $organization_id
 * @property int         $user_id
 * @property string      $ticket_number    TKT-YYYYMMDD-XXXXXX
 * @property string      $subject
 * @property string      $status           open|in_progress|waiting_client|resolved|closed
 * @property string      $priority         low|medium|high|urgent
 * @property string      $category         technical|billing|feature_request|training|other
 * @property int|null    $assigned_to
 * @property string|null $first_response_at
 * @property string|null $resolved_at
 * @property string|null $closed_at
 * @property int|null    $satisfaction_rating
 * @property string|null $satisfaction_comment
 * @property array|null  $metadata
 */
class SupportTicket extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'support_tickets';

    protected $fillable = [
        'organization_id',
        'user_id',
        'ticket_number',
        'subject',
        'status',
        'priority',
        'category',
        'assigned_to',
        'first_response_at',
        'resolved_at',
        'closed_at',
        'satisfaction_rating',
        'satisfaction_comment',
        'metadata',
    ];

    protected $casts = [
        'metadata'            => 'array',
        'first_response_at'   => 'datetime',
        'resolved_at'         => 'datetime',
        'closed_at'           => 'datetime',
        'satisfaction_rating' => 'integer',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class, 'ticket_id')->orderBy('created_at');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeForOrganization(Builder $query, int $orgId): Builder
    {
        return $query->where('organization_id', $orgId);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereIn('status', ['open', 'in_progress', 'waiting_client']);
    }

    public function scopeUrgent(Builder $query): Builder
    {
        return $query->where('priority', 'urgent');
    }

    // -------------------------------------------------------------------------
    // Méthodes statiques
    // -------------------------------------------------------------------------

    /**
     * Génère un numéro de ticket unique au format TKT-YYYYMMDD-XXXXXX
     */
    public static function generateTicketNumber(): string
    {
        do {
            $number = 'TKT-' . date('Ymd') . '-' . strtoupper(Str::random(6));
        } while (self::where('ticket_number', $number)->exists());

        return $number;
    }

    // -------------------------------------------------------------------------
    // Accesseurs
    // -------------------------------------------------------------------------

    /**
     * Le ticket est-il en retard (ouvert depuis > 48h sans première réponse) ?
     */
    public function getIsOverdueAttribute(): bool
    {
        if (! in_array($this->status, ['open', 'in_progress'])) {
            return false;
        }

        if ($this->first_response_at !== null) {
            return false;
        }

        return $this->created_at->diffInHours(now()) > 48;
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        static::creating(function (self $ticket) {
            if (empty($ticket->ticket_number)) {
                $ticket->ticket_number = self::generateTicketNumber();
            }
            $ticket->status   = $ticket->status   ?? 'open';
            $ticket->priority = $ticket->priority ?? 'medium';
            $ticket->metadata = $ticket->metadata ?? [];
        });
    }
}
