<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\SendLicenseExpiredNotification;
use App\Mail\AccountSuspendedMail;
use App\Models\EmailLog;
use App\Models\License;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ProcessExpiredLicenses extends Command
{
    protected $signature = 'secretis:process-expired-licenses';

    protected $description = 'Traite les licences expirées : passage en grâce, expiration définitive, emails';

    public function handle(): int
    {
        $this->info('⚙️  Traitement des licences expirées...');

        $graceCount    = 0;
        $expiredCount  = 0;
        $suspendCount  = 0;

        // ─── 1. Licences actives/trial dont ends_at est passé → passer en "grace" ──
        License::query()
            ->whereIn('status', ['active', 'trial'])
            ->where('ends_at', '<', now())
            ->with(['organization'])
            ->chunk(100, function ($licenses) use (&$graceCount): void {
                foreach ($licenses as $license) {
                    $graceUntil = now()->addDays(7);

                    $license->update([
                        'status'      => 'suspended',
                        'grace_until' => $graceUntil,
                    ]);

                    $graceCount++;

                    $this->line("  ⏱ Licence #{$license->id} ({$license->organization?->name}) → grâce jusqu'au {$graceUntil->format('d/m/Y')}");

                    // Email J+1 expiré
                    SendLicenseExpiredNotification::dispatch($license);

                    Log::info("[ProcessExpiredLicenses] Licence #{$license->id} passée en grâce.");
                }
            });

        // ─── 2. Licences en grâce depuis > 7 jours → passer en "expired" ──────────
        License::query()
            ->where('status', 'suspended')
            ->whereNotNull('grace_until')
            ->where('grace_until', '<', now())
            ->with(['organization'])
            ->chunk(100, function ($licenses) use (&$expiredCount, &$suspendCount): void {
                foreach ($licenses as $license) {
                    $license->update(['status' => 'expired']);
                    $expiredCount++;

                    $this->line("  ❌ Licence #{$license->id} ({$license->organization?->name}) → expirée définitivement.");

                    // Email compte suspendu aux admins
                    $organization = $license->organization;
                    if ($organization) {
                        $admins = $organization->users()
                            ->whereHas('roles', fn($q) => $q->where('name', 'admin'))
                            ->get();

                        if ($admins->isEmpty()) {
                            $admins = $organization->users()->take(1)->get();
                        }

                        foreach ($admins as $admin) {
                            $idempotencyKey = "suspended:license:{$license->id}:user:{$admin->id}";

                            if (!EmailLog::where('idempotency_key', $idempotencyKey)->exists()) {
                                try {
                                    Mail::to($admin->email, $admin->name)
                                        ->queue(new AccountSuspendedMail($admin, $organization));

                                    EmailLog::create([
                                        'organization_id' => $organization->id,
                                        'user_id'         => $admin->id,
                                        'type'            => 'suspended',
                                        'email'           => $admin->email,
                                        'subject'         => 'Information importante concernant votre compte SECRETIS',
                                        'status'          => 'queued',
                                        'idempotency_key' => $idempotencyKey,
                                        'metadata'        => ['license_id' => $license->id],
                                    ]);

                                    $suspendCount++;
                                } catch (\Throwable $e) {
                                    Log::error("[ProcessExpiredLicenses] Échec email suspension pour user#{$admin->id} : {$e->getMessage()}");
                                }
                            }
                        }
                    }

                    Log::info("[ProcessExpiredLicenses] Licence #{$license->id} expirée définitivement.");
                }
            });

        $this->info("✅ Terminé — {$graceCount} en grâce, {$expiredCount} expirées, {$suspendCount} emails suspension envoyés.");

        return self::SUCCESS;
    }
}
