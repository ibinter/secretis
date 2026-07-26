<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DataSubjectRequest extends Model
{
    use HasFactory;

    protected $table = 'data_subject_requests';

    protected $fillable = [
        'organization_id',
        'user_id',
        'type',
        'status',
        'reason',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];

    /**
     * Valid request types.
     */
    const TYPE_ERASURE       = 'erasure';
    const TYPE_EXPORT        = 'export';
    const TYPE_RECTIFICATION = 'rectification';

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

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

