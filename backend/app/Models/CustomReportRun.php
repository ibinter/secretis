<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * CustomReportRun — Exécution d'un rapport personnalisé
 *
 * @property int    $id
 * @property int    $report_id
 * @property int|null $run_by
 * @property string $format   pdf | excel | csv | json
 * @property string $status   pending | processing | completed | failed
 * @property string|null $file_path
 * @property int|null    $row_count
 * @property int|null    $duration_ms
 * @property string|null $error_message
 * @property \Carbon\Carbon|null $expires_at
 */
class CustomReportRun extends Model
{
    protected $fillable = [
        'report_id',
        'run_by',
        'format',
        'status',
        'file_path',
        'row_count',
        'duration_ms',
        'error_message',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    // =========================================================================
    // Relations
    // =========================================================================

    public function report(): BelongsTo
    {
        return $this->belongsTo(CustomReport::class, 'report_id');
    }

    public function runner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'run_by');
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function hasFile(): bool
    {
        return $this->file_path !== null && ! $this->isExpired();
    }
}
