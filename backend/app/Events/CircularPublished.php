<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Circular;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * CircularPublished — Une circulaire vient d'etre publiee.
 *
 * Consomme par App\Listeners\SmartNotificationListener::handleCircularPublished()
 * qui lit $event->circular (->organization, ->title, ->id, ->priority).
 */
class CircularPublished
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Circular $circular,
    ) {}
}
