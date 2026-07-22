<?php

namespace App\Models\Crm;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmEmailLog extends Model
{
    protected $table = 'crm_email_logs';

    protected $fillable = [
        'contact_id', 'template_id', 'subject', 'to_email',
        'message_id', 'sent_at', 'opened_at', 'clicked_at',
        'bounced_at', 'bounce_reason',
    ];

    protected $casts = [
        'sent_at'    => 'datetime',
        'opened_at'  => 'datetime',
        'clicked_at' => 'datetime',
        'bounced_at' => 'datetime',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(CrmEmailTemplate::class, 'template_id');
    }

    public function getStatusAttribute(): string
    {
        if ($this->bounced_at) return 'bounced';
        if ($this->clicked_at) return 'clicked';
        if ($this->opened_at) return 'opened';
        if ($this->sent_at) return 'sent';
        return 'pending';
    }
}
