<?php

declare(strict_types=1);

namespace App\Mail\Onboarding;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Relance d'onboarding J+3.
 *
 * Appelé par App\Services\OnboardingService::sendOnboardingEmails() :
 *   new NudgeDay3($org, $admin, $progress)
 */
class NudgeDay3 extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param array<string, mixed> $progress
     */
    public function __construct(
        public readonly Organization $organization,
        public readonly User         $admin,
        public readonly array        $progress = [],
    ) {
        $this->onQueue('emails');
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Votre configuration SECRETIS est encore incomplète');
    }

    public function content(): Content
    {
        return new Content(htmlString: NudgeContent::render(
            title:    'Terminons votre configuration',
            intro:    'Trois jours après votre inscription, certaines étapes clés restent à finaliser.',
            admin:    $this->admin,
            progress: $this->progress,
        ));
    }
}
