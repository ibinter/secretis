<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

/**
 * MailRegistry — Registre courrier entrant/sortant
 *
 * Colonnes réelles DB (mail_registry) :
 *   id, organization_id, reference, type, urgency, status, subject, body,
 *   sender_name, sender_email, sender_organization,
 *   recipient_name, recipient_email,
 *   received_at, sent_at, due_date,
 *   assigned_to, registered_by,
 *   notes, tags, processing_delay_days,
 *   created_at, updated_at, deleted_at
 *
 * @property string          $id
 * @property string          $organization_id
 * @property string          $type             incoming | outgoing
 * @property string          $reference
 * @property string|null     $sender_name
 * @property string|null     $sender_organization
 * @property string|null     $sender_email
 * @property string|null     $recipient_name
 * @property string|null     $recipient_email
 * @property string          $subject
 * @property string|null     $body
 * @property string          $urgency          low | normal | high | urgent
 * @property Carbon|null     $received_at
 * @property Carbon|null     $sent_at
 * @property Carbon|null     $due_date
 * @property string|null     $assigned_to      FK → users.id
 * @property string|null     $registered_by    FK → users.id
 * @property string          $status           pending | processing | processed | archived
 * @property string|null     $notes
 * @property array|null      $tags
 * @property int|null        $processing_delay_days
 * @property Carbon          $created_at
 * @property Carbon          $updated_at
 * @property Carbon|null     $deleted_at
 */
class MailRegistry extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'mail_registry';

    

    protected $fillable = [
        'organization_id',
        'type',
        'reference',
        'sender_name',
        'sender_email',
        'sender_organization',
        'recipient_name',
        'recipient_email',
        'subject',
        'body',
        'urgency',
        'received_at',
        'sent_at',
        'due_date',
        'assigned_to',
        'registered_by',
        'status',
        'notes',
        'tags',
        'processing_delay_days',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'sent_at'     => 'datetime',
        'due_date'    => 'datetime',
        'tags'        => 'array',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /** Utilisateur en charge du traitement */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /** Utilisateur ayant enregistré le courrier */
    public function registeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registered_by');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MailAttachment::class, 'mail_registry_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeIncoming(Builder $query): Builder
    {
        return $query->where('type', 'incoming');
    }

    public function scopeOutgoing(Builder $query): Builder
    {
        return $query->where('type', 'outgoing');
    }

    public function scopeByStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopeUrgent(Builder $query): Builder
    {
        return $query->whereIn('urgency', ['high', 'urgent']);
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->whereIn('status', ['received', 'registered', 'in_progress'])
            ->where(function (Builder $q) {
                $q->whereNotNull('received_at')
                  ->whereRaw(
                      "received_at < NOW() - INTERVAL '1 day' * COALESCE(processing_delay_days, 3)"
                  );
            });
    }

    public function scopeForOrganization(Builder $query, string $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Accessor for append(['is_overdue']) in controller.
     */
    public function getIsOverdueAttribute(): bool
    {
        return $this->isOverdue();
    }

    public function isOverdue(): bool
    {
        if (! in_array($this->status, ['received', 'registered', 'in_progress'])) {
            return false;
        }

        $referenceDate = $this->received_at ?? $this->created_at;
        $delayDays     = $this->processing_delay_days ?? 3;

        return $referenceDate->copy()->addDays($delayDays)->isPast();
    }

    public function getStatusColor(): string
    {
        return match ($this->status) {
            'received'    => 'yellow',
            'registered'  => 'blue',
            'assigned'    => 'indigo',
            'in_progress' => 'blue',
            'replied'     => 'green',
            'archived'    => 'gray',
            'closed'      => 'gray',
            default       => 'gray',
        };
    }

    public function getUrgencyColor(): string
    {
        return match ($this->urgency) {
            'low'    => 'gray',
            'normal' => 'blue',
            'high'   => 'orange',
            'urgent' => 'red',
            default  => 'blue',
        };
    }
}
