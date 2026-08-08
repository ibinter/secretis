<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * MfaFailed — Echec de validation d'un second facteur.
 *
 * Consomme par App\Listeners\LogSecurityEvent::handleMfaFailed() qui teste
 * property_exists($event, 'user') puis lit optional($event->user)->id.
 */
class MfaFailed
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly ?User   $user = null,
        public readonly ?string $ip   = null,
    ) {}
}
