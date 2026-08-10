<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SignatureRequest extends Model
{
    protected $fillable = [
        'organization_id', 'document_id', 'title', 'message',
        'status', 'signing_order', 'expires_at', 'completed_at', 'created_by',
    ];

    protected $casts = [
        'expires_at'   => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function signers(): HasMany
    {
        return $this->hasMany(SignatureRequestSigner::class, 'request_id');
    }

    public function signatures(): HasMany
    {
        return $this->hasMany(DocumentSignature::class, 'request_id');
    }

    public function auditTrail(): HasMany
    {
        return $this->hasMany(SignatureAuditTrail::class, 'request_id');
    }
}
