<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Message — message d'une conversation.
 * Colonnes réelles (vérifiées en base) : conversation_id, user_id, body, type,
 * attachments (json), reply_to_id, read_at, is_edited, edited_at, is_deleted, deleted_at.
 * NB : pas de colonnes sender_id/content/metadata (schéma jamais appliqué).
 */
class Message extends Model
{
    protected $table = 'messages';
    protected $guarded = [];

    public function reads(): HasMany
    {
        return $this->hasMany(\App\Models\MessageRead::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class, 'conversation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Alias historique : du code appelle encore `sender` (colonne réelle : user_id). */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reply_to_id');
    }
}
