<?php

namespace App\Services;

use App\Models\OnboardingStep;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class OnboardingService
{
    // ── Définition canonique des 8 étapes ─────────────────────────────────────
    public const STEPS = [
        'organization_profile'   => ['order' => 1, 'label' => 'Profil organisation',     'skippable' => false],
        'configure_services'     => ['order' => 2, 'label' => 'Configurer les modules',   'skippable' => true],
        'set_prefix'             => ['order' => 3, 'label' => 'Préfixe de courrier',      'skippable' => true],
        'invite_users'           => ['order' => 4, 'label' => 'Inviter des utilisateurs', 'skippable' => true],
        'create_first_event'     => ['order' => 5, 'label' => 'Premier événement',        'skippable' => true],
        'upload_first_document'  => ['order' => 6, 'label' => 'Premier document',         'skippable' => true],
        'configure_notifications'=> ['order' => 7, 'label' => 'Notifications',            'skippable' => true],
        'discover_sara'          => ['order' => 8, 'label' => 'Découvrir SARA',           'skippable' => true],
    ];

    // ── Initialisation ─────────────────────────────────────────────────────────
    /**
     * Crée les 8 entrées d'étapes pour une nouvelle organisation.
     * Idempotent : ne recrée pas si elles existent déjà.
     */
    public function initializeOnboarding(Organization $org): void
    {
        foreach (self::STEPS as $key => $meta) {
            OnboardingStep::firstOrCreate(
                ['organization_id' => $org->id, 'step_key' => $key],
                ['status' => 'pending']
            );
        }
    }

    // ── Compléter une étape ────────────────────────────────────────────────────
    public function completeStep(Organization $org, string $stepKey, array $data = []): void
    {
        abort_unless(array_key_exists($stepKey, self::STEPS), 422, 'Étape inconnue.');

        OnboardingStep::updateOrCreate(
            ['organization_id' => $org->id, 'step_key' => $stepKey],
            [
                'status'       => 'completed',
                'completed_at' => now(),
                'data'         => $data ?: null,
            ]
        );
    }

    // ── Passer une étape ───────────────────────────────────────────────────────
    public function skipStep(Organization $org, string $stepKey): void
    {
        abort_unless(array_key_exists($stepKey, self::STEPS), 422, 'Étape inconnue.');
        abort_unless(self::STEPS[$stepKey]['skippable'], 403, 'Cette étape ne peut pas être passée.');

        OnboardingStep::updateOrCreate(
            ['organization_id' => $org->id, 'step_key' => $stepKey],
            ['status' => 'skipped']
        );
    }

    // ── Progression ───────────────────────────────────────────────────────────
    public function getProgress(Organization $org): array
    {
        $steps = OnboardingStep::where('organization_id', $org->id)->get()->keyBy('step_key');
        $total     = count(self::STEPS);
        $completed = $steps->where('status', 'completed')->count();
        $skipped   = $steps->where('status', 'skipped')->count();

        $stepsDetail = [];
        foreach (self::STEPS as $key => $meta) {
            $step = $steps->get($key);
            $stepsDetail[] = [
                'key'        => $key,
                'label'      => $meta['label'],
                'order'      => $meta['order'],
                'skippable'  => $meta['skippable'],
                'status'     => $step?->status ?? 'pending',
                'completedAt'=> $step?->completed_at?->toIso8601String(),
                'data'       => $step?->data,
            ];
        }

        return [
            'completed' => $completed,
            'skipped'   => $skipped,
            'total'     => $total,
            'percent'   => (int) round(($completed / $total) * 100),
            'nextStep'  => $this->getNextStep($org),
            'isComplete'=> $this->isOnboardingComplete($org),
            'steps'     => $stepsDetail,
        ];
    }

    // ── Prochaine étape ───────────────────────────────────────────────────────
    public function getNextStep(Organization $org): ?string
    {
        $done = OnboardingStep::where('organization_id', $org->id)
            ->whereIn('status', ['completed', 'skipped'])
            ->pluck('step_key')
            ->toArray();

        foreach (self::STEPS as $key => $meta) {
            if (!in_array($key, $done, true)) {
                return $key;
            }
        }
        return null;
    }

    // ── Onboarding terminé ? ──────────────────────────────────────────────────
    public function isOnboardingComplete(Organization $org): bool
    {
        $doneCount = OnboardingStep::where('organization_id', $org->id)
            ->whereIn('status', ['completed', 'skipped'])
            ->count();
        return $doneCount >= count(self::STEPS);
    }

    // ── Emails d'encouragement ────────────────────────────────────────────────
    /**
     * Planifie / envoie les emails de relance J+1, J+3, J+7.
     * À appeler depuis un scheduler quotidien.
     */
    public function sendOnboardingEmails(Organization $org): void
    {
        if ($this->isOnboardingComplete($org)) {
            return;
        }

        $admin    = $org->owner ?? $org->users()->first();
        if (!$admin) {
            return;
        }

        $createdAt = $org->created_at;
        $daysSince = (int) $createdAt->diffInDays(now());

        $progress  = $this->getProgress($org);

        match ($daysSince) {
            1 => Mail::to($admin->email)->send(
                    new \App\Mail\Onboarding\NudgeDay1($org, $admin, $progress)
                ),
            3 => Mail::to($admin->email)->send(
                    new \App\Mail\Onboarding\NudgeDay3($org, $admin, $progress)
                ),
            7 => Mail::to($admin->email)->send(
                    new \App\Mail\Onboarding\NudgeDay7($org, $admin, $progress)
                ),
            default => null,
        };
    }

    // ── Invitations ───────────────────────────────────────────────────────────
    public function inviteUser(Organization $org, string $email, string $role, User $invitedBy): OrganizationInvitation
    {
        // Révoque une invitation existante non acceptée
        OrganizationInvitation::where('organization_id', $org->id)
            ->where('email', $email)
            ->whereNull('accepted_at')
            ->delete();

        $invitation = OrganizationInvitation::create([
            'organization_id' => $org->id,
            'email'           => $email,
            'role'            => $role,
            'token'           => Str::uuid(),
            'invited_by'      => $invitedBy->id,
            'expires_at'      => now()->addDays(7),
        ]);

        Mail::to($email)->send(
            new \App\Mail\Onboarding\InvitationMail($org, $invitation, $invitedBy)
        );

        return $invitation;
    }

    public function acceptInvitation(string $token): OrganizationInvitation
    {
        $invitation = OrganizationInvitation::where('token', $token)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->firstOrFail();

        $invitation->update(['accepted_at' => now()]);

        // Compléter l'étape invite_users si ce n'est pas déjà fait
        $this->completeStep($invitation->organization, 'invite_users');

        return $invitation;
    }
}
