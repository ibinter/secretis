<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * DataProcessingRecord — généré depuis le schéma réel de la table `data_processing_records`.
 */
class DataProcessingRecord extends Model
{
    use SoftDeletes;

    protected $table = 'data_processing_records';

    protected $fillable = [
        'organization_id',
        'name',
        'purpose',
        'legal_basis',
        'data_categories',
        'data_subjects',
        'retention_period_days',
        'third_parties',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'data_categories' => 'array',
        'data_subjects' => 'array',
        'third_parties' => 'array',
        'is_active' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

}
