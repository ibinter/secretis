<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * CorrectiveAction — généré depuis le schéma réel de la table `corrective_actions`.
 */
class CorrectiveAction extends Model
{
    protected $table = 'corrective_actions';

    protected $fillable = [
        'nonconformity_id',
        'organization_id',
        'description',
        'responsible_user_id',
        'due_date',
        'status',
        'effectiveness_rating',
        'completed_at',
        'evidence_path',
        'notes',
    ];

    protected $casts = [
        'due_date' => 'date',
        'completed_at' => 'datetime',
    ];

    public function nonconformity(): BelongsTo
    {
        return $this->belongsTo(Nonconformity::class, 'nonconformity_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_user_id');
    }

}
