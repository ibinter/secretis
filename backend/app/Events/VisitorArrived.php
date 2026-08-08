<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\User;
use App\Models\Visitor;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * VisitorArrived — Un visiteur se presente a l'accueil.
 *
 * Consomme par App\Listeners\SmartNotificationListener::handleVisitorArrived()
 * qui lit $event->visitor puis $event->host (fallback ?? User::find()).
 */
class VisitorArrived
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Visitor $visitor,
        public readonly ?User   $host = null,
    ) {}
}
