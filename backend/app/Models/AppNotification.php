<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AppNotification — Modèle du Centre de Notifications SECRETIS.
 *
 * Pointe sur la table réelle `notifications` (créée par la migration 090 +
 * enrichie par la migration 127 puis par la migration center columns).
 *
 * La clé primaire de `notifications` est un UUID (Laravel database notifications),
 * d'où $keyType = 'string' et $incrementing = false.
 *
 * Colonnes utilisées par NotificationCenterController / NotificationService /
 * SmartNotificationService :
 *   id, user_id, organization_id, type, title, body, data,
 *   read_at, archived_at, snoozed_until, created_at, updated_at
 */
class AppNotification extends Model
{
    use HasFactory;

    protected $table = 'notifications';

    /**
     * La table `notifications` utilise une clé primaire UUID.
     */
    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'organization_id',
        'type',
        'title',
        'body',
        'data',
        'link',
        'icon',
        'priority',
        'is_read',
        'read_at',
        'archived_at',
        'snoozed_until',
    ];

    protected $casts = [
        'data'          => 'array',
        'is_read'       => 'boolean',
        'read_at'       => 'datetime',
        'archived_at'   => 'datetime',
        'snoozed_until' => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    public function scopeNotArchived($query)
    {
        return $query->whereNull('archived_at');
    }

    /**
     * Notifications visibles maintenant (non snoozées ou dont le snooze est échu).
     */
    public function scopeVisibleNow($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('snoozed_until')
              ->orWhere('snoozed_until', '<=', now());
        });
    }
}
