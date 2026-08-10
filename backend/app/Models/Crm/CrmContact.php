<?php

namespace App\Models\Crm;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmContact extends Model
{
    protected $table = 'crm_contacts';

    protected $fillable = [
        'type', 'company_name', 'contact_name', 'email', 'phone',
        'country', 'city', 'sector', 'employee_count', 'annual_revenue',
        'source', 'status', 'assigned_to', 'notes', 'bant_score', 'tags',
        'last_contact_at',
    ];

    protected $casts = [
        'tags'            => 'array',
        'last_contact_at' => 'datetime',
        'annual_revenue'  => 'integer',
        'bant_score'      => 'integer',
        'employee_count'  => 'integer',
    ];

    public function deals(): HasMany
    {
        return $this->hasMany(CrmDeal::class, 'contact_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class, 'contact_id')->orderByDesc('created_at');
    }

    public function emailLogs(): HasMany
    {
        return $this->hasMany(CrmEmailLog::class, 'contact_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function getBantColorAttribute(): string
    {
        return match(true) {
            $this->bant_score >= 75 => 'green',
            $this->bant_score >= 50 => 'amber',
            $this->bant_score >= 25 => 'orange',
            default                 => 'red',
        };
    }
}
