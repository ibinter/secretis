<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentSignature extends Model
{
    protected $fillable = [
        'request_id', 'signer_id', 'document_id',
        'signature_data', 'signature_image_path', 'certificate_data',
        'signed_at', 'ip_address',
    ];

    protected $casts = [
        'signature_data'   => 'array',
        'certificate_data' => 'array',
        'signed_at'        => 'datetime',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(SignatureRequest::class);
    }

    public function signer(): BelongsTo
    {
        return $this->belongsTo(SignatureRequestSigner::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
