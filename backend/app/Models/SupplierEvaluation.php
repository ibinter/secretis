<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * SupplierEvaluation — Évaluation d'un fournisseur (notes 1-5 + score global).
 *
 * Table réelle : `supplier_evaluations`
 * (migration 2026_01_01_000118_create_supplier_portal.php).
 *
 * Utilisé par App\Services\ProcurementService::evaluateSupplier() et
 * ::getSupplierScorecard() (qui charge la relation `evaluator`).
 */
class SupplierEvaluation extends Model
{
    protected $table = 'supplier_evaluations';

    protected $fillable = [
        'supplier_id',
        'organization_id',
        'purchase_order_id',
        'evaluation_date',
        'evaluator_user_id',
        'quality_score',
        'delivery_score',
        'price_score',
        'communication_score',
        'overall_score',
        'comments',
        'recommend',
    ];

    protected $casts = [
        'evaluation_date'     => 'date',
        'quality_score'       => 'integer',
        'delivery_score'      => 'integer',
        'price_score'         => 'integer',
        'communication_score' => 'integer',
        'overall_score'       => 'float',
        'recommend'           => 'boolean',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_user_id');
    }
}
