<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * PrivacyIncident — généré depuis le schéma réel de la table `privacy_incidents`.
 */
class PrivacyIncident extends Model
{
    protected $table = 'privacy_incidents';

    protected $fillable = [
        'organization_id',
        'title',
        'description',
        'severity',
        'affected_users_count',
        'discovered_at',
        'reported_at',
        'status',
        'notified_authority',
        'notified_users',
        'containment_measures',
        'reported_by',
    ];

    protected $casts = [
        'discovered_at' => 'datetime',
        'reported_at' => 'datetime',
        'notified_authority' => 'boolean',
        'notified_users' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

}
