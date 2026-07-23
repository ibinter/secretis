<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaraConversation extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'title',
        'context_module',
        'messages',
        'tokens_used',
        'provider',
        'model_used',
        'feedback',
        'feedback_comment',
    ];

    protected $casts = [
        'messages'    => 'array',
        'tokens_used' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Ajouter un message à la conversation.
     */
    public function addMessage(string $role, string $content): void
    {
        $messages   = $this->messages ?? [];
        $messages[] = [
            'role'      => $role,
            'content'   => $content,
            'timestamp' => now()->toIso8601String(),
        ];
        $this->messages = $messages;
    }

    /**
     * Scope : conversations de l'organisation courante.
     */
    public function scopeForOrganization($query, int $orgId)
    {
        return $query->where('organization_id', $orgId);
    }

    /**
     * Scope : conversations de l'utilisateur courant.
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}
