<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * CustomReport — Rapport personnalisé drag-and-drop
 *
 * @property int    $id
 * @property int    $organization_id
 * @property int    $created_by
 * @property string $name
 * @property string|null $description
 * @property string $module
 * @property array  $columns
 * @property array  $filters
 * @property array  $sort
 * @property array|null $group_by
 * @property array|null $schedule
 * @property bool   $is_shared
 * @property bool   $is_template
 * @property int    $run_count
 * @property \Carbon\Carbon|null $last_run_at
 */
class CustomReport extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'created_by',
        'name',
        'description',
        'module',
        'columns',
        'filters',
        'sort',
        'group_by',
        'schedule',
        'is_shared',
        'is_template',
        'run_count',
        'last_run_at',
    ];

    protected $casts = [
        'columns'     => 'array',
        'filters'     => 'array',
        'sort'        => 'array',
        'group_by'    => 'array',
        'schedule'    => 'array',
        'is_shared'   => 'boolean',
        'is_template' => 'boolean',
        'last_run_at' => 'datetime',
    ];

    // =========================================================================
    // Relations
    // =========================================================================

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function runs(): HasMany
    {
        return $this->hasMany(CustomReportRun::class, 'report_id')->latest();
    }

    public function latestRun(): HasMany
    {
        return $this->hasMany(CustomReportRun::class, 'report_id')->latestOfMany();
    }

    // =========================================================================
    // Scopes
    // =========================================================================

    public function scopeForOrganization($query, int $orgId)
    {
        return $query->where('organization_id', $orgId);
    }

    public function scopeShared($query)
    {
        return $query->where('is_shared', true);
    }

    public function scopeTemplates($query)
    {
        return $query->where('is_template', true);
    }

    public function scopeScheduled($query)
    {
        return $query->whereNotNull('schedule');
    }
}
