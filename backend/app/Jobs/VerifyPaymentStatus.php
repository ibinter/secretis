<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Vérifie qu'une commande revenue de la page de paiement a bien été confirmée.
 *
 * `PaymentReturnController::success()` dispatchait ce job depuis toujours —
 * mais la classe n'existait pas : **la page de retour de paiement levait une
 * erreur fatale dès qu'une commande était encore en attente**, c'est-à-dire
 * exactement dans le cas le plus fréquent (Mobile Money, où le webhook arrive
 * quelques secondes après le retour du client).
 *
 * Il n'existe aucune API d'interrogation de statut côté passerelle : les
 * paiements sont confirmés par webhook. Ce job ne « vérifie » donc pas auprès
 * du prestataire — il laisse au webhook le temps d'arriver, puis **alerte
 * quelqu'un** si la commande reste en attente, pour qu'un client ayant payé ne
 * se retrouve jamais sans licence en silence.
 */
class VerifyPaymentStatus implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Trois passages : ~5 s, ~1 min, ~5 min après le retour du client. */
    public int $tries = 3;

    public array $backoff = [55, 240];

    public function __construct(
        public int $orderId,
    ) {}

    public function handle(NotificationService $notificationService): void
    {
        $order = Order::find($this->orderId);

        if (! $order) {
            Log::warning('VerifyPaymentStatus : commande introuvable', ['order_id' => $this->orderId]);

            return;
        }

        // Le webhook est arrivé entre-temps : rien à faire.
        if (in_array($order->status, ['paid', 'cancelled', 'refunded', 'expired'], true)) {
            return;
        }

        // Encore en attente : on retente jusqu'à épuisement des tentatives.
        if ($this->attempts() < $this->tries) {
            $this->release($this->backoff[$this->attempts() - 1] ?? 60);

            return;
        }

        // Dernière tentative infructueuse : la confirmation n'est pas venue.
        // On alerte plutôt que de laisser un client payant sans licence.
        Log::warning('Paiement non confirmé après le délai de grâce', [
            'order_id'  => $order->id,
            'reference' => $order->reference,
            'status'    => $order->status,
            'method'    => $order->payment_method_provider,
        ]);

        $destinataire = $order->user_id
            ? User::find($order->user_id)
            : User::where('organization_id', $order->organization_id)->orderBy('id')->first();

        if (! $destinataire) {
            return;
        }

        $notificationService->send(
            user:  $destinataire,
            type:  'system',
            title: 'Paiement en attente de confirmation',
            body:  "La commande {$order->reference} n'a pas encore été confirmée par l'opérateur.\n"
                 . "Si vous avez été débité, transmettez la preuve de paiement : notre équipe validera manuellement.",
            data:  [
                'action_url' => "/abonnement/commandes/{$order->id}",
                'order_id'   => $order->id,
                'reference'  => $order->reference,
            ],
        );
    }

    public function failed(\Throwable $e): void
    {
        Log::error('VerifyPaymentStatus en échec', [
            'order_id' => $this->orderId,
            'error'    => $e->getMessage(),
        ]);
    }
}
