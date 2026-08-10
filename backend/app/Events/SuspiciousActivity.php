<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * SuspiciousActivity — Activite suspecte detectee sur un compte.
 *
 * Consomme par App\Listeners\LogSecurityEvent::handleSuspiciousActivity() qui
 * teste property_exists($event, 'description') et property_exists($event, 'userId').
 */
class SuspiciousActivity
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param array<string, mixed> $context
     */
    public function __construct(
        public readonly string $description,
        public readonly ?int   $userId  = null,
        public readonly array  $context = [],
    ) {}
}
