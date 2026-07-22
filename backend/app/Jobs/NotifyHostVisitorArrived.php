<?php

namespace App\Jobs;

use App\Models\VisitLog;
use App\Notifications\VisitorArrivedNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotifyHostVisitorArrived implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(public readonly VisitLog $visit)
    {
    }

    public function handle(): void
    {
        $visit = $this->visit->load(['visitor', 'host', 'organization']);
        $host  = $visit->host;

        if (!$host) {
            return;
        }

        // Notification Laravel (email + broadcast)
        $host->notify(new VisitorArrivedNotification($visit));

        // Email explicite via Mailable
        \Mail::to($host->email)
            ->send(new \App\Mail\VisitorArrivedMail($visit));

        // Push notification mobile (via FCM / Expo Push)
        if ($host->fcm_token) {
            app(\App\Services\PushNotificationService::class)->send(
                $host->fcm_token,
                'Visiteur arrivé',
                "Votre visiteur {$visit->visitor->full_name} est arrivé en réception.",
                [
                    'visit_id'    => $visit->id,
                    'visitor_id'  => $visit->visitor_id,
                    'check_in_at' => $visit->check_in_at->toISOString(),
                ]
            );
        }

        // Broadcast WebSocket temps réel via Reverb
        broadcast(new \App\Events\VisitorCheckedIn($visit));
    }
}
