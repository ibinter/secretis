<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ImportJob — Wizard d'import universel CSV/XLSX
 *
 * @property int    $id
 * @property int    $organization_id
 * @property int    $user_id
 * @property string $module
 * @property string $file_path
 * @property string $original_filename
 * @property string $file_type   csv | xlsx
 * @property array|null $column_mapping
 * @property array|null $import_options
 * @property string $status  pending | mapping | validating | importing | completed | failed
 * @property int    $total_rows
 * @property int    $valid_rows
 * @property int    $imported_rows
 * @property int    $skipped_rows
 * @property int    $error_rows
 * @property array|null $validation_errors
 * @property array|null $import_summary
 */
class ImportJob extends Model
{
    protected $fillable = [
        'organization_id',
        'user_id',
        'module',
        'file_path',
        'original_filename',
        'file_type',
        'column_mapping',
        'import_options',
        'status',
        'total_rows',
        'valid_rows',
        'imported_rows',
        'skipped_rows',
        'error_rows',
        'validation_errors',
        'import_summary',
    ];

    protected $casts = [
        'column_mapping'   => 'array',
        'import_options'   => 'array',
        'validation_errors'=> 'array',
        'import_summary'   => 'array',
    ];

    // =========================================================================
    // Relations
    // =========================================================================

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function hasErrors(): bool
    {
        return $this->error_rows > 0;
    }

    public function progressPercent(): int
    {
        if ($this->total_rows === 0) {
            return 0;
        }

        return (int) round(($this->imported_rows / $this->total_rows) * 100);
    }
}
