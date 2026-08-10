<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Supply;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * StockCritical — Une fourniture est passee sous son seuil minimum.
 *
 * Consomme par App\Listeners\SmartNotificationListener::handleStockCritical()
 * qui lit $event->supply (->organization_id, ->name, ->current_stock, ->unit,
 * ->minimum_stock, ->id).
 */
class StockCritical
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Supply $supply,
    ) {}
}
