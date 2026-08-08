<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * QualityAudit — audit qualité (interne, externe, certification).
 * Table : quality_audits (schéma vérifié en base live).
 */
class QualityAudit extends Model
{
    protected $table = 'quality_audits';

    protected $fillable = [
        'organization_id',
        'reference',
        'title',
        'audit_type',
        'scope',
        'auditor_name',
        'auditor_user_id',
        'audit_date_start',
        'audit_date_end',
        'status',
        'findings_count_nc',
        'findings_count_obs',
        'findings_count_positive',
        'report_path',
        'next_audit_date',
        'created_by',
    ];

    protected $casts = [
        'audit_date_start'        => 'date',
        'audit_date_end'          => 'date',
        'next_audit_date'         => 'date',
        'findings_count_nc'       => 'integer',
        'findings_count_obs'      => 'integer',
        'findings_count_positive' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auditor_user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeForOrganization($query, $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function findings(): HasMany
    {
        return $this->hasMany(AuditFinding::class, 'audit_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
