<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\User;
use App\Services\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * SendPushNotificationJob — Délègue l'envoi push à la queue.
 *
 * Permet de ne jamais bloquer les requêtes HTTP en envoyant
 * les notifications push en arrière-plan.
 *
 * Retry : 3 tentatives avec backoff exponentiel (10 s → 30 s → 60 s).
 * Queue : 'notifications' (configurer config/queue.php si besoin).
 */
class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Nombre maximum de tentatives.
     */
    public int $tries = 3;

    /**
     * Backoff en secondes entre les tentatives (exponentiel).
     *
     * @var int[]
     */
    public array $backoff = [10, 30, 60];

    /**
     * Délai maximum d'exécution en secondes.
     */
    public int $timeout = 60;

    // ─────────────────────────────────────────────────────────────────────────

    public function __construct(
        private readonly User   $user,
        private readonly string $type,
        private readonly array  $data = [],
    ) {}

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Exécution du job.
     */
    public function handle(PushNotificationService $pushService): void
    {
        // Recharger l'utilisateur depuis la BDD pour avoir les données fraîches
        $user = $this->user->fresh();

        if (!$user || !$user->is_active) {
            Log::info('SendPushNotificationJob — utilisateur inactif ou supprimé, ignoré', [
                'user_id' => $this->user->id,
            ]);
            return;
        }

        $pushService->sendToUser($user, $this->type, $this->data);
    }

    /**
     * Callback appelé si toutes les tentatives ont échoué.
     */
    public function failed(\Throwable $e): void
    {
        Log::error('SendPushNotificationJob — toutes les tentatives ont échoué', [
            'user_id' => $this->user->id,
            'type'    => $this->type,
            'data'    => $this->data,
            'error'   => $e->getMessage(),
            'trace'   => $e->getTraceAsString(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Identifiant unique du job pour éviter les doublons dans la queue.
     * Un même utilisateur ne peut pas avoir deux jobs identiques en attente.
     */
    public function uniqueId(): string
    {
        return "push:{$this->user->id}:{$this->type}";
    }
}
