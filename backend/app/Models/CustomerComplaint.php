<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerComplaint extends Model
{
    protected $table = 'customer_complaints';
    protected $guarded = [];

    public function nonconformity(): BelongsTo
    {
        return $this->belongsTo(Nonconformity::class, 'nonconformity_id');
    }

    public function handledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
