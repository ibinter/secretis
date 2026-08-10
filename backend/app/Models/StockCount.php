<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * StockCount — inventaire physique.
 *
 * Le stock théorique dérive toujours du réel : casse, perte, erreur de saisie.
 * Sans comptage périodique, l'écart s'accumule en silence et la valeur du
 * stock devient une fiction.
 */
class StockCount extends Model
{
    protected $fillable = [
        'organization_id', 'reference', 'count_date', 'location',
        'status', 'notes', 'created_by', 'closed_by', 'closed_at',
    ];

    protected $casts = [
        'count_date' => 'date',
        'closed_at'  => 'datetime',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(StockCountLine::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
