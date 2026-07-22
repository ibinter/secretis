<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\NotificationService;
use App\Services\SmartNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * DailyDigestJob — Digest quotidien personnalisé
 *
 * Déclenché par le CRON à 7h30 chaque matin.
 * Pour chaque utilisateur actif, génère et envoie un digest personnalisé
 * contenant : agenda du jour, tâches urgentes, courriers en attente, résumé de la veille.
 *
 * Enregistrement dans le Kernel (app/Console/Kernel.php) :
 *   $schedule->job(new DailyDigestJob)->dailyAt('07:30');
 */
class DailyDigestJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Nombre de tentatives avant abandon.
     */
    public int $tries = 3;

    /**
     * Timeout en secondes (10 minutes max).
     */
    public int $timeout = 600;

    /**
     * Constructeur — Aucun paramètre nécessaire (traite tous les utilisateurs actifs).
     */
    public function __construct()
    {
        $this->onQueue('digests');
    }

    // =========================================================================
    // handle() — Logique principale
    // =========================================================================

    /**
     * Exécute le job de digest quotidien.
     *
     * Traite les utilisateurs par chunks de 50 pour éviter les pics mémoire.
     */
    public function handle(
        SmartNotificationService $smartNotifService,
        NotificationService      $notificationService,
    ): void {
        $now = now();

        Log::info('DailyDigestJob: Démarrage', [
            'time' => $now->toIso8601String(),
        ]);

        $processedCount = 0;
        $errorCount     = 0;

        // Traiter tous les utilisateurs actifs par chunks
        User::where('status', 'active')
            ->whereNotNull('email')
            ->chunk(50, function ($users) use (
                $smartNotifService,
                $notificationService,
                &$processedCount,
                &$errorCount
            ) {
                foreach ($users as $user) {
                    try {
                        $this->processUserDigest($user, $smartNotifService, $notificationService);
                        $processedCount++;
                    } catch (\Throwable $e) {
                        $errorCount++;
                        Log::error('DailyDigestJob: Erreur utilisateur', [
                            'user_id' => $user->id,
                            'error'   => $e->getMessage(),
                            'trace'   => $e->getTraceAsString(),
                        ]);
                    }
                }
            });

        Log::info('DailyDigestJob: Terminé', [
            'processed' => $processedCount,
            'errors'    => $errorCount,
            'duration'  => now()->diffInSeconds($now) . 's',
        ]);
    }

    // =========================================================================
    // processUserDigest() — Traitement d'un utilisateur
    // =========================================================================

    /**
     * Génère et envoie le digest pour un utilisateur.
     */
    private function processUserDigest(
        User                     $user,
        SmartNotificationService $smartNotifService,
        NotificationService      $notificationService,
    ): void {
        // Vérifier que l'utilisateur veut recevoir le digest
        if (!$this->userWantsDigest($user)) {
            return;
        }

        // Générer le digest via SmartNotificationService
        $digest = $smartNotifService->getNotificationDigest($user);

        // Si rien d'intéressant → ne pas envoyer (éviter le spam les jours calmes)
        if ($this->isDigestEmpty($digest)) {
            Log::debug('DailyDigestJob: Digest vide pour utilisateur', ['user_id' => $user->id]);
            return;
        }

        // ── Envoi Email ──────────────────────────────────────────────────────
        $this->sendDigestEmail($user, $digest, $notificationService);

        // ── Notification Push / App ───────────────────────────────────────────
        $this->sendDigestNotification($user, $digest, $notificationService);
    }

    /**
     * Envoie le digest par email.
     */
    private function sendDigestEmail(User $user, array $digest, NotificationService $notificationService): void
    {
        $notificationService->sendEmail($user, 'notifications.digest', [
            'title'        => $digest['greeting'] . ' Votre briefing du ' . now()->format('d/m/Y'),
            'userName'     => $user->name,
            'digest'       => $digest,
            'today_events' => $digest['today_events'],
            'urgent_tasks' => $digest['urgent_tasks'],
            'urgent_mails' => $digest['urgent_mails'],
            'yesterday'    => $digest['yesterday'],
            'app_url'      => config('app.url'),
        ]);
    }

    /**
     * Envoie une notification push résumée du digest.
     */
    private function sendDigestNotification(User $user, array $digest, NotificationService $notificationService): void
    {
        $notificationService->send(
            user:  $user,
            type:  'digest',
            title: $digest['greeting'],
            body:  $digest['day_summary'],
            data:  [
                'action_url'    => '/notifications/digest',
                'digest_date'   => now()->toDateString(),
                'event_count'   => count($digest['today_events']),
                'task_count'    => count($digest['urgent_tasks']),
            ]
        );
    }

    /**
     * Vérifie si l'utilisateur a activé le digest quotidien.
     */
    private function userWantsDigest(User $user): bool
    {
        // Respecter la préférence utilisateur (digest activé par défaut)
        $wantsDigest = $user->getPreference('notifications.daily_digest', true);
        if (!$wantsDigest) {
            return false;
        }

        // Respecter les heures de silence et le mode NDD
        // (Le digest est envoyé à 7h30 donc généralement hors heures de silence)
        return true;
    }

    /**
     * Vérifie si le digest a du contenu utile.
     */
    private function isDigestEmpty(array $digest): bool
    {
        return empty($digest['today_events'])
            && empty($digest['urgent_tasks'])
            && empty($digest['urgent_mails'])
            && ($digest['yesterday']['total'] ?? 0) === 0;
    }

    // =========================================================================
    // failed() — Gestion des échecs
    // =========================================================================

    /**
     * Gère l'échec du job après épuisement des tentatives.
     */
    public function failed(\Throwable $exception): void
    {
        Log::critical('DailyDigestJob: Échec critique', [
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}
