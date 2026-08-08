<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataSubjectRequest extends Model
{
    use HasFactory;

    protected $table = 'data_subject_requests';

    /**
     * Aligné sur le schéma réel de `data_subject_requests`
     * (migration 2026_01_01_000105_create_gdpr_tables).
     * Les colonnes user_id / reason / processed_at N'EXISTENT PAS en base :
     * les laisser ici faisait silencieusement tomber subject_email / subject_name
     * (NOT NULL) et provoquait une 500 à chaque dépôt de demande.
     */
    protected $fillable = [
        'organization_id',
        'type',
        'subject_email',
        'subject_name',
        'status',
        'requested_at',
        'completed_at',
        'response_data',
        'handled_by',
        'rejection_reason',
        'download_token',
        'token_expires_at',
    ];

    protected $casts = [
        'requested_at'     => 'datetime',
        'completed_at'     => 'datetime',
        'token_expires_at' => 'datetime',
        'response_data'    => 'array',
    ];

    /**
     * Types de demande — doivent correspondre EXACTEMENT à la contrainte CHECK
     * posée par la migration (enum access|rectification|erasure|portability|objection).
     * L'ancienne valeur TYPE_EXPORT = 'export' violait cette contrainte.
     */
    const TYPE_ACCESS        = 'access';
    const TYPE_RECTIFICATION = 'rectification';
    const TYPE_ERASURE       = 'erasure';
    const TYPE_PORTABILITY   = 'portability';
    const TYPE_OBJECTION     = 'objection';

    /**
     * Valid statuses.
     */
    const STATUS_PENDING    = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED  = 'completed';
    const STATUS_REJECTED   = 'rejected';

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * ATTENTION : la table ne possède PAS de colonne `user_id`.
     * La personne concernée est identifiée par son adresse e-mail
     * (`subject_email`), conformément aux articles 15 à 22 du RGPD
     * (une demande peut émaner d'une personne sans compte).
     */
    public function subject()
    {
        return $this->belongsTo(User::class, 'subject_email', 'email');
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
