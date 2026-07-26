<?php

namespace App\Jobs;

use App\Models\Organisation;
use App\Notifications\TrialExpiringNotification;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Job CRON — Envoie les rappels d'expiration d'essai à J-7, J-3 et J-1.
 *
 * Planifié dans : App\Console\Commands\SendTrialReminders
 * Lancer manuellement : php artisan secretis:trial-reminders
 */
class SendTrialExpiryReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Nombre maximum de tentatives en cas d'échec */
    public int $tries = 3;

    /** Délai en secondes avant une nouvelle tentative */
    public int $backoff = 60;

    /** Jours avant expiration pour lesquels envoyer un rappel */
    protected array $reminderDays = [7, 3, 1];

    public function __construct()
    {
        $this->queue = 'emails';
    }

    public function handle(): void
    {
        Log::info('[TrialExpiryReminders] Début du traitement', [
            'executed_at' => now()->toIso8601String(),
        ]);

        $sentCount = 0;

        foreach ($this->reminderDays as $days) {
            $targetDate = Carbon::today()->addDays($days)->toDateString();

            // Récupère les organisations dont l'essai expire exactement dans $days jours
            $organisations = Organisation::query()
                ->where('status', 'trial')
                ->whereDate('trial_ends_at', $targetDate)
                ->whereNull('subscription_activated_at')
                ->with('admin') // eager load de l'admin pour éviter N+1
                ->get();

            foreach ($organisations as $organisation) {
                $admin = $organisation->admin;

                if (!$admin || !$admin->email) {
                    Log::warning('[TrialExpiryReminders] Admin introuvable ou sans email', [
                        'organisation_id' => $organisation->id,
                    ]);
                    continue;
                }

                // Vérifier qu'on n'a pas déjà envoyé ce rappel aujourd'hui
                if ($this->alreadySentToday($organisation->id, $days)) {
                    Log::info('[TrialExpiryReminders] Rappel déjà envoyé', [
                        'organisation_id' => $organisation->id,
                        'days'            => $days,
                    ]);
                    continue;
                }

                try {
                    $admin->notify(new TrialExpiringNotification(
                        daysLeft:         $days,
                        organisationName: $organisation->name,
                        adminName:        $admin->name,
                        trialEndsAt:      $organisation->trial_ends_at->translatedFormat('d F Y'),
                        usedFeatures:     $this->getUsedFeatures($organisation),
                        upgradeUrl:       config('app.url') . '/abonnement?org=' . $organisation->uuid,
                    ));

                    // Journaliser l'envoi pour éviter les doublons
                    $this->markAsSent($organisation->id, $days);

                    $sentCount++;

                    Log::info('[TrialExpiryReminders] Rappel envoyé', [
                        'organisation_id' => $organisation->id,
                        'admin_email'     => $admin->email,
                        'days_left'       => $days,
                    ]);

                } catch (\Throwable $e) {
                    Log::error('[TrialExpiryReminders] Erreur envoi', [
                        'organisation_id' => $organisation->id,
                        'days'            => $days,
                        'error'           => $e->getMessage(),
                    ]);
                }
            }
        }

        Log::info('[TrialExpiryReminders] Traitement terminé', [
            'total_sent' => $sentCount,
        ]);
    }

    /**
     * Récupère les fonctionnalités utilisées par l'organisation (pour J-7)
     */
    protected function getUsedFeatures(Organisation $organisation): array
    {
        $features = [];

        // Exemples de détection selon activité
        if ($organisation->courriers_count > 0) {
            $features[] = "Courrier ({$organisation->courriers_count} courriers créés)";
        }
        if ($organisation->taches_count > 0) {
            $features[] = "Tâches ({$organisation->taches_count} tâches créées)";
        }
        if ($organisation->users_count > 1) {
            $features[] = "Équipe ({$organisation->users_count} collaborateurs ajoutés)";
        }
        if ($organisation->agenda_events_count > 0) {
            $features[] = "Agenda ({$organisation->agenda_events_count} événements)";
        }

        return $features;
    }

    /**
     * Vérifie si un rappel a déjà été envoyé aujourd'hui pour éviter les doublons
     */
    protected function alreadySentToday(int $organisationId, int $days): bool
    {
        return \Illuminate\Support\Facades\Cache::has(
            "trial_reminder_{$organisationId}_{$days}_" . today()->toDateString()
        );
    }

    /**
     * Marque le rappel comme envoyé en cache pour la journée
     */
    protected function markAsSent(int $organisationId, int $days): void
    {
        \Illuminate\Support\Facades\Cache::put(
            "trial_reminder_{$organisationId}_{$days}_" . today()->toDateString(),
            true,
            now()->endOfDay()
        );
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('[TrialExpiryReminders] Job échoué définitivement', [
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}
