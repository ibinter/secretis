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
 * Relance d'onboarding J+7.
 *
 * Appelé par App\Services\OnboardingService::sendOnboardingEmails() :
 *   new NudgeDay7($org, $admin, $progress)
 */
class NudgeDay7 extends Mailable implements ShouldQueue
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
        return new Envelope(subject: 'Besoin d\'aide pour finaliser votre espace SECRETIS ?');
    }

    public function content(): Content
    {
        return new Content(htmlString: NudgeContent::render(
            title:    'Nous pouvons vous accompagner',
            intro:    'Une semaine après votre inscription, votre espace n\'est pas encore complètement configuré. '
                    . 'Notre équipe peut vous aider à le finaliser.',
            admin:    $this->admin,
            progress: $this->progress,
        ));
    }
}
