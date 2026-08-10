<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class Circular extends Model
{
    protected $table = 'circulars';
    protected $guarded = [];

    protected $casts = [
        'recipient_ids'   => 'array',
        'acknowledged_by' => 'array',
        'attachments'     => 'array',
        'published_at'    => 'datetime',
        'expires_at'      => 'datetime',
        'requires_acknowledgement' => 'boolean',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recipients(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\CircularRecipient::class);
    }
}
