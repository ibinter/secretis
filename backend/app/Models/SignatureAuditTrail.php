<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SignatureAuditTrail extends Model
{
    // La table est au SINGULIER dans la migration 000096 ; sans cette ligne
    // Eloquent visait `signature_audit_trails` et chaque écriture échouait.
    // L'erreur était avalée par le `catch` de `logAuditEvent`, mais elle
    // avortait la transaction PostgreSQL en cours : TOUTE création de demande
    // de signature échouait ensuite sur un « transaction is aborted » opaque.
    protected $table = 'signature_audit_trail';

    public const UPDATED_AT = null; // Pas de updated_at

    protected $fillable = [
        'request_id', 'event_type', 'actor_email', 'actor_ip', 'data',
    ];

    protected $casts = [
        'data'       => 'array',
        'created_at' => 'datetime',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(SignatureRequest::class);
    }
}
