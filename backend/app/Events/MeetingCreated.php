<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Meeting;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * MeetingCreated — Une reunion vient d'etre planifiee.
 *
 * Consomme par App\Listeners\SmartNotificationListener::handleMeetingCreated()
 * qui lit $event->meeting (->participants, ->title, ->start_at, ->location, ->id).
 */
class MeetingCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Meeting $meeting,
    ) {}
}
