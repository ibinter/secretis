<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * ProcessLicenseGrace — Gestion des périodes de grâce et expiration des licences
 *
 * Planification recommandée : tous les jours à 00:30
 * Schedule : $schedule->command('secretis:process-license-grace')->dailyAt('00:30');
 *
 * Flux :
 *   1. Licences active + expires_at < now() → statut 'grace'
 *   2. Licences grace + expires_at < (now - GRACE_DAYS) → statut 'expired' → coupure accès
 *   3. Notification aux organisations concernées
 */
class ProcessLicenseGrace extends Command
{
    protected $signature   = 'secretis:process-license-grace';
    protected $description = 'Traite les périodes de grâce et expire les licences dépassées';

    public function handle(): int
    {
        $now       = Carbon::now();
        $graceDays = (int) config('payment.grace_period_days', 7);

        $this->info("Traitement des licences - " . $now->toDateTimeString());
        $this->info("Période de grâce : {$graceDays} jours");

        // =====================================================================
        // ÉTAPE 1 : Licences actives expirées → passer en mode grâce
        // =====================================================================
        $toGrace = \App\Models\License::where('status', 'active')
                                       ->where('expires_at', '<', $now)
                                       ->with('organization')
                                       ->get();

        $graceCount = 0;
        foreach ($toGrace as $license) {
            $license->update(['status' => 'grace']);

            try {
                \Illuminate\Support\Facades\Mail::to($license->organization->email)
                    ->send(new \App\Mail\LicenseGracePeriod($license, $graceDays));
            } catch (\Throwable $e) {
                Log::error('Email grâce non envoyé', [
                    'license_id' => $license->id,
                    'error'      => $e->getMessage(),
                ]);
            }

            Log::info('Licence passée en mode grâce', [
                'license_id' => $license->id,
                'org_id'     => $license->organization_id,
                'expired_at' => $license->expires_at,
            ]);

            $graceCount++;
        }

        $this->info("{$graceCount} licence(s) passée(s) en mode grâce.");

        // =====================================================================
        // ÉTAPE 2 : Licences en grâce depuis > GRACE_DAYS → expirer
        // =====================================================================
        $graceLimit = $now->copy()->subDays($graceDays);

        $toExpire = \App\Models\License::where('status', 'grace')
                                        ->where('expires_at', '<', $graceLimit)
                                        ->with('organization')
                                        ->get();

        $expiredCount = 0;
        foreach ($toExpire as $license) {
            $license->update(['status' => 'expired']);

            // Couper l'accès en mettant l'organisation en suspended
            $license->organization->update(['status' => 'suspended']);

            try {
                \Illuminate\Support\Facades\Mail::to($license->organization->email)
                    ->send(new \App\Mail\LicenseExpired($license));
            } catch (\Throwable $e) {
                Log::error('Email expiration licence non envoyé', [
                    'license_id' => $license->id,
                    'error'      => $e->getMessage(),
                ]);
            }

            Log::warning('Licence expirée — accès coupé', [
                'license_id' => $license->id,
                'org_id'     => $license->organization_id,
                'expired_at' => $license->expires_at,
                'grace_days' => $graceDays,
            ]);

            $expiredCount++;
        }

        $this->info("{$expiredCount} licence(s) expirée(s) — accès coupé.");

        // =====================================================================
        // ÉTAPE 3 : Notification de rappel (3 jours avant expiration)
        // =====================================================================
        $reminderDate = $now->copy()->addDays(3);

        $toRemind = \App\Models\License::where('status', 'active')
                                        ->whereBetween('expires_at', [$now, $reminderDate])
                                        ->with('organization')
                                        ->get();

        foreach ($toRemind as $license) {
            try {
                \Illuminate\Support\Facades\Mail::to($license->organization->email)
                    ->send(new \App\Mail\LicenseExpirationReminder($license));
            } catch (\Throwable $e) {
                Log::error('Email rappel expiration non envoyé', [
                    'license_id' => $license->id,
                    'error'      => $e->getMessage(),
                ]);
            }
        }

        $this->info("{$toRemind->count()} rappel(s) envoyé(s).");
        $this->info('Traitement terminé.');

        return self::SUCCESS;
    }
}
