<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\MailRegistry;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * CourrierReceived — Un courrier vient d'etre enregistre au registre.
 *
 * Consomme par App\Listeners\SmartNotificationListener::handleCourrierReceived()
 * qui lit $event->mail (->priority, ->organization, ->reference, ->subject, ->id).
 *
 * NOTE : la table `mail_registry` porte la colonne `urgency`, pas `priority`.
 */
class CourrierReceived
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly MailRegistry $mail,
    ) {}
}
