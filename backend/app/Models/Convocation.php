<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Convocation extends Model
{
    protected $fillable = [
        'organization_id',
        'meeting_id',
        'user_id',
        'sent_by',
        'sent_at',
        'status',
        'response_at',
        'response_note',
        'pdf_path',
    ];

    protected $casts = [
        'sent_at'     => 'datetime',
        'response_at' => 'datetime',
    ];

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
