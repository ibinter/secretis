<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AnnouncementDismissal — Enregistre la fermeture d'une annonce par un utilisateur.
 *
 * Une fois l'annonce fermée (dismissée), elle ne réapparaît plus pour cet utilisateur.
 * Le stockage est en base pour persister entre les sessions et les appareils.
 */
class AnnouncementDismissal extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'announcement_id',
        'user_id',
        'dismissed_at',
    ];

    protected $casts = [
        'dismissed_at' => 'datetime',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
