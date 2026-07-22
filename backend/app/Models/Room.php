<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Room — Salle de réunion ou espace partagé
 *
 * @property string  $id
 * @property string  $organization_id
 * @property string  $name
 * @property string|null $location
 * @property int     $capacity
 * @property array   $equipment       [{name: string, quantity: int}]
 * @property array   $photos          [url, ...]
 * @property bool    $is_active
 */
class Room extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'name',
        'location',
        'capacity',
        'equipment',
        'photos',
        'is_active',
    ];

    protected $casts = [
        'capacity'  => 'integer',
        'equipment' => 'array',
        'photos'    => 'array',
        'is_active' => 'boolean',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(RoomReservation::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeForOrganization(Builder $query, string $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Vérifie si la salle est disponible pour un créneau donné.
     *
     * @param \Carbon\Carbon $start
     * @param \Carbon\Carbon $end
     * @param string|null    $excludeReservationId Exclure une réservation (pour l'édition)
     */
    public function isAvailableFor(\Carbon\Carbon $start, \Carbon\Carbon $end, ?string $excludeReservationId = null): bool
    {
        $query = $this->reservations()
            ->where('status', '!=', 'rejected')
            ->where(function (Builder $q) use ($start, $end) {
                // Chevauchement : les deux créneaux se croisent si start1 < end2 && end1 > start2
                $q->where('start_at', '<', $end)
                  ->where('end_at', '>', $start);
            });

        if ($excludeReservationId) {
            $query->where('id', '!=', $excludeReservationId);
        }

        return $query->doesntExist();
    }
}
