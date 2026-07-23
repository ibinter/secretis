<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\LicenseExpiringMail;
use App\Models\EmailLog;
use App\Models\License;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendLicenseExpiringReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 120;

    public function __construct(
        public readonly License $license,
        public readonly int $daysLeft,
    ) {
        $this->onQueue('emails');
    }

    public function handle(): void
    {
        // Recharger la licence pour vérifier son état actuel
        $this->license->refresh();

        if (!in_array($this->license->status, ['active', 'trial'], true)) {
            Log::info("[SendLicenseExpiringReminder] Licence #{$this->license->id} n'est plus active (status={$this->license->status}), skip.");
            return;
        }

        $organization = $this->license->organization;
        if (!$organization) {
            Log::warning("[SendLicenseExpiringReminder] Organisation introuvable pour licence #{$this->license->id}");
            return;
        }

        // Récupérer l'admin de l'organisation
        $admin = $organization->users()
            ->whereHas('roles', fn($q) => $q->where('name', 'admin'))
            ->first() ?? $organization->users()->first();

        if (!$admin) {
            Log::warning("[SendLicenseExpiringReminder] Aucun utilisateur trouvé pour org#{$organization->id}");
            return;
        }

        $typeKey = "expiring_{$this->daysLeft}";
        $idempotencyKey = "{$typeKey}:license:{$this->license->id}:" . now()->toDateString();

        // Anti-doublon via idempotency_key
        if (EmailLog::where('idempotency_key', $idempotencyKey)->exists()) {
            Log::info("[SendLicenseExpiringReminder] Déjà envoyé aujourd'hui pour licence #{$this->license->id} J-{$this->daysLeft}, skip.");
            return;
        }

        $log = EmailLog::create([
            'organization_id' => $organization->id,
            'user_id'         => $admin->id,
            'type'            => $typeKey,
            'email'           => $admin->email,
            'subject'         => "SECRETIS — {$this->daysLeft} jour(s) avant expiration",
            'status'          => 'queued',
            'idempotency_key' => $idempotencyKey,
            'metadata'        => [
                'license_id' => $this->license->id,
                'days_left'  => $this->daysLeft,
                'expires_at' => $this->license->ends_at->toDateString(),
            ],
        ]);

        try {
            Mail::to($admin->email, $admin->name)
                ->send(new LicenseExpiringMail($admin, $organization, $this->license, $this->daysLeft));

            $log->update(['status' => 'sent', 'sent_at' => now()]);

            Log::info("[SendLicenseExpiringReminder] Envoyé à {$admin->email} pour licence #{$this->license->id} J-{$this->daysLeft}");
        } catch (Throwable $e) {
            $log->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            Log::error("[SendLicenseExpiringReminder] Échec : {$e->getMessage()}");
            throw $e;
        }
    }

    public function failed(Throwable $e): void
    {
        Log::error("[SendLicenseExpiringReminder] Job définitivement échoué pour licence #{$this->license->id} : {$e->getMessage()}");
    }
}
