<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ExpenseItem — Ligne d'une note de frais
 *
 * @property string      $id
 * @property string      $expense_report_id
 * @property string      $category           transport|accommodation|meals|other
 * @property string      $description
 * @property float       $amount
 * @property string|null $receipt_path       Chemin du justificatif uploadé
 * @property string      $expense_date       Format YYYY-MM-DD
 */
class ExpenseItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'expense_report_id',
        'category',
        'description',
        'amount',
        'receipt_path',
        'expense_date',
    ];

    protected $casts = [
        'amount'       => 'float',
        'expense_date' => 'date',
    ];

    public function expenseReport(): BelongsTo
    {
        return $this->belongsTo(ExpenseReport::class);
    }

    /**
     * Libellé de la catégorie en français.
     */
    public function getCategoryLabelAttribute(): string
    {
        return match ($this->category) {
            'transport'     => 'Transport',
            'accommodation' => 'Hébergement',
            'meals'         => 'Repas',
            'other'         => 'Divers',
            default         => $this->category,
        };
    }
}
