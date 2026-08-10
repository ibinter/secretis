<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\SendLicenseExpiringReminder;
use App\Models\EmailLog;
use App\Models\License;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendExpirationReminders extends Command
{
    protected $signature = 'secretis:remind-expiration
                            {--days=7 : Nombre de jours avant expiration}';

    protected $description = 'Envoie les rappels d\'expiration de licence (J-7, J-3, J-1)';

    public function handle(): int
    {
        $daysLeft   = (int) $this->option('days');
        $targetDate = now()->addDays($daysLeft)->toDateString();

        $this->info("🔔 Rappel J-{$daysLeft} — Recherche des licences expirant le {$targetDate}...");

        $dispatched = 0;
        $skipped    = 0;

        License::query()
            ->whereDate('ends_at', $targetDate)
            ->whereIn('status', ['active', 'trial'])
            ->with(['organization'])
            ->chunk(100, function ($licenses) use ($daysLeft, &$dispatched, &$skipped): void {
                foreach ($licenses as $license) {
                    if ($this->alreadySentToday($license->id, $daysLeft)) {
                        $skipped++;
                        $this->line("  ⏭ Licence #{$license->id} ({$license->organization?->name}) — déjà envoyé aujourd'hui.");
                        continue;
                    }

                    SendLicenseExpiringReminder::dispatch($license, $daysLeft);
                    $dispatched++;

                    $this->line("  ✅ Licence #{$license->id} ({$license->organization?->name}) — rappel J-{$daysLeft} en file.");

                    Log::info("[SendExpirationReminders] Job dispatché pour licence #{$license->id} J-{$daysLeft}");
                }
            });

        $this->info("✅ Terminé — {$dispatched} rappels envoyés en file, {$skipped} ignorés (déjà envoyés).");

        return self::SUCCESS;
    }

    private function alreadySentToday(int $licenseId, int $daysLeft): bool
    {
        $idempotencyKey = "expiring_{$daysLeft}:license:{$licenseId}:" . now()->toDateString();

        return EmailLog::where('idempotency_key', $idempotencyKey)->exists();
    }
}
