<?php

namespace App\Console\Commands;

use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * ExpireUnpaidOrders — Annule les commandes non payées après 48h
 *
 * Planification recommandée : toutes les heures (schedule:run)
 * Schedule : $schedule->command('secretis:expire-unpaid-orders')->hourly();
 */
class ExpireUnpaidOrders extends Command
{
    protected $signature   = 'secretis:expire-unpaid-orders';
    protected $description = 'Annule les commandes en attente de paiement depuis plus de 48h';

    public function handle(): int
    {
        $this->info('Vérification des commandes expirées...');

        $now     = Carbon::now();
        $expired = Order::whereIn('status', ['pending', 'awaiting_proof'])
                        ->where('expires_at', '<', $now)
                        ->with(['organization', 'user'])
                        ->get();

        if ($expired->isEmpty()) {
            $this->info('Aucune commande expirée.');
            return self::SUCCESS;
        }

        $count = 0;

        foreach ($expired as $order) {
            $order->update(['status' => 'cancelled']);

            // Notifier le client
            try {
                \Illuminate\Support\Facades\Mail::to($order->organization->email)
                    ->send(new \App\Mail\OrderExpired($order));
            } catch (\Throwable $e) {
                Log::error('Email expiration commande non envoyé', [
                    'order_id' => $order->id,
                    'error'    => $e->getMessage(),
                ]);
            }

            Log::info('Commande expirée et annulée', [
                'order_id'   => $order->id,
                'reference'  => $order->reference,
                'expired_at' => $order->expires_at,
                'org_id'     => $order->organization_id,
            ]);

            $count++;
        }

        $this->info("{$count} commande(s) annulée(s).");

        return self::SUCCESS;
    }
}
