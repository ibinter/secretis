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
 * VisitorCheckedOut — Depart d'un visiteur diffuse en temps reel (Reverb).
 *
 * Diffuse par App\Services\VisitorService::checkOut() via broadcast()->toOthers().
 *
 * Cote frontend :
 *   Echo.private(`org.${organization_id}.accueil`)
 *       .listen('.visitor.checked_out', (e) => e.visitor.id / e.visit_id)
 */
class VisitorCheckedOut implements ShouldBroadcast
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
        return 'visitor.checked_out';
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
            'name'           => trim(($visitor?->first_name ?? '') . ' ' . ($visitor?->last_name ?? '')),
            'checked_out_at' => optional($this->visit->checked_out_at)->toIso8601String(),
            'status'         => 'left',
        ];

        return [
            'visitor'  => $payload,
            'visit'    => $payload,
            'visit_id' => $this->visit->id,
        ];
    }
}
