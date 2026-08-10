<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * QualityDocument — document du système de management de la qualité
 * (procédure, mode opératoire, enregistrement…).
 * Table : quality_documents (schéma vérifié en base live).
 */
class QualityDocument extends Model
{
    protected $table = 'quality_documents';

    protected $fillable = [
        'organization_id',
        'reference',
        'title',
        'type',
        'process_id',
        'version',
        'status',
        'approved_by',
        'approved_at',
        'review_date',
        'file_path',
        'change_log',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'review_date' => 'date',
        'change_log'  => 'array',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function process(): BelongsTo
    {
        return $this->belongsTo(QualityProcess::class, 'process_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
