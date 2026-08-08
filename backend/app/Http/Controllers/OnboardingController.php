<?php

namespace App\Http\Controllers;

use App\Services\GamifiedOnboardingService;
use App\Services\OnboardingService;
use App\Services\TrialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function __construct(
        private readonly OnboardingService         $onboarding,
        private readonly GamifiedOnboardingService $gamified,
        private readonly TrialService              $trial,
    ) {}

    // ── GET /onboarding ───────────────────────────────────────────────────────
    /** Retourne l'état complet de l'onboarding (pour Inertia ou API). */
    public function index(Request $request): Response|JsonResponse
    {
        $org      = $request->user()->organization;
        $progress = $this->onboarding->getProgress($org);

        if ($request->wantsJson()) {
            return response()->json($progress);
        }

        return Inertia::render('Onboarding/Wizard', [
            'progress'       => $progress,
            'remainingDays'  => $this->trial->getRemainingDays($org),
            'trialExpired'   => $this->trial->isTrialExpired($org),
        ]);
    }

    // ── GET /onboarding/welcome ───────────────────────────────────────────────
    public function welcome(Request $request): Response
    {
        $org = $request->user()->organization;

        return Inertia::render('Onboarding/Welcome', [
            'organization'  => $org->only('id', 'name'),
            'steps'         => array_map(fn($k, $v) => array_merge($v, ['key' => $k]), array_keys(OnboardingService::STEPS), OnboardingService::STEPS),
        ]);
    }

    // ── GET /onboarding/progress ──────────────────────────────────────────────
    public function progress(Request $request): JsonResponse
    {
        $org = $request->user()->organization;
        return response()->json($this->onboarding->getProgress($org));
    }

    // ── POST /onboarding/{step}/complete ──────────────────────────────────────
    public function completeStep(Request $request, string $step): JsonResponse
    {
        $org  = $request->user()->organization;
        $data = $request->validate(['data' => 'sometimes|array']);

        $this->onboarding->completeStep($org, $step, $data['data'] ?? []);

        return response()->json([
            'message'  => 'Étape complétée.',
            'progress' => $this->onboarding->getProgress($org),
        ]);
    }

    // ── POST /onboarding/{step}/skip ──────────────────────────────────────────
    public function skipStep(Request $request, string $step): JsonResponse
    {
        $org = $request->user()->organization;
        $this->onboarding->skipStep($org, $step);

        return response()->json([
            'message'  => 'Étape passée.',
            'progress' => $this->onboarding->getProgress($org),
        ]);
    }

    // ── POST /invitations ─────────────────────────────────────────────────────
    public function invite(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invitations'         => 'required|array|min:1|max:10',
            'invitations.*.email' => 'required|email',
            'invitations.*.role'  => 'required|in:admin,manager,member,viewer',
        ]);

        $org      = $request->user()->organization;
        $inviter  = $request->user();
        $sent     = [];

        foreach ($validated['invitations'] as $inv) {
            $invitation = $this->onboarding->inviteUser($org, $inv['email'], $inv['role'], $inviter);
            $sent[]     = ['email' => $inv['email'], 'token' => $invitation->token];
        }

        return response()->json(['message' => count($sent).' invitation(s) envoyée(s).', 'sent' => $sent], 201);
    }

    // ── GET /invitations/accept/{token} ──────────────────────────────────────
    public function acceptInvitation(string $token): \Illuminate\Http\RedirectResponse
    {
        $invitation = $this->onboarding->acceptInvitation($token);

        // Rediriger vers l'inscription si l'utilisateur n'existe pas encore
        $userExists = \App\Models\User::where('email', $invitation->email)->exists();

        if (!$userExists) {
            return redirect()->route('register', [
                'invitation_token' => $token,
                'email'            => $invitation->email,
            ]);
        }

        return redirect()->route('dashboard')
            ->with('success', 'Vous avez rejoint '.$invitation->organization->name.' avec succès !');
    }

    // =========================================================================
    // Gamified Onboarding — Routes: /onboarding/status|complete|skip
    // =========================================================================

    // ── GET /onboarding/status ────────────────────────────────────────────────
    /** Progression gamifiée complète du user connecté (points + badges). */
    public function status(Request $request): JsonResponse
    {
        $progress = $this->gamified->getProgress($request->user());
        return response()->json($progress);
    }

    // ── POST /onboarding/complete ─────────────────────────────────────────────
    /** Marque une étape gamifiée comme complétée. */
    public function complete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'key'      => 'required|string|max:50',
            'metadata' => 'sometimes|array',
        ]);

        $user = $request->user();
        $this->gamified->completeStep($user, $validated['key'], $validated['metadata'] ?? []);

        return response()->json([
            'message'  => 'Étape complétée.',
            'progress' => $this->gamified->getProgress($user),
        ]);
    }

    // ── POST /onboarding/skip ─────────────────────────────────────────────────
    /** Ignore l'onboarding gamifié (flag sur les metadata user). */
    public function skip(Request $request): JsonResponse
    {
        $user = $request->user();

        // Stocker le flag dans les metadata utilisateur
        $meta = $user->metadata ?? [];
        $meta['onboarding_skipped_at'] = now()->toIso8601String();
        $user->update(['metadata' => $meta]);

        return response()->json(['message' => 'Onboarding ignoré.']);
    }

    // ── POST /trial/start ─────────────────────────────────────────────────────
    public function startTrial(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id'      => 'required|string',
            'utm_source'   => 'nullable|string',
            'utm_medium'   => 'nullable|string',
            'utm_campaign' => 'nullable|string',
        ]);

        $org        = $request->user()->organization;
        $activation = $this->trial->startTrial($org, $validated['plan_id'], $validated);

        // Initialiser l'onboarding simultanément
        $this->onboarding->initializeOnboarding($org);

        return response()->json([
            'message'       => 'Trial démarré.',
            'trialEnd'      => $activation->trial_end->toDateString(),
            'remainingDays' => $this->trial->getRemainingDays($org),
        ], 201);
    }
}
