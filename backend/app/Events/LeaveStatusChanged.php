<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\LeaveRequest;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * LeaveStatusChanged — Le statut d'une demande de conge a change.
 *
 * Consomme par App\Listeners\SmartNotificationListener::handleLeaveStatusChanged()
 * qui lit $event->leave (->user_id, ->status, ->start_date, ->end_date, ->id).
 *
 * NOTE : `leave_requests` porte `employee_id`, pas `user_id`.
 */
class LeaveStatusChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly LeaveRequest $leave,
        public readonly ?string      $previousStatus = null,
    ) {}
}
