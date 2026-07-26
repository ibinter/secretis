<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\WelcomeMail;
use App\Models\EmailLog;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public readonly User $user,
        public readonly Organization $organization,
        public readonly int $trialDays = 14,
    ) {
        $this->onQueue('emails');
    }

    public function handle(): void
    {
        $idempotencyKey = "welcome:{$this->user->id}:{$this->organization->id}";

        // Anti-doublon : ne jamais envoyer deux fois
        if (EmailLog::where('idempotency_key', $idempotencyKey)->exists()) {
            Log::info("[SendWelcomeEmail] Déjà envoyé pour user#{$this->user->id}, skip.");
            return;
        }

        $log = EmailLog::create([
            'organization_id'  => $this->organization->id,
            'user_id'          => $this->user->id,
            'type'             => 'welcome',
            'email'            => $this->user->email,
            'subject'          => "Bienvenue sur IBIG SECRETIS — votre essai de {$this->trialDays} jours est activé",
            'status'           => 'queued',
            'idempotency_key'  => $idempotencyKey,
            'metadata'         => ['trial_days' => $this->trialDays],
        ]);

        try {
            Mail::to($this->user->email, $this->user->name)
                ->send(new WelcomeMail($this->user, $this->organization, $this->trialDays));

            $log->update(['status' => 'sent', 'sent_at' => now()]);

            Log::info("[SendWelcomeEmail] Envoyé à {$this->user->email}");
        } catch (Throwable $e) {
            $log->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            Log::error("[SendWelcomeEmail] Échec pour {$this->user->email} : {$e->getMessage()}");
            throw $e;
        }
    }

    public function failed(Throwable $e): void
    {
        Log::error("[SendWelcomeEmail] Job définitivement échoué pour user#{$this->user->id} : {$e->getMessage()}");
    }
}
