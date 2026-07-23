<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * UserPrivacyConsent — Préférences de consentement cookies RGPD.
 *
 * @property int         $id
 * @property int         $user_id
 * @property bool        $preferences
 * @property bool        $statistics
 * @property bool        $marketing
 * @property bool        $ai_sara
 * @property \Carbon\Carbon|null $consented_at
 * @property string|null $ip_address
 */
class UserPrivacyConsent extends Model
{
    use HasFactory;

    protected $table = 'user_privacy_consents';

    protected $fillable = [
        'user_id',
        'preferences',
        'statistics',
        'marketing',
        'ai_sara',
        'consented_at',
        'ip_address',
    ];

    protected $casts = [
        'preferences'  => 'boolean',
        'statistics'   => 'boolean',
        'marketing'    => 'boolean',
        'ai_sara'      => 'boolean',
        'consented_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
