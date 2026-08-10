<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Event as CalendarEvent;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * EventCreated — Un evenement d'agenda vient d'etre cree.
 *
 * Consomme par App\Listeners\SmartNotificationListener::handleEventCreated()
 * qui lit $event->event puis $event->creator (fallback ?? sur le modele).
 */
class EventCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly CalendarEvent $event,
        public readonly ?User         $creator = null,
    ) {}
}
