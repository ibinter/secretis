<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ProspectDemo — Démonstration planifiée pour un prospect
 *
 * Cycle de vie : scheduled → confirmed → completed | cancelled
 *
 * @property int         $id
 * @property int         $prospect_id
 * @property \Carbon\Carbon $scheduled_at
 * @property int         $duration_min  30|45|60|90
 * @property string      $platform      zoom|teams|meet|phone|in_person
 * @property string|null $meeting_link
 * @property string      $status        scheduled|confirmed|completed|cancelled
 * @property string|null $outcome       positive|neutral|negative
 * @property string|null $result_notes
 * @property string|null $next_action
 * @property string|null $cancel_reason
 * @property int         $created_by
 */
class ProspectDemo extends Model
{
    protected $fillable = [
        'prospect_id',
        'scheduled_at',
        'duration_min',
        'platform',
        'meeting_link',
        'notes',
        'status',
        'outcome',
        'result_notes',
        'next_action',
        'cancel_reason',
        'cancelled_at',
        'cancelled_by',
        'confirmed_at',
        'confirmed_by',
        'completed_at',
        'completed_by',
        'created_by',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function prospect(): BelongsTo
    {
        return $this->belongsTo(Prospect::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getPlatformLabelAttribute(): string
    {
        return match ($this->platform) {
            'zoom'      => 'Zoom',
            'teams'     => 'Microsoft Teams',
            'meet'      => 'Google Meet',
            'phone'     => 'Téléphone',
            'in_person' => 'En personne',
            default     => ucfirst($this->platform),
        };
    }
}
