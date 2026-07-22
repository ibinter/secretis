<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Calendar — Agenda (personnel, partagé, organisationnel)
 *
 * @property string  $id
 * @property string  $organization_id
 * @property string  $user_id
 * @property string  $name
 * @property string  $color          Code hex (#RRGGBB)
 * @property string  $type           personal|shared|organization
 * @property bool    $is_default
 */
class Calendar extends Model
{
    use HasFactory;

    protected $fillable = [
        'organization_id',
        'user_id',
        'name',
        'color',
        'type',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeForOrganization(Builder $query, string $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    public function scopeAccessibleBy(Builder $query, string $userId): Builder
    {
        return $query->where(function (Builder $q) use ($userId) {
            $q->where('user_id', $userId)          // Calendriers personnels
              ->orWhere('type', 'organization');    // Calendriers org (visibles par tous)
            // TODO : ajouter les calendriers partagés via une table pivot si nécessaire
        });
    }
}
