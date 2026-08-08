<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * AppointmentSlot — Créneau de rendez-vous configurable par l'organisation.
 *
 * Un créneau appartient à une organisation et (optionnellement) à un hôte.
 * Il devient indisponible dès qu'il est réservé (booked_at renseigné) ou
 * si is_available passe à false.
 *
 * @property int         $id
 * @property int         $organization_id
 * @property int|null    $host_id
 * @property string      $date        Format Y-m-d
 * @property string      $start_time  Format H:i:s
 * @property string      $end_time    Format H:i:s
 * @property string|null $location
 * @property bool        $is_available
 * @property \Illuminate\Support\Carbon|null $booked_at
 */
class AppointmentSlot extends Model
{
    protected $table = 'appointment_slots';

    protected $fillable = [
        'organization_id',
        'host_id',
        'date',
        'start_time',
        'end_time',
        'location',
        'is_available',
        'booked_at',
    ];

    protected $casts = [
        'date'         => 'date',
        'is_available' => 'boolean',
        'booked_at'    => 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function appointment(): HasOne
    {
        return $this->hasOne(Appointment::class, 'slot_id');
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Créneaux réellement réservables : marqués disponibles et non encore réservés.
     */
    public function scopeBookable($query)
    {
        return $query->where('is_available', true)->whereNull('booked_at');
    }
}
