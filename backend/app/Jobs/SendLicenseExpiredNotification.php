<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\LicenseExpiredMail;
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

class SendLicenseExpiredNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 120;

    public function __construct(
        public readonly License $license,
    ) {
        $this->onQueue('emails');
    }

    public function handle(): void
    {
        $this->license->refresh();

        $organization = $this->license->organization;
        if (!$organization) {
            Log::warning("[SendLicenseExpiredNotification] Organisation introuvable pour licence #{$this->license->id}");
            return;
        }

        $admin = $organization->users()
            ->whereHas('roles', fn($q) => $q->where('name', 'admin'))
            ->first() ?? $organization->users()->first();

        if (!$admin) {
            Log::warning("[SendLicenseExpiredNotification] Aucun utilisateur pour org#{$organization->id}");
            return;
        }

        $idempotencyKey = "expired:license:{$this->license->id}:" . now()->toDateString();

        if (EmailLog::where('idempotency_key', $idempotencyKey)->exists()) {
            Log::info("[SendLicenseExpiredNotification] Déjà envoyé pour licence #{$this->license->id}, skip.");
            return;
        }

        $log = EmailLog::create([
            'organization_id' => $organization->id,
            'user_id'         => $admin->id,
            'type'            => 'expired',
            'email'           => $admin->email,
            'subject'         => 'Votre licence SECRETIS a expiré',
            'status'          => 'queued',
            'idempotency_key' => $idempotencyKey,
            'metadata'        => ['license_id' => $this->license->id],
        ]);

        try {
            Mail::to($admin->email, $admin->name)
                ->send(new LicenseExpiredMail($admin, $organization, $this->license));

            $log->update(['status' => 'sent', 'sent_at' => now()]);

            Log::info("[SendLicenseExpiredNotification] Envoyé à {$admin->email}");
        } catch (Throwable $e) {
            $log->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            Log::error("[SendLicenseExpiredNotification] Échec : {$e->getMessage()}");
            throw $e;
        }
    }

    public function failed(Throwable $e): void
    {
        Log::error("[SendLicenseExpiredNotification] Job définitivement échoué pour licence #{$this->license->id} : {$e->getMessage()}");
    }
}
