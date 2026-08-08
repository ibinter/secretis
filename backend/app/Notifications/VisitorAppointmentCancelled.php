<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\VisitorAppointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Rendez-vous visiteur annule.
 *
 * Importee par App\Http\Controllers\Public\VisitorPortalController.
 * Le motif est lu sur la colonne `cancellation_reason` si non fourni.
 */
class VisitorAppointmentCancelled extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly VisitorAppointment $appointment,
        public readonly ?string            $reason = null,
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
        $message = (new \Illuminate\Notifications\Messages\MailMessage())
            ->subject('Votre rendez-vous a été annulé')
            ->greeting('Bonjour ' . $this->appointment->visitor_name . ',')
            ->line('Votre rendez-vous du ' . $this->when() . ' a été annulé.');

        if ($this->motive()) {
            $message->line('Motif : ' . $this->motive());
        }

        return $message->salutation('L\'équipe SECRETIS');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type'           => 'visitor_appointment_cancelled',
            'category'       => 'visitor',
            'severity'       => 'warning',
            'title'          => 'Rendez-vous annulé',
            'body'           => "Le rendez-vous avec {$this->appointment->visitor_name} du {$this->when()} a été annulé."
                              . ($this->motive() ? ' Motif : ' . $this->motive() : ''),
            'action_url'     => '/accueil/rendez-vous',
            'action_label'   => 'Voir les rendez-vous',
            'appointment_id' => $this->appointment->id,
            'visitor_name'   => $this->appointment->visitor_name,
            'reason'         => $this->motive(),
        ];
    }

    private function motive(): ?string
    {
        return $this->reason ?? $this->appointment->cancellation_reason;
    }

    private function when(): string
    {
        return $this->appointment->scheduled_at instanceof \DateTimeInterface
            ? $this->appointment->scheduled_at->format('d/m/Y a H:i')
            : (string) $this->appointment->scheduled_at;
    }
}
