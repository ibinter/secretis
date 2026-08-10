<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ParkingSpot — Place de parking gérée par l'accueil.
 *
 * Table réelle : `parking_spots`
 * (migration 2026_01_01_000111_create_visitor_management.php)
 * Colonnes : organization_id, spot_number, zone, is_available, current_visitor_id.
 *
 * Importé par App\Services\VisitorService (l'import n'est pas encore exploité).
 */
class ParkingSpot extends Model
{
    protected $table = 'parking_spots';

    protected $fillable = [
        'organization_id',
        'spot_number',
        'zone',
        'is_available',
        'current_visitor_id',
    ];

    protected $casts = [
        'is_available' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function currentVisitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class, 'current_visitor_id');
    }
}
