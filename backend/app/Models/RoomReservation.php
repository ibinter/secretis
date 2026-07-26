<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * RoomReservation — Réservation de salle liée optionnellement à un événement
 *
 * @property string       $id
 * @property string       $organization_id
 * @property string       $room_id
 * @property string|null  $event_id
 * @property string       $user_id
 * @property \Carbon\Carbon $start_at
 * @property \Carbon\Carbon $end_at
 * @property string       $status          pending|approved|rejected
 * @property string|null  $notes
 */
class RoomReservation extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'room_id',
        'event_id',
        'user_id',
        'start_at',
        'end_at',
        'status',
        'notes',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at'   => 'datetime',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
