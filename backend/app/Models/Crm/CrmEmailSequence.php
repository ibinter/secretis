<?php

namespace App\Models\Crm;

use Illuminate\Database\Eloquent\Model;

class CrmEmailSequence extends Model
{
    protected $table = 'crm_email_sequences';

    protected $fillable = [
        'name', 'trigger', 'steps', 'trigger_stage_id', 'is_active',
    ];

    protected $casts = [
        'steps'     => 'array',
        'is_active' => 'boolean',
    ];
}
