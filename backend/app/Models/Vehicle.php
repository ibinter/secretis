<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Vehicle — Véhicule de service
 *
 * @property int         $id
 * @property int         $organization_id
 * @property string      $plate_number     Immatriculation
 * @property string      $brand
 * @property string      $model
 * @property int         $year
 * @property string      $status           available|in_use|maintenance|retired
 * @property string|null $photo
 * @property string|null $current_driver   Chauffeur actuel (libre)
 * @property Carbon|null $insurance_end    Date d'expiration assurance
 * @property Carbon|null $control_end      Date d'expiration contrôle technique
 * @property Carbon|null $next_service     Date prochaine vidange
 * @property int|null    $mileage          Kilométrage actuel
 * @property string|null $fuel_type        essence|diesel|electrique|hybride
 */
class Vehicle extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'plate_number',
        'brand',
        'model',
        'year',
        'status',
        'photo',
        'current_driver',
        'insurance_end',
        'control_end',
        'next_service',
        'mileage',
        'fuel_type',
        // Colonnes GPS avancées (migration 000114)
        'gps_device_id',
        'gps_provider',
        'current_lat',
        'current_lng',
        'current_speed',
        'engine_on',
        'fuel_level_percent',
        'odometer_km',
        'last_gps_update',
    ];

    protected $casts = [
        'year'           => 'integer',
        'mileage'        => 'integer',
        'insurance_end'  => 'date',
        'control_end'    => 'date',
        'next_service'   => 'date',
        'engine_on'      => 'boolean',
        'current_lat'    => 'decimal:7',
        'current_lng'    => 'decimal:7',
        'last_gps_update'=> 'datetime',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(VehicleLog::class);
    }

    public function requests(): HasMany
    {
        return $this->hasMany(VehicleRequest::class);
    }

    // --- Nouvelles relations module avancé ---

    public function gpsLogs(): HasMany
    {
        return $this->hasMany(VehicleGpsLog::class);
    }

    public function trips(): HasMany
    {
        return $this->hasMany(VehicleTrip::class);
    }

    public function maintenanceSchedules(): HasMany
    {
        return $this->hasMany(VehicleMaintenanceSchedule::class);
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(VehicleMaintenanceLog::class);
    }

    public function fuelLogs(): HasMany
    {
        return $this->hasMany(VehicleFuelLog::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(VehicleAssignment::class);
    }

    public function activeAssignment(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(VehicleAssignment::class)
            ->where('status', 'active')
            ->latest();
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('status', 'available');
    }

    public function scopeUnderMaintenance(Builder $query): Builder
    {
        return $query->where('status', 'maintenance');
    }

    public function scopeForOrganization(Builder $query, int $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Vérifie si l'assurance est encore valide.
     */
    public function isInsuranceValid(): bool
    {
        if ($this->insurance_end === null) {
            return false;
        }

        return $this->insurance_end->isFuture();
    }

    /**
     * Vérifie si le contrôle technique est encore valide.
     */
    public function isControlValid(): bool
    {
        if ($this->control_end === null) {
            return false;
        }

        return $this->control_end->isFuture();
    }

    /**
     * Retourne les alertes actives du véhicule.
     *
     * @return array<string, mixed>  [{type, label, date, days_remaining, severity}]
     */
    public function alertsNeeded(): array
    {
        $alerts    = [];
        $threshold = 30; // jours avant expiration pour déclencher une alerte

        $checks = [
            'insurance' => [
                'date'  => $this->insurance_end,
                'label' => 'Assurance',
            ],
            'control' => [
                'date'  => $this->control_end,
                'label' => 'Contrôle technique',
            ],
            'service' => [
                'date'  => $this->next_service,
                'label' => 'Vidange / Entretien',
            ],
        ];

        foreach ($checks as $type => $check) {
            if ($check['date'] === null) {
                continue;
            }

            $daysRemaining = (int) now()->diffInDays($check['date'], false);

            if ($daysRemaining <= $threshold) {
                $alerts[] = [
                    'type'           => $type,
                    'label'          => $check['label'],
                    'date'           => $check['date']->format('Y-m-d'),
                    'days_remaining' => $daysRemaining,
                    'severity'       => $daysRemaining < 0 ? 'expired' : ($daysRemaining <= 7 ? 'critical' : 'warning'),
                ];
            }
        }

        return $alerts;
    }
}
