<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AuditFinding — généré depuis le schéma réel de la table `audit_findings`.
 */
class AuditFinding extends Model
{
    protected $table = 'audit_findings';

    protected $fillable = [
        'audit_id',
        'organization_id',
        'finding_type',
        'clause_iso',
        'process_id',
        'description',
        'evidence',
        'risk_level',
        'status',
        'nonconformity_id',
    ];

    public function audit(): BelongsTo
    {
        return $this->belongsTo(QualityAudit::class, 'audit_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function process(): BelongsTo
    {
        return $this->belongsTo(QualityProcess::class, 'process_id');
    }

    public function nonconformity(): BelongsTo
    {
        return $this->belongsTo(Nonconformity::class, 'nonconformity_id');
    }

}
