<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentSuccessNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public string $adminName;
    public string $organisationName;
    public string $invoiceRef;
    public string $paidAt;
    public string $planName;
    public string $periodStart;
    public string $periodEnd;
    public string $paymentMethod;
    public string $amount;
    public string $currency;
    public string $dashboardUrl;
    public array  $addons;

    public function __construct(
        string $adminName,
        string $organisationName,
        string $invoiceRef,
        string $paidAt,
        string $planName,
        string $periodStart,
        string $periodEnd,
        string $paymentMethod,
        string $amount,
        string $currency      = 'FCFA',
        array  $addons        = [],
        string $dashboardUrl  = ''
    ) {
        $this->adminName        = $adminName;
        $this->organisationName = $organisationName;
        $this->invoiceRef       = $invoiceRef;
        $this->paidAt           = $paidAt;
        $this->planName         = $planName;
        $this->periodStart      = $periodStart;
        $this->periodEnd        = $periodEnd;
        $this->paymentMethod    = $paymentMethod;
        $this->amount           = $amount;
        $this->currency         = $currency;
        $this->addons           = $addons;
        $this->dashboardUrl     = $dashboardUrl ?: config('app.url') . '/dashboard';
        $this->queue            = 'emails';
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("[SECRETIS] Confirmation de paiement — {$this->invoiceRef}")
            ->view('emails.payment_success', [
                'adminName'        => $this->adminName,
                'organisationName' => $this->organisationName,
                'invoiceRef'       => $this->invoiceRef,
                'paidAt'           => $this->paidAt,
                'planName'         => $this->planName,
                'periodStart'      => $this->periodStart,
                'periodEnd'        => $this->periodEnd,
                'paymentMethod'    => $this->paymentMethod,
                'amount'           => $this->amount,
                'currency'         => $this->currency,
                'addons'           => $this->addons,
                'dashboardUrl'     => $this->dashboardUrl,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'       => 'payment_success',
            'invoiceRef' => $this->invoiceRef,
            'amount'     => $this->amount,
            'currency'   => $this->currency,
            'planName'   => $this->planName,
        ];
    }
}
