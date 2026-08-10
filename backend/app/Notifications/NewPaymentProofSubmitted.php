<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Order;
use App\Models\PaymentProof;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Nouvelle preuve de paiement manuelle deposee — alerte a l'admin plateforme.
 *
 * Appelee par App\Services\Payment\ManualPaymentService::notifyAdminNewProof() :
 *   Notification::route('mail', config('payment.admin_notification_email'))
 *       ->notify(new NewPaymentProofSubmitted($order, $proof));
 *
 * IMPORTANT : le destinataire est un AnonymousNotifiable route sur `mail`.
 * via() doit donc renvoyer ['mail'] uniquement (pas de canal `database`).
 */
class NewPaymentProofSubmitted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Order        $order,
        public readonly PaymentProof $proof,
    ) {
        $this->queue = 'emails';
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $amount = number_format((float) $this->order->amount, 0, ',', ' ');

        return (new MailMessage())
            ->subject('Nouvelle preuve de paiement — commande ' . $this->order->reference)
            ->greeting('Nouvelle preuve de paiement à vérifier')
            ->line('Commande : ' . $this->order->reference)
            ->line('Montant : ' . $amount . ' ' . ($this->order->currency ?? 'XOF'))
            ->line('Référence de transaction : ' . ($this->proof->transaction_reference ?: 'non renseignée'))
            ->line('Fichier : ' . ($this->proof->original_filename ?: 'pièce jointe'))
            ->action('Vérifier la preuve', config('app.url') . '/admin/paiements/preuves/' . $this->proof->id)
            ->line('Merci de valider ou rejeter cette preuve sous 24 heures.');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type'                  => 'payment_proof_submitted',
            'category'              => 'system',
            'severity'              => 'info',
            'title'                 => 'Nouvelle preuve de paiement',
            'body'                  => 'Commande ' . $this->order->reference . ' — preuve à vérifier.',
            'action_url'            => '/admin/paiements/preuves/' . $this->proof->id,
            'action_label'          => 'Vérifier',
            'order_id'              => $this->order->id,
            'order_reference'       => $this->order->reference,
            'proof_id'              => $this->proof->id,
            'transaction_reference' => $this->proof->transaction_reference,
        ];
    }
}
