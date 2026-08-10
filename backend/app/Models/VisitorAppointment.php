<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * VisitorAppointment — généré depuis le schéma réel de la table `visitor_appointments`.
 */
class VisitorAppointment extends Model
{
    protected $table = 'visitor_appointments';

    protected $fillable = [
        'organization_id',
        'host_id',
        'visitor_id',
        'visitor_name',
        'visitor_email',
        'visitor_phone',
        'visitor_company',
        'purpose',
        'description',
        'scheduled_at',
        'duration_minutes',
        'status',
        'confirmation_token',
        'confirmed_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class, 'visitor_id');
    }

}
