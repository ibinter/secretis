<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * QualityProcess — processus qualité (cartographie SMQ).
 * Table : quality_processes (schéma vérifié en base live).
 */
class QualityProcess extends Model
{
    protected $table = 'quality_processes';

    protected $fillable = [
        'organization_id',
        'code',
        'name',
        'category',
        'description',
        'owner_user_id',
        'is_documented',
        'document_path',
        'version',
        'last_review_date',
    ];

    protected $casts = [
        'is_documented'    => 'boolean',
        'last_review_date' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function nonconformities(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Nonconformity::class, 'process_id');
    }

    public function ownerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }
}
