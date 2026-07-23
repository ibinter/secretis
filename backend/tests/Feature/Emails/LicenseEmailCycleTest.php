<?php

declare(strict_types=1);

namespace Tests\Feature\Emails;

use App\Jobs\SendLicenseExpiringReminder;
use App\Jobs\SendLicenseExpiredNotification;
use App\Jobs\SendPaymentReceipt;
use App\Jobs\SendWelcomeEmail;
use App\Mail\AccountSuspendedMail;
use App\Mail\LicenseExpiredMail;
use App\Mail\LicenseExpiringMail;
use App\Mail\PaymentReceiptMail;
use App\Mail\SuspiciousLoginMail;
use App\Mail\WelcomeMail;
use App\Models\EmailLog;
use App\Models\License;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class LicenseEmailCycleTest extends TestCase
{
    use RefreshDatabase;

    // ─── #1 — Email de bienvenue à l'inscription ───────────────────────────────

    public function test_it_sends_welcome_email_on_organization_registration(): void
    {
        Mail::fake();

        [$user, $org] = $this->createUserAndOrg();

        SendWelcomeEmail::dispatchSync($user, $org, 14);

        Mail::assertSent(WelcomeMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });

        $this->assertDatabaseHas('email_logs', [
            'user_id' => $user->id,
            'type'    => 'welcome',
            'status'  => 'sent',
        ]);
    }

    // ─── #2 — Rappel J-7 avant expiration ─────────────────────────────────────

    public function test_it_sends_expiring_reminder_7_days_before(): void
    {
        Mail::fake();

        [$user, $org] = $this->createUserAndOrg(role: 'admin');
        $license = $this->createLicense($org, now()->addDays(7));

        Artisan::call('secretis:remind-expiration', ['--days' => 7]);

        Mail::assertSent(LicenseExpiringMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    // ─── #3 — Anti-doublon rappel même jour ────────────────────────────────────

    public function test_it_does_not_send_duplicate_expiring_reminder_same_day(): void
    {
        Mail::fake();

        [$user, $org] = $this->createUserAndOrg(role: 'admin');
        $license = $this->createLicense($org, now()->addDays(7));

        // Premier envoi
        Artisan::call('secretis:remind-expiration', ['--days' => 7]);

        // Deuxième appel le même jour → doit être ignoré
        Artisan::call('secretis:remind-expiration', ['--days' => 7]);

        // Ne doit avoir été envoyé qu'une seule fois
        Mail::assertSentCount(1);
    }

    // ─── #4 — Reçu de paiement — idempotence stricte ──────────────────────────

    public function test_it_sends_payment_receipt_only_once_per_payment(): void
    {
        Mail::fake();

        [$user, $org] = $this->createUserAndOrg();
        $license = $this->createLicense($org, now()->addMonths(1), 'active');
        $payment = Payment::factory()->create([
            'organization_id'  => $org->id,
            'license_id'       => $license->id,
            'idempotency_key'  => 'pay-test-unique-' . uniqid(),
            'status'           => 'validated',
            'amount'           => 50000,
            'currency'         => 'XOF',
        ]);

        // Dispatcher 2× le même job
        SendPaymentReceipt::dispatchSync($payment, $license, $user);
        SendPaymentReceipt::dispatchSync($payment, $license, $user);

        // Un seul email envoyé grâce à l'idempotency_key
        Mail::assertSentCount(1);
        Mail::assertSent(PaymentReceiptMail::class);
    }

    // ─── #5 — Email expiré le lendemain de l'échéance ─────────────────────────

    public function test_it_sends_expired_notification_on_day_after_expiry(): void
    {
        Mail::fake();

        [$user, $org] = $this->createUserAndOrg(role: 'admin');
        $license = $this->createLicense($org, now()->subDay(), 'active');

        Artisan::call('secretis:process-expired-licenses');

        Mail::assertSent(LicenseExpiredMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    // ─── #6 — Transition trial → grace après expiration ───────────────────────

    public function test_it_transitions_trial_to_grace_after_expiry(): void
    {
        Mail::fake();

        [, $org] = $this->createUserAndOrg(role: 'admin');
        $license = $this->createLicense($org, now()->subDay(), 'trial');

        Artisan::call('secretis:process-expired-licenses');

        $license->refresh();

        $this->assertSame('suspended', $license->status);
        $this->assertNotNull($license->grace_until);
        $this->assertTrue($license->grace_until->gt(now()));
    }

    // ─── #7 — Transition grace → expired après 7 jours ───────────────────────

    public function test_it_transitions_grace_to_expired_after_7_days(): void
    {
        Mail::fake();

        [, $org] = $this->createUserAndOrg(role: 'admin');

        $license = License::factory()->create([
            'organization_id' => $org->id,
            'status'          => 'suspended',
            'ends_at'         => now()->subDays(10),
            'grace_until'     => now()->subDay(), // grâce expirée hier
        ]);

        Artisan::call('secretis:process-expired-licenses');

        $license->refresh();

        $this->assertSame('expired', $license->status);

        Mail::assertSent(AccountSuspendedMail::class);
    }

    // ─── #8 — Email connexion suspecte ────────────────────────────────────────

    public function test_it_sends_suspicious_login_email_on_new_device(): void
    {
        Mail::fake();

        [$user] = $this->createUserAndOrg();

        $loginData = [
            'ip'           => '41.123.45.67',
            'country'      => 'Nigéria',
            'city'         => 'Lagos',
            'device'       => 'Mobile',
            'browser'      => 'Chrome 121',
            'os'           => 'Android 14',
            'is_suspicious'=> true,
            'login_at'     => now()->format('d/m/Y à H:i'),
        ];

        Mail::to($user->email)->send(new SuspiciousLoginMail($user, $loginData));

        Mail::assertSent(SuspiciousLoginMail::class, function ($mail) use ($user, $loginData) {
            return $mail->hasTo($user->email)
                && $mail->loginData['ip'] === $loginData['ip']
                && $mail->loginData['is_suspicious'] === true;
        });
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    /**
     * @return array{0: User, 1: Organization}
     */
    private function createUserAndOrg(string $role = 'user'): array
    {
        $org = Organization::factory()->create();

        $user = User::factory()->create([
            'organization_id' => $org->id,
            'email'           => "test-{$role}-" . uniqid() . '@secretis.test',
        ]);

        if ($role === 'admin') {
            $user->assignRole('admin');
        }

        return [$user, $org];
    }

    private function createLicense(
        Organization $org,
        \Carbon\Carbon $endsAt,
        string $status = 'trial',
    ): License {
        return License::factory()->create([
            'organization_id' => $org->id,
            'status'          => $status,
            'ends_at'         => $endsAt,
            'starts_at'       => now()->subMonth(),
            'grace_until'     => null,
        ]);
    }
}
