<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\VisitorAppointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Rendez-vous visiteur confirme.
 *
 * Importee par App\Http\Controllers\Public\VisitorPortalController.
 * Envoyable a un User (canal database) ou a un notifiable anonyme route sur
 * `mail` : via() adapte le canal au destinataire.
 */
class VisitorAppointmentConfirmation extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly VisitorAppointment $appointment,
    ) {
        $this->queue = 'notifications';
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return $notifiable instanceof \Illuminate\Notifications\AnonymousNotifiable
            ? ['mail']
            : ['database'];
    }

    public function toMail(object $notifiable): \Illuminate\Notifications\Messages\MailMessage
    {
        return (new \Illuminate\Notifications\Messages\MailMessage())
            ->subject('Votre rendez-vous est confirmé')
            ->greeting('Bonjour ' . $this->appointment->visitor_name . ',')
            ->line('Votre rendez-vous est confirmé pour le ' . $this->when() . '.')
            ->line('Objet : ' . $this->appointment->purpose)
            ->line('Merci de vous présenter à l\'accueil muni d\'une pièce d\'identité.')
            ->salutation('L\'équipe SECRETIS');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type'           => 'visitor_appointment_confirmed',
            'category'       => 'visitor',
            'severity'       => 'success',
            'title'          => 'Rendez-vous confirmé',
            'body'           => "Rendez-vous avec {$this->appointment->visitor_name} confirmé le {$this->when()}.",
            'action_url'     => '/accueil/rendez-vous/' . $this->appointment->id,
            'action_label'   => 'Voir le rendez-vous',
            'appointment_id' => $this->appointment->id,
            'visitor_name'   => $this->appointment->visitor_name,
            'scheduled_at'   => $this->appointment->scheduled_at instanceof \DateTimeInterface
                ? $this->appointment->scheduled_at->toIso8601String()
                : $this->appointment->scheduled_at,
        ];
    }

    private function when(): string
    {
        return $this->appointment->scheduled_at instanceof \DateTimeInterface
            ? $this->appointment->scheduled_at->format('d/m/Y a H:i')
            : (string) $this->appointment->scheduled_at;
    }
}
