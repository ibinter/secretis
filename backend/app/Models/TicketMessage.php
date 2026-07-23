<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * TicketMessage — Message / réponse d'un ticket de support
 *
 * @property int    $id
 * @property int    $ticket_id
 * @property int    $user_id
 * @property string $message
 * @property bool   $is_internal   Note interne — invisible côté client
 * @property array  $attachments   [{name, path, size, mime}]
 * @property bool   $is_auto_reply
 */
class TicketMessage extends Model
{
    use HasFactory;

    protected $table = 'ticket_messages';

    protected $fillable = [
        'ticket_id',
        'user_id',
        'message',
        'is_internal',
        'attachments',
        'is_auto_reply',
    ];

    protected $casts = [
        'attachments'   => 'array',
        'is_internal'   => 'boolean',
        'is_auto_reply' => 'boolean',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // -------------------------------------------------------------------------
    // Boot
    // -------------------------------------------------------------------------

    protected static function booted(): void
    {
        static::creating(function (self $message) {
            $message->is_internal   = $message->is_internal   ?? false;
            $message->is_auto_reply = $message->is_auto_reply ?? false;
            $message->attachments   = $message->attachments   ?? [];
        });
    }
}
