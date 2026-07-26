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
 * Equipment — Matériel informatique / mobilier / équipement
 *
 * @property int         $id
 * @property int         $organization_id
 * @property int|null    $assigned_user_id
 * @property string      $name
 * @property string      $serial_number
 * @property string      $category          informatique|mobilier|audiovisuel|autre
 * @property string      $status            available|assigned|maintenance|retired
 * @property string|null $brand
 * @property string|null $model
 * @property Carbon|null $purchase_date
 * @property Carbon|null $warranty_end
 * @property float|null  $purchase_price
 * @property string|null $notes
 */
class Equipment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'assigned_user_id',
        'name',
        'serial_number',
        'category',
        'status',
        'brand',
        'model',
        'purchase_date',
        'warranty_end',
        'purchase_price',
        'notes',
    ];

    protected $casts = [
        'purchase_date'  => 'date',
        'warranty_end'   => 'date',
        'purchase_price' => 'float',
    ];

    // -------------------------------------------------------------------------
    // Relations
    // -------------------------------------------------------------------------

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function maintenanceLogs(): HasMany
    {
        return $this->hasMany(EquipmentMaintenanceLog::class);
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('status', 'available');
    }

    public function scopeAssigned(Builder $query): Builder
    {
        return $query->where('status', 'assigned');
    }

    public function scopeUnderMaintenance(Builder $query): Builder
    {
        return $query->where('status', 'maintenance');
    }

    /**
     * Matériel dont la garantie expire dans les 30 prochains jours.
     */
    public function scopeWarrantyExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query
            ->whereNotNull('warranty_end')
            ->whereBetween('warranty_end', [now(), now()->addDays($days)]);
    }

    public function scopeForOrganization(Builder $query, int $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }

    // -------------------------------------------------------------------------
    // Méthodes métier
    // -------------------------------------------------------------------------

    /**
     * Vérifie si la garantie est encore valide.
     */
    public function isUnderWarranty(): bool
    {
        if ($this->warranty_end === null) {
            return false;
        }

        return $this->warranty_end->isFuture();
    }

    /**
     * Nombre de jours restants avant expiration garantie (négatif = expiré).
     */
    public function warrantyDaysRemaining(): ?int
    {
        if ($this->warranty_end === null) {
            return null;
        }

        return (int) now()->diffInDays($this->warranty_end, false);
    }
}
