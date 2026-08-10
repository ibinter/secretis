<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\License;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentReceiptMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly Organization $organization,
        public readonly Payment $payment,
        public readonly License $license,
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Reçu de paiement — {$this->license->plan_name} SECRETIS",
        );
    }

    public function content(): Content
    {
        $methodLabels = [
            'mobile_money'  => 'Mobile Money',
            'bank_transfer' => 'Virement bancaire',
            'card'          => 'Carte bancaire',
            'cash'          => 'Espèces',
            'other'         => 'Autre',
        ];

        $modules = is_array($this->license->modules)
            ? $this->license->modules
            : (json_decode((string) $this->license->modules, true) ?? []);

        return new Content(
            view: 'emails.paiement_recu',
            with: [
                'user_name'        => $this->user->name,
                'user_email'       => $this->user->email,
                'org_name'         => $this->organization->name,
                'plan_name'        => $this->license->plan_name,
                'amount'           => $this->payment->amount,
                'currency'         => $this->payment->currency,
                'payment_method'   => $methodLabels[$this->payment->method] ?? $this->payment->method,
                'payment_reference'=> $this->payment->reference ?? $this->payment->idempotency_key,
                'invoice_number'   => 'REC-' . date('Y') . '-' . str_pad((string) $this->payment->id, 4, '0', STR_PAD_LEFT),
                'paid_at'          => $this->payment->paid_at?->format('d/m/Y') ?? now()->format('d/m/Y'),
                'period_start'     => $this->license->starts_at->format('d/m/Y'),
                'period_end'       => $this->license->ends_at->format('d/m/Y'),
                'max_users'        => $this->license->max_users,
                'active_modules'   => $modules,
                'payment_id'       => $this->payment->id,
                'app_url'          => config('app.url'),
                'unsubscribe_email'=> $this->user->email,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
