<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * LegalArchiveLog — généré depuis le schéma réel de la table `legal_archive_log`.
 */
class LegalArchiveLog extends Model
{
    protected $table = 'legal_archive_log';

    protected $fillable = [
        'document_id',
        'organization_id',
        'archive_date',
        'expiry_date',
        'sha256_hash',
        'timestamp_token',
        'storage_driver',
        'storage_path',
        'retrieval_count',
        'last_retrieved_at',
        'category',
        'retention_years',
        'archived_by',
        'integrity_verified',
        'last_verified_at',
    ];

    protected $casts = [
        'archive_date' => 'datetime',
        'expiry_date' => 'datetime',
        'last_retrieved_at' => 'datetime',
        'integrity_verified' => 'boolean',
        'last_verified_at' => 'datetime',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'document_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function archiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

}
