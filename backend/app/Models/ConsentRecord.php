<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ConsentRecord — généré depuis le schéma réel de la table `consent_records`.
 */
class ConsentRecord extends Model
{
    protected $table = 'consent_records';

    protected $fillable = [
        'organization_id',
        'user_id',
        'visitor_id',
        'consent_type',
        'granted_at',
        'revoked_at',
        'ip_address',
        'proof_text',
        'version',
    ];

    protected $casts = [
        'granted_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class, 'visitor_id');
    }

}
