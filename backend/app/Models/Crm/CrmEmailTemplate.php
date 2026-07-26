<?php

namespace App\Models\Crm;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmEmailTemplate extends Model
{
    protected $table = 'crm_email_templates';

    protected $fillable = [
        'name', 'subject', 'body_html', 'body_text',
        'category', 'variables', 'created_by', 'is_active',
    ];

    protected $casts = [
        'variables' => 'array',
        'is_active' => 'boolean',
    ];

    public function emailLogs(): HasMany
    {
        return $this->hasMany(CrmEmailLog::class, 'template_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
