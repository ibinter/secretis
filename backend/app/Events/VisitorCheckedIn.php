<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\VisitLog;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * VisitorCheckedIn — Arrivee d'un visiteur diffusee en temps reel (Reverb).
 *
 * Diffuse par App\Jobs\NotifyHostVisitorArrived::handle() via broadcast().
 *
 * Cote frontend :
 *   Echo.private(`org.${organization_id}.accueil`)
 *       .listen('.visitor.checked_in', (e) => e.visitor / e.visit)
 *   Pages/Accueil/Dashboard.jsx, Pages/Accueil/CheckIn.jsx  -> e.visitor
 *   Pages/Reception/Dashboard.jsx                           -> e.visit
 * Les deux cles sont donc fournies dans le payload.
 */
class VisitorCheckedIn implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $queue = 'broadcasts';

    public function __construct(
        public readonly VisitLog $visit,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("org.{$this->visit->organization_id}.accueil"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'visitor.checked_in';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $visitor = $this->visit->visitor;

        $payload = [
            'id'             => $this->visit->id,
            'visit_id'       => $this->visit->id,
            'visitor_id'     => $this->visit->visitor_id,
            'first_name'     => $visitor?->first_name,
            'last_name'      => $visitor?->last_name,
            'name'           => trim(($visitor?->first_name ?? '') . ' ' . ($visitor?->last_name ?? '')),
            'company'        => $visitor?->company,
            'is_blacklisted' => (bool) ($visitor?->is_blacklisted ?? false),
            'host_id'        => $this->visit->host_id,
            'host_name'      => $this->visit->host?->name,
            'purpose'        => $this->visit->purpose,
            'badge_number'   => $this->visit->badge_number,
            'checked_in_at'  => optional($this->visit->checked_in_at)->toIso8601String(),
            'checked_out_at' => null,
            'status'         => 'present',
        ];

        return [
            'visitor'  => $payload,
            'visit'    => $payload,
            'visit_id' => $this->visit->id,
        ];
    }
}
