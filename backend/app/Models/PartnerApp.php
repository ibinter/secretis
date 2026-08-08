<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * PartnerApp — généré depuis le schéma réel de la table `partner_apps`.
 */
class PartnerApp extends Model
{
    protected $table = 'partner_apps';

    protected $fillable = [
        'name',
        'partner_email',
        'webhook_secret',
        'scopes',
        'is_approved',
        'callback_url',
        'client_id',
        'client_secret',
    ];

    protected $casts = [
        'scopes' => 'array',
        'is_approved' => 'boolean',
    ];

}
