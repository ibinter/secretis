<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JournalEntry extends Model
{
    protected $fillable = [
        'organization_id',
        'entry_number',
        'entry_date',
        'description',
        'reference',
        'journal_type',
        'is_locked',
        'fiscal_year_id',
        'created_by',
        'validated_by',
        'validated_at',
    ];

    protected $casts = [
        'entry_date'    => 'date',
        'is_locked'     => 'boolean',
        'validated_at'  => 'datetime',
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(JournalLine::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function getTotalDebitAttribute(): float
    {
        return (float) $this->lines->sum('debit_amount');
    }

    public function getTotalCreditAttribute(): float
    {
        return (float) $this->lines->sum('credit_amount');
    }

    public function isBalanced(): bool
    {
        return abs($this->total_debit - $this->total_credit) < 0.01;
    }

    public static function journalTypeLabel(string $type): string
    {
        return [
            'AN' => 'À-nouveaux',
            'OD' => 'Opérations diverses',
            'VE' => 'Ventes',
            'AC' => 'Achats',
            'BQ' => 'Banque',
            'SA' => 'Salaires',
            'CA' => 'Caisse',
        ][$type] ?? $type;
    }
}
