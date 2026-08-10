<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\TrialActivation;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class TrialService
{
    public const TRIAL_DAYS = 14;

    // ── Démarrer un trial ─────────────────────────────────────────────────────
    public function startTrial(Organization $org, string $planId, array $utmData = []): TrialActivation
    {
        // Désactiver l'éventuel trial précédent
        TrialActivation::where('organization_id', $org->id)
            ->whereNull('converted_at')
            ->update(['trial_end' => now()]);

        $activation = TrialActivation::create([
            'organization_id' => $org->id,
            'plan_id'         => $planId,
            'trial_start'     => now(),
            'trial_end'       => now()->addDays(self::TRIAL_DAYS),
            'source'          => $utmData['source_type'] ?? 'web',
            'utm_source'      => $utmData['utm_source']   ?? null,
            'utm_medium'      => $utmData['utm_medium']   ?? null,
            'utm_campaign'    => $utmData['utm_campaign'] ?? null,
        ]);

        // Email de bienvenue
        $admin = $org->owner ?? $org->users()->first();
        if ($admin) {
            Mail::to($admin->email)->send(
                new \App\Mail\WelcomeMail($admin, $org, self::TRIAL_DAYS)
            );
        }

        return $activation;
    }

    // ── Jours restants ────────────────────────────────────────────────────────
    public function getRemainingDays(Organization $org): int
    {
        $activation = $this->getActiveTrialActivation($org);
        if (!$activation) {
            return 0;
        }
        $remaining = (int) now()->diffInDays($activation->trial_end, false);
        return max(0, $remaining);
    }

    // ── Trial expiré ? ────────────────────────────────────────────────────────
    public function isTrialExpired(Organization $org): bool
    {
        $activation = $this->getActiveTrialActivation($org);
        if (!$activation) {
            return true;
        }
        return $activation->trial_end->isPast();
    }

    // ── Conversion vers payant ────────────────────────────────────────────────
    public function convertToPaid(Organization $org, string $planId): void
    {
        $activation = $this->getActiveTrialActivation($org);
        abort_unless($activation, 404, 'Aucun trial actif trouvé.');

        $activation->update([
            'converted_at'     => now(),
            'converted_plan_id'=> $planId,
        ]);

        // Mettre à jour l'organisation
        $org->update([
            'plan_id'    => $planId,
            'plan_status'=> 'active',
        ]);

        // Email de confirmation
        $admin = $org->owner ?? $org->users()->first();
        if ($admin) {
            Mail::to($admin->email)->send(
                new \App\Mail\WelcomeMail($admin, $org, 0)
            );
        }
    }

    // ── Emails de relance avant fin ───────────────────────────────────────────
    /**
     * À appeler depuis un scheduler quotidien.
     * Envoie un email à J-7, J-3, J-1 avant expiration.
     */
    public function sendTrialNudgeEmails(Organization $org): void
    {
        $activation = $this->getActiveTrialActivation($org);
        if (!$activation || $activation->converted_at) {
            return;
        }

        $remaining   = $this->getRemainingDays($org);
        $admin       = $org->owner ?? $org->users()->first();
        if (!$admin) {
            return;
        }

        $featuresUsed = $this->getFeaturesUsed($org);

        match ($remaining) {
            7 => Mail::to($admin->email)->send(
                ),
            3 => Mail::to($admin->email)->send(
                ),
            1 => Mail::to($admin->email)->send(
                ),
            default => null,
        };
    }

    // ── Analytics SuperAdmin ──────────────────────────────────────────────────
    public function getTrialAnalytics(): array
    {
        $total      = TrialActivation::count();
        $converted  = TrialActivation::whereNotNull('converted_at')->count();
        $active     = TrialActivation::whereNull('converted_at')
                        ->where('trial_end', '>', now())->count();
        $expired    = TrialActivation::whereNull('converted_at')
                        ->where('trial_end', '<=', now())->count();

        $conversionRate = $total > 0 ? round(($converted / $total) * 100, 1) : 0;

        // Conversion par période (30 derniers jours)
        $byPeriod = TrialActivation::selectRaw(
                "DATE_TRUNC('week', trial_start) AS week,
                 COUNT(*) AS started,
                 COUNT(converted_at) AS converted"
            )
            ->where('trial_start', '>=', now()->subDays(30))
            ->groupBy('week')
            ->orderBy('week')
            ->get();

        // Organisations en trial sur le point d'expirer (J-3)
        $expiringSoon = TrialActivation::with('organization')
            ->whereNull('converted_at')
            ->whereBetween('trial_end', [now(), now()->addDays(3)])
            ->latest('trial_end')
            ->get()
            ->map(fn($t) => [
                'organization'  => $t->organization?->name,
                'plan'          => $t->plan_id,
                'expiresAt'     => $t->trial_end->toDateString(),
                'remainingDays' => (int) now()->diffInDays($t->trial_end),
            ]);

        // Sources d'acquisition
        $bySource = TrialActivation::selectRaw('source, COUNT(*) AS total, COUNT(converted_at) AS converted')
            ->groupBy('source')
            ->get();

        // Features les plus utilisées (nécessite une table activity_logs ou similaire)
        $featuresUsed = $this->getGlobalFeaturesUsage();

        return [
            'funnel' => [
                'registered' => $total,
                'active'     => $active,
                'converted'  => $converted,
                'expired'    => $expired,
            ],
            'conversionRate'  => $conversionRate,
            'byPeriod'        => $byPeriod,
            'expiringSoon'    => $expiringSoon,
            'bySource'        => $bySource,
            'featuresUsed'    => $featuresUsed,
        ];
    }

    // ── Helpers privés ────────────────────────────────────────────────────────
    private function getActiveTrialActivation(Organization $org): ?TrialActivation
    {
        return TrialActivation::where('organization_id', $org->id)
            ->whereNull('converted_at')
            ->latest('trial_start')
            ->first();
    }

    private function getFeaturesUsed(Organization $org): array
    {
        // Requête sur la table activity_logs si elle existe
        if (!DB::getSchemaBuilder()->hasTable('activity_logs')) {
            return [];
        }

        return DB::table('activity_logs')
            ->where('organization_id', $org->id)
            ->selectRaw('module, COUNT(*) AS usage_count')
            ->groupBy('module')
            ->orderByDesc('usage_count')
            ->limit(5)
            ->get()
            ->toArray();
    }

    private function getGlobalFeaturesUsage(): array
    {
        if (!DB::getSchemaBuilder()->hasTable('activity_logs')) {
            return [];
        }

        return DB::table('activity_logs')
            ->join('trial_activations', function ($j) {
                $j->on('activity_logs.organization_id', '=', 'trial_activations.organization_id')
                  ->whereNull('trial_activations.converted_at');
            })
            ->selectRaw('activity_logs.module, COUNT(*) AS usage_count')
            ->groupBy('activity_logs.module')
            ->orderByDesc('usage_count')
            ->limit(10)
            ->get()
            ->toArray();
    }
}
