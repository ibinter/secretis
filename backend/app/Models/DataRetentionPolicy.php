<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * DataRetentionPolicy — généré depuis le schéma réel de la table `data_retention_policies`.
 */
class DataRetentionPolicy extends Model
{
    protected $table = 'data_retention_policies';

    protected $fillable = [
        'organization_id',
        'data_type',
        'description',
        'retention_days',
        'auto_delete',
        'last_run_at',
        'last_deleted_count',
    ];

    protected $casts = [
        'auto_delete' => 'boolean',
        'last_run_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

}
