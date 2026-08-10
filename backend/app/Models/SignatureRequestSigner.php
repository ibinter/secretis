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

    /**
     * Le jeton EST le droit de signer : quiconque le détient signe au nom du
     * signataire, sans authentification. Il était sérialisé pour tous les
     * signataires dans la réponse de `SignatureController::show()` — n'importe
     * quel collègue consultant le détail d'une demande pouvait donc signer à la
     * place des autres. Il ne doit jamais quitter le serveur autrement que dans
     * l'email d'invitation nominatif.
     */
    protected $hidden = ['token'];

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
