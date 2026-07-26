<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SignatureRequestSigner extends Model
{
    protected $fillable = [
        'request_id', 'user_id', 'name', 'email', 'order',
        'status', 'signed_at', 'decline_reason', 'ip_address', 'user_agent', 'token',
    ];

    protected $casts = [
        'signed_at' => 'datetime',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(SignatureRequest::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function signature(): HasOne
    {
        return $this->hasOne(DocumentSignature::class, 'signer_id');
    }
}
