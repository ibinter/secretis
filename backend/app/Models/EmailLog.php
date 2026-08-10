<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * EmailLog — Journal des emails transactionnels SECRETIS
 *
 * @property int         $id
 * @property int|null    $organization_id
 * @property int|null    $user_id
 * @property string      $type             welcome|expiring_7|expiring_3|expiring_1|expired|receipt|demo|offer|ticket_created|ticket_resolved|suspended|suspicious_login
 * @property string      $email
 * @property string      $subject
 * @property string      $status           queued|sent|failed|bounced
 * @property string|null $idempotency_key
 * @property array|null  $metadata
 * @property \Carbon\Carbon|null $sent_at
 * @property string|null $error_message
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class EmailLog extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'type',
        'email',
        'subject',
        'status',
        'idempotency_key',
        'metadata',
        'sent_at',
        'error_message',
    ];

    protected $casts = [
        'metadata' => 'array',
        'sent_at'  => 'datetime',
    ];

    // ─── Types d'email disponibles ─────────────────────────────────────────────

    public const TYPE_WELCOME          = 'welcome';
    public const TYPE_EXPIRING_7       = 'expiring_7';
    public const TYPE_EXPIRING_3       = 'expiring_3';
    public const TYPE_EXPIRING_1       = 'expiring_1';
    public const TYPE_EXPIRED          = 'expired';
    public const TYPE_RECEIPT          = 'receipt';
    public const TYPE_DEMO             = 'demo';
    public const TYPE_OFFER            = 'offer';
    public const TYPE_TICKET_CREATED   = 'ticket_created';
    public const TYPE_TICKET_RESOLVED  = 'ticket_resolved';
    public const TYPE_SUSPENDED        = 'suspended';
    public const TYPE_SUSPICIOUS_LOGIN = 'suspicious_login';

    // ─── Statuts ───────────────────────────────────────────────────────────────

    public const STATUS_QUEUED  = 'queued';
    public const STATUS_SENT    = 'sent';
    public const STATUS_FAILED  = 'failed';
    public const STATUS_BOUNCED = 'bounced';

    // ─── Relations ─────────────────────────────────────────────────────────────

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ─── Scopes ────────────────────────────────────────────────────────────────

    public function scopeSent($query): mixed
    {
        return $query->where('status', self::STATUS_SENT);
    }

    public function scopeFailed($query): mixed
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    public function scopeOfType($query, string $type): mixed
    {
        return $query->where('type', $type);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Vérifie si un email avec cet idempotency_key a déjà été envoyé.
     */
    public static function alreadySent(string $idempotencyKey): bool
    {
        return self::where('idempotency_key', $idempotencyKey)
            ->where('status', self::STATUS_SENT)
            ->exists();
    }

    /**
     * Vérifie si un idempotency_key existe déjà (queued ou sent).
     */
    public static function alreadyQueued(string $idempotencyKey): bool
    {
        return self::where('idempotency_key', $idempotencyKey)->exists();
    }
}
