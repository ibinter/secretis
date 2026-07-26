<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\PaymentReceiptMail;
use App\Models\EmailLog;
use App\Models\License;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendPaymentReceipt implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public readonly Payment $payment,
        public readonly License $license,
        public readonly User $user,
    ) {
        $this->onQueue('emails');
    }

    public function handle(): void
    {
        // Idempotence stricte : un seul reçu par paiement validé
        $idempotencyKey = "receipt:payment:{$this->payment->idempotency_key}";

        if (EmailLog::where('idempotency_key', $idempotencyKey)->exists()) {
            Log::info("[SendPaymentReceipt] Reçu déjà envoyé pour paiement #{$this->payment->id}, skip.");
            return;
        }

        $organization = $this->payment->organization;
        if (!$organization) {
            Log::warning("[SendPaymentReceipt] Organisation introuvable pour paiement #{$this->payment->id}");
            return;
        }

        $log = EmailLog::create([
            'organization_id' => $organization->id,
            'user_id'         => $this->user->id,
            'type'            => 'receipt',
            'email'           => $this->user->email,
            'subject'         => "Reçu de paiement — {$this->license->plan_name} SECRETIS",
            'status'          => 'queued',
            'idempotency_key' => $idempotencyKey,
            'metadata'        => [
                'payment_id' => $this->payment->id,
                'license_id' => $this->license->id,
                'amount'     => $this->payment->amount,
            ],
        ]);

        try {
            Mail::to($this->user->email, $this->user->name)
                ->send(new PaymentReceiptMail($this->user, $organization, $this->payment, $this->license));

            $log->update(['status' => 'sent', 'sent_at' => now()]);

            Log::info("[SendPaymentReceipt] Reçu envoyé à {$this->user->email} pour paiement #{$this->payment->id}");
        } catch (Throwable $e) {
            $log->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            Log::error("[SendPaymentReceipt] Échec : {$e->getMessage()}");
            throw $e;
        }
    }

    public function failed(Throwable $e): void
    {
        Log::error("[SendPaymentReceipt] Job définitivement échoué pour paiement #{$this->payment->id} : {$e->getMessage()}");
    }
}
