<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * SsoSession — Session SSO active d'un utilisateur
 *
 * @property int         $id
 * @property int         $user_id
 * @property int         $provider_id
 * @property string      $external_id      Identifiant IdP (NameID, sub, dn)
 * @property string      $session_token    Hash SHA-256
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $expires_at
 * @property \Carbon\Carbon|null $revoked_at
 */
class SsoSession extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'provider_id',
        'external_id',
        'session_token',
        'ip_address',
        'user_agent',
        'expires_at',
        'revoked_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function provider(): BelongsTo
    {
        return $this->belongsTo(SsoProvider::class, 'provider_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function isValid(): bool
    {
        return ! $this->isExpired() && ! $this->isRevoked();
    }
}
