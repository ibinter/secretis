<?php

namespace App\Notifications;

use App\Models\SupportTicket;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * TicketReplyNotification — Notification de réponse sur un ticket support
 *
 * Canaux : mail + in-app (database)
 */
class TicketReplyNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly SupportTicket $ticket,
        public readonly TicketMessage $message,
        public readonly User          $replier,
    ) {}

    // -------------------------------------------------------------------------
    // Canaux de notification
    // -------------------------------------------------------------------------

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    // -------------------------------------------------------------------------
    // Email
    // -------------------------------------------------------------------------

    public function toMail(object $notifiable): MailMessage
    {
        $excerpt = mb_strimwidth(strip_tags($this->message->message), 0, 100, '…');

        $url = route('support.tickets.show', $this->ticket);

        return (new MailMessage)
            ->subject("[{$this->ticket->ticket_number}] Nouvelle réponse : {$this->ticket->subject}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("Une réponse a été apportée à votre ticket **{$this->ticket->ticket_number}**.")
            ->line("**Sujet :** {$this->ticket->subject}")
            ->line("**Message :**")
            ->line($excerpt)
            ->action('Voir le ticket', $url)
            ->line('Vous pouvez répondre directement depuis l\'application SECRETIS ERP.')
            ->salutation('L\'équipe support IBIG SECRETIS');
    }

    // -------------------------------------------------------------------------
    // Base de données (in-app)
    // -------------------------------------------------------------------------

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'          => 'ticket_reply',
            'ticket_id'     => $this->ticket->id,
            'ticket_number' => $this->ticket->ticket_number,
            'subject'       => $this->ticket->subject,
            'excerpt'       => mb_strimwidth(strip_tags($this->message->message), 0, 100, '…'),
            'replier_name'  => $this->replier->name,
            'url'           => route('support.tickets.show', $this->ticket),
        ];
    }

    // -------------------------------------------------------------------------
    // Tableau (alias toDatabase pour compatibilité)
    // -------------------------------------------------------------------------

    public function toArray(object $notifiable): array
    {
        return $this->toDatabase($notifiable);
    }
}
