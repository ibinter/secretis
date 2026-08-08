<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * LandingAnalytic — généré depuis le schéma réel de la table `landing_analytics`.
 */
class LandingAnalytic extends Model
{
    protected $table = 'landing_analytics';

    protected $fillable = [
        'event_type',
        'page',
        'element',
        'session_id',
        'referrer',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'country',
        'region',
        'device_type',
        'browser',
        'os',
        'is_returning',
        'cookie_consent',
        'time_on_page',
    ];

    protected $casts = [
        'is_returning' => 'boolean',
        'cookie_consent' => 'boolean',
    ];

}
