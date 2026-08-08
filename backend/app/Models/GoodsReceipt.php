<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * GoodsReceipt — Bon de réception (BR-AAAA-NNNNN).
 *
 * Table réelle : `goods_receipts`
 * (migration 2026_01_01_000118_create_supplier_portal.php).
 *
 * Utilisé par App\Services\ProcurementService::receiveGoods().
 */
class GoodsReceipt extends Model
{
    protected $table = 'goods_receipts';

    protected $fillable = [
        'purchase_order_id',
        'organization_id',
        'receipt_number',
        'received_by',
        'received_date',
        'items_received',
        'status',
        'notes',
        'signature_path',
    ];

    protected $casts = [
        'items_received' => 'array',
        'received_date'  => 'date',
    ];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
