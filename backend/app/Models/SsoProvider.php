<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * SsoProvider — Provider SSO d'une organisation
 *
 * @property int         $id
 * @property int         $organization_id
 * @property string      $name
 * @property string      $type             saml | ldap | oidc
 * @property bool        $is_active
 * @property string      $config           JSON chiffré (AES-256-GCM)
 * @property array|null  $email_domains
 * @property \Carbon\Carbon|null $last_sync_at
 * @property array|null  $last_sync_stats
 */
class SsoProvider extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'type',
        'is_active',
        'config',
        'email_domains',
        'last_sync_at',
        'last_sync_stats',
    ];

    protected $casts = [
        'is_active'       => 'boolean',
        'email_domains'   => 'array',
        'last_sync_stats' => 'array',
        'last_sync_at'    => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(SsoSession::class, 'provider_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'sso_provider_id');
    }
}
