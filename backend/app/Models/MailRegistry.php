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
 * @property string          $id
 * @property string          $organization_id
 * @property string          $type             incoming | outgoing
 * @property string          $reference        REF-ENTRANT-2026-00001
 * @property string|null     $sender_name
 * @property string|null     $sender_org
 * @property string|null     $recipient_name
 * @property string|null     $recipient_org
 * @property string          $subject
 * @property string          $urgency          low | normal | high | urgent
 * @property Carbon|null     $received_at
 * @property Carbon|null     $sent_at
 * @property string|null     $assigned_to_id
 * @property string|null     $department_id
 * @property string          $status           pending | processing | processed | archived
 * @property string|null     $notes
 * @property int|null        $processing_delay_days  Délai max traitement en jours
 * @property Carbon          $created_at
 * @property Carbon          $updated_at
 * @property Carbon|null     $deleted_at
 */
class MailRegistry extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'mail_registry';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'organization_id',
        'type',
        'reference',
        'sender_name',
        'sender_org',
        'recipient_name',
        'recipient_org',
        'subject',
        'urgency',
        'received_at',
        'sent_at',
        'assigned_to_id',
        'department_id',
        'status',
        'notes',
        'processing_delay_days',
        'created_by_id',
    ];

    protected $casts = [
        'received_at' => 'datetime',
        'sent_at'     => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MailAttachment::class, 'mail_id');
    }

    public function trackingHistory(): HasMany
    {
        return $this->hasMany(MailTracking::class, 'mail_id')->orderBy('created_at', 'desc');
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
        return $query->where('status', 'pending')
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
     * Vérifie si le courrier est en retard (non traité après le délai configuré).
     */
    public function isOverdue(): bool
    {
        if (! in_array($this->status, ['pending', 'processing'])) {
            return false;
        }

        $referenceDate = $this->received_at ?? $this->created_at;
        $delayDays     = $this->processing_delay_days ?? 3;

        return $referenceDate->addDays($delayDays)->isPast();
    }

    /**
     * Retourne le libellé couleur du statut pour l'UI.
     */
    public function getStatusColor(): string
    {
        return match ($this->status) {
            'pending'    => 'yellow',
            'processing' => 'blue',
            'processed'  => 'green',
            'archived'   => 'gray',
            default      => 'gray',
        };
    }

    /**
     * Retourne le libellé couleur de l'urgence pour l'UI.
     */
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
