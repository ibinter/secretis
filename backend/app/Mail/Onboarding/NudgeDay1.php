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
 * Relance d'onboarding J+1.
 *
 * Appelé par App\Services\OnboardingService::sendOnboardingEmails() :
 *   new NudgeDay1($org, $admin, $progress)
 * $progress = OnboardingService::getProgress() : completed, skipped, total,
 * percent, nextStep, isComplete, steps[].
 */
class NudgeDay1 extends Mailable implements ShouldQueue
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
        return new Envelope(subject: 'Premiers pas sur SECRETIS — il vous reste quelques étapes');
    }

    public function content(): Content
    {
        return new Content(htmlString: NudgeContent::render(
            title:    'Bienvenue, poursuivons la configuration',
            intro:    'Vous avez créé votre espace hier. Quelques étapes suffisent pour être pleinement opérationnel.',
            admin:    $this->admin,
            progress: $this->progress,
        ));
    }
}
