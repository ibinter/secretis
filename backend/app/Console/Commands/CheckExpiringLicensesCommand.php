<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\License;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * CheckExpiringLicensesCommand
 *
 * Commande artisan : php artisan secretis:check-expiring-licenses
 *
 * - Trouve les licences expirant dans 7j, 3j et 1j
 * - Crée des notifications in-app pour tous les admins de l'org
 * - Dispatch l'email de rappel correspondant
 * - Évite les doublons via Redis/Cache (clé expiry_notif:{org_id}:{days})
 *
 * Planifiée dans routes/console.php : ->dailyAt('08:30')
 */
class CheckExpiringLicensesCommand extends Command
{
    protected $signature   = 'secretis:check-expiring-licenses';
    protected $description = 'Vérifie les licences expirant dans 7j / 3j / 1j et envoie les notifications.';

    private const REMINDER_DAYS = [7, 3, 1];

    public function handle(): int
    {
        $this->info('[CheckExpiringLicenses] Démarrage — ' . now()->toDateTimeString());
        Log::info('[CheckExpiringLicenses] Démarrage');

        $totalProcessed = 0;

        foreach (self::REMINDER_DAYS as $days) {
            $count = $this->processExpiringLicenses($days);
            $totalProcessed += $count;
            $this->line("  J-{$days} : {$count} organisation(s) traitée(s)");
        }

        $this->info("[CheckExpiringLicenses] Terminé — {$totalProcessed} notification(s) envoyée(s).");
        Log::info('[CheckExpiringLicenses] Terminé', ['total' => $totalProcessed]);

        return self::SUCCESS;
    }

    private function processExpiringLicenses(int $days): int
    {
        $targetDate = Carbon::today()->addDays($days)->toDateString();

        // Licences actives ET licences en essai (trial) expirant ce jour précis
        $licenses = License::whereIn('status', ['active', 'trial'])
            ->whereDate('ends_at', $targetDate)
            ->with('organization.users')
            ->get();

        $count = 0;

        foreach ($licenses as $license) {
            $org = $license->organization;

            if (!$org) {
                continue;
            }

            // Clé anti-doublon Redis/Cache
            $cacheKey = "expiry_notif:{$org->id}:{$days}";

            if (Cache::has($cacheKey)) {
                Log::info('[CheckExpiringLicenses] Doublon ignoré', [
                    'org_id' => $org->id,
                    'days'   => $days,
                ]);
                continue;
            }

            // Notifications in-app pour tous les admins de l'org
            $admins = User::where('organization_id', $org->id)
                ->where(fn ($q) => $q->where('is_admin', true)->orWhere('role', 'admin'))
                ->get();

            if ($admins->isEmpty()) {
                $admins = User::where('organization_id', $org->id)->limit(1)->get();
            }

            foreach ($admins as $admin) {
                try {
                    $this->sendInAppNotification($admin, $org, $days, $license);
                } catch (\Throwable $e) {
                    Log::error('[CheckExpiringLicenses] Erreur notification in-app', [
                        'org_id' => $org->id,
                        'user_id'=> $admin->id,
                        'error'  => $e->getMessage(),
                    ]);
                }
            }

            // Email de rappel
            try {
                $this->dispatchEmail($org, $days, $license);
            } catch (\Throwable $e) {
                Log::error('[CheckExpiringLicenses] Erreur dispatch email', [
                    'org_id' => $org->id,
                    'days'   => $days,
                    'error'  => $e->getMessage(),
                ]);
            }

            // Marquer comme traité jusqu'à minuit
            Cache::put($cacheKey, true, now()->endOfDay());

            $count++;

            Log::info('[CheckExpiringLicenses] Org traitée', [
                'org_id'   => $org->id,
                'org_name' => $org->name,
                'days'     => $days,
                'expires'  => $targetDate,
            ]);
        }

        return $count;
    }

    private function sendInAppNotification(User $admin, Organization $org, int $days, License $license): void
    {
        // Crée une notification in-app dans la table notifications (Laravel Notifications)
        $admin->notify(new \App\Notifications\LicenseExpiringNotification(
            daysLeft:    $days,
            orgName:     $org->name,
            expiresAt:   Carbon::parse($license->ends_at)->translatedFormat('d F Y'),
            renewUrl:    config('app.url') . '/abonnement',
        ));
    }

    private function dispatchEmail(Organization $org, int $days, License $license): void
    {
        if ($license->status === 'trial') {
            // Email fin d'essai
            \App\Jobs\SendTrialEndingEmailJob::dispatch($days);
        } else {
            // Email expiration abonnement payant
            \App\Jobs\SendLicenseExpiringReminder::dispatch($org->id, $days);
        }
    }
}
