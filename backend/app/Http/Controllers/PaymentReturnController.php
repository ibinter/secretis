<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Contrôleur des pages de retour après paiement externe
 * Gère les redirections depuis Stripe, CinetPay, Paystack, Orange Money, Wave, etc.
 */
class PaymentReturnController extends Controller
{
    /**
     * Page de retour après paiement (succès ou traitement en cours).
     * GET /payment/success?ref={order_ref}&provider={provider}
     */
    public function success(Request $request): InertiaResponse
    {
        $ref      = $request->query('ref');
        $provider = $request->query('provider');

        $order = null;

        if ($ref) {
            try {
                $order = Order::where('reference', $ref)
                    ->where('organization_id', auth()->user()->organization_id)
                    ->firstOrFail();

                // Déclencher une vérification asynchrone si le statut est encore pending
                if ($order->status === 'pending') {
                    dispatch(new \App\Jobs\VerifyPaymentStatus($order->id))->delay(now()->addSeconds(5));
                }
            } catch (ModelNotFoundException) {
                // Ordre non trouvé : on passe null, la page gère le cas
                $order = null;
            }
        }

        return Inertia::render('Payment/Success', [
            'order' => $order
                ? $order->only(['reference', 'status', 'amount', 'plan_id', 'payment_method', 'failure_reason'])
                : null,
        ]);
    }

    /**
     * Page de retour après annulation sur la passerelle de paiement.
     * GET /payment/cancel?ref={order_ref}
     */
    public function cancel(Request $request): InertiaResponse
    {
        $ref = $request->query('ref');

        // Marquer la commande comme annulée si elle existe et est encore pending
        if ($ref) {
            Order::where('reference', $ref)
                ->where('organization_id', auth()->user()->organization_id)
                ->where('status', 'pending')
                ->update(['status' => 'cancelled', 'cancelled_at' => now()]);
        }

        return Inertia::render('Payment/Cancel', [
            'ref' => $ref,
        ]);
    }
}
