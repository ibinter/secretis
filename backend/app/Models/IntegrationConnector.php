<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IntegrationConnector extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'slug',
        'name',
        'category',
        'description',
        'icon_url',
        'is_official',
        'is_premium',
        'required_plan',
        'documentation_url',
        'webhook_url',
        'api_version',
        'status',
        'config_schema',
    ];

    protected $casts = [
        'is_official'   => 'boolean',
        'is_premium'    => 'boolean',
        'config_schema' => 'array',
    ];

    public function organizationIntegrations(): HasMany
    {
        return $this->hasMany(OrganizationIntegration::class, 'connector_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(IntegrationLog::class, 'connector_id');
    }
}
