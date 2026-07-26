<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/**
 * GamifiedOnboardingService
 *
 * Gère les étapes d'onboarding gamifiées (points, badges, progression par user)
 * en s'appuyant sur les tables onboarding_steps et onboarding_completions.
 *
 * Distinct de OnboardingService (qui gère l'onboarding organisation initial).
 */
class GamifiedOnboardingService
{
    private const CACHE_TTL = 300; // 5 minutes

    /** Niveaux de badges : [label, min_points, color] */
    private const LEVELS = [
        ['label' => 'Débutant', 'min' => 0,   'color' => '#6B7280', 'icon' => '🌱'],
        ['label' => 'Initié',   'min' => 201,  'color' => '#2E86C1', 'icon' => '⚡'],
        ['label' => 'Expert',   'min' => 401,  'color' => '#F39C12', 'icon' => '🏆'],
        ['label' => 'Master',   'min' => 601,  'color' => '#1E8449', 'icon' => '👑'],
    ];

    // ── getStepsForUser ───────────────────────────────────────────────────────
    /**
     * Retourne les étapes avec leur statut (completed/pending) pour un user.
     *
     * @return list<array<string, mixed>>
     */
    public function getStepsForUser(User $user): array
    {
        $steps = DB::table('onboarding_steps')
            ->orderBy('order')
            ->get();

        $completedRows = DB::table('onboarding_completions')
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('step_key');

        $locale = $user->locale ?? app()->getLocale() ?? 'fr';

        return $steps->map(function ($step) use ($completedRows, $locale) {
            $translations = json_decode((string) $step->translations, true);
            $t = $translations[$locale] ?? $translations['fr'] ?? [];
            $completion = $completedRows->get($step->key);

            return [
                'key'          => $step->key,
                'order'        => (int) $step->order,
                'icon'         => $step->icon,
                'points'       => (int) $step->points,
                'is_required'  => (bool) $step->is_required,
                'route_name'   => $step->route_name,
                'title'        => $t['title'] ?? $step->key,
                'description'  => $t['description'] ?? '',
                'action_label' => $t['action_label'] ?? 'Faire',
                'completed'    => $completion !== null,
                'completed_at' => $completion?->completed_at,
                'metadata'     => $completion ? json_decode((string) ($completion->metadata ?? 'null'), true) : null,
            ];
        })->values()->toArray();
    }

    // ── completeStep ──────────────────────────────────────────────────────────
    /**
     * Marque une étape comme complétée pour le user donné.
     * Idempotent — ne duplique pas si déjà complétée.
     */
    public function completeStep(User $user, string $stepKey, array $metadata = []): void
    {
        $exists = DB::table('onboarding_steps')->where('key', $stepKey)->exists();
        if (! $exists) {
            return;
        }

        DB::table('onboarding_completions')->updateOrInsert(
            [
                'user_id'  => $user->id,
                'step_key' => $stepKey,
            ],
            [
                'organization_id' => $user->organization_id,
                'completed_at'    => now(),
                'metadata'        => $metadata ? json_encode($metadata) : null,
                'updated_at'      => now(),
                'created_at'      => now(),
            ]
        );

        Cache::forget($this->cacheKey($user));
    }

    // ── getProgress ───────────────────────────────────────────────────────────
    /**
     * Calcule le pourcentage d'avancement et les points gagnés.
     *
     * @return array{completed: int, total: int, percent: int, points_earned: int, level: array<string,mixed>, steps: list<array<string,mixed>>}
     */
    public function getProgress(User $user): array
    {
        return Cache::remember($this->cacheKey($user), self::CACHE_TTL, function () use ($user) {
            $steps = $this->getStepsForUser($user);

            $total        = count($steps);
            $completed    = collect($steps)->where('completed', true)->count();
            $pointsEarned = collect($steps)->where('completed', true)->sum('points');
            $percent      = $total > 0 ? (int) round(($completed / $total) * 100) : 0;

            return [
                'completed'     => $completed,
                'total'         => $total,
                'percent'       => $percent,
                'points_earned' => $pointsEarned,
                'level'         => $this->resolveLevel($pointsEarned),
                'steps'         => $steps,
            ];
        });
    }

    // ── checkAndComplete ──────────────────────────────────────────────────────
    /**
     * Mappe un événement système à une clé d'étape et la complète automatiquement.
     * Appelé depuis les Observers / Event Listeners.
     *
     * Événements reconnus :
     *   profile.updated, avatar.uploaded, 2fa.enabled, user.invited,
     *   event.created, document.uploaded, task.created, visitor.registered,
     *   sara.message_sent, guide.article_read, report.generated, dashboard.customized
     */
    public function checkAndComplete(User $user, string $event): void
    {
        $mapping = [
            'profile.updated'      => 'profile_complete',
            'avatar.uploaded'      => 'upload_avatar',
            '2fa.enabled'          => 'enable_2fa',
            'user.invited'         => 'invite_team',
            'event.created'        => 'create_event',
            'document.uploaded'    => 'upload_document',
            'task.created'         => 'create_task',
            'visitor.registered'   => 'register_visitor',
            'sara.message_sent'    => 'chat_sara',
            'guide.article_read'   => 'explore_guide',
            'report.generated'     => 'generate_report',
            'dashboard.customized' => 'customize_dashboard',
        ];

        if (isset($mapping[$event])) {
            $this->completeStep($user, $mapping[$event], ['via_event' => $event]);
        }
    }

    // ── Helpers privés ────────────────────────────────────────────────────────
    private function cacheKey(User $user): string
    {
        return "gamified_onboarding:progress:{$user->id}";
    }

    /**
     * @return array{label: string, min: int, color: string, icon: string}
     */
    private function resolveLevel(int $points): array
    {
        $level = self::LEVELS[0];
        foreach (self::LEVELS as $l) {
            if ($points >= $l['min']) {
                $level = $l;
            }
        }
        return $level;
    }
}
