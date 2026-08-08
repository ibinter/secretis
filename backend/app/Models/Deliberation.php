<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Deliberation extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'meeting_id',
        'reference',
        'title',
        'body',
        'decision',
        'action_required',
        'responsible_id',
        'deadline',
        'status',
        'category',
        'position',
        'created_by',
    ];

    protected $casts = [
        'deadline' => 'date',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
