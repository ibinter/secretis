<?php

namespace App\Services;

use App\Models\License;
use App\Models\Organization;
use App\Models\OrganizationHealthScore;
use App\Models\SaasDailyMetric;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * SaasMetricsService — Calculs métriques SaaS pour le Super Admin IBIG Soft
 *
 * Toutes les méthodes sont idempotentes : elles peuvent être rappelées
 * sans produire de doublons (upsert sur la date / l'organisation).
 *
 * ACCÈS RESTREINT : Ce service ne doit être appelé que depuis :
 *   - App\Console\Commands\ComputeSaasMetrics (CRON)
 *   - App\Http\Controllers\SuperAdmin\SaasMetricsController (lecture uniquement)
 */
class SaasMetricsService
{
    // ─── Tarifs XOF par plan (mensuel) ────────────────────────────────────────
    private const PLAN_PRICES = [
        'starter'    => 25_000,
        'pro'        => 75_000,
        'enterprise' => 150_000,
        'on_premise' => 0,
    ];

    // ─── Seuils health score ──────────────────────────────────────────────────
    private const CHURN_HIGH_THRESHOLD   = 40;
    private const CHURN_MEDIUM_THRESHOLD = 60;

    // ─────────────────────────────────────────────────────────────────────────
    // MÉTRIQUES JOURNALIÈRES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calcule et stocke tous les métriques SaaS pour la journée.
     * Appelé quotidiennement par le CRON à 2h00.
     *
     * @return SaasDailyMetric Le snapshot créé/mis à jour
     */
    public function computeDailyMetrics(): SaasDailyMetric
    {
        $today = Carbon::today();

        // ── Organisations ────────────────────────────────────────────────────
        $totalOrgs   = Organization::withTrashed(false)->count();
        $activeOrgs  = Organization::active()->count();
        $newOrgs     = Organization::whereDate('created_at', $today)->count();
        $churnedOrgs = $this->countChurnedOrganizations($today);

        // ── Utilisateurs ─────────────────────────────────────────────────────
        $totalUsers = User::whereNull('deleted_at')->count();
        $mauUsers   = $this->computeMAU();
        $dauUsers   = $this->computeDAU($today);

        // ── Plans ────────────────────────────────────────────────────────────
        $planCounts = $this->getPlanDistribution();

        // ── MRR ──────────────────────────────────────────────────────────────
        $mrrData = $this->getMrrBreakdown(Carbon::now()->startOfMonth());

        return SaasDailyMetric::updateOrCreate(
            ['metric_date' => $today->toDateString()],
            [
                'total_organizations'   => $totalOrgs,
                'active_organizations'  => $activeOrgs,
                'new_organizations'     => $newOrgs,
                'churned_organizations' => $churnedOrgs,
                'total_users'           => $totalUsers,
                'active_users_mau'      => $mauUsers,
                'active_users_dau'      => $dauUsers,
                'plan_starter_count'    => $planCounts['starter'] ?? 0,
                'plan_pro_count'        => $planCounts['pro'] ?? 0,
                'plan_enterprise_count' => $planCounts['enterprise'] ?? 0,
                'on_premise_count'      => $planCounts['on_premise'] ?? 0,
                'mrr_xof'               => $mrrData['mrr'],
                'arr_xof'               => $mrrData['mrr'] * 12,
                'new_mrr'               => $mrrData['new_mrr'],
                'expansion_mrr'         => $mrrData['expansion_mrr'],
                'churned_mrr'           => $mrrData['churned_mrr'],
            ]
        );
    }

    /**
     * MAU (Monthly Active Users) — utilisateurs ayant eu une session dans les 30 derniers jours.
     */
    private function computeMAU(): int
    {
        return User::whereNotNull('last_login_at')
            ->where('last_login_at', '>=', Carbon::now()->subDays(30))
            ->count();
    }

    /**
     * DAU (Daily Active Users) — utilisateurs connectés aujourd'hui.
     */
    private function computeDAU(Carbon $date): int
    {
        return User::whereNotNull('last_login_at')
            ->whereDate('last_login_at', $date->toDateString())
            ->count();
    }

    /**
     * Organisations ayant annulé/expiré ce jour.
     */
    private function countChurnedOrganizations(Carbon $date): int
    {
        return License::where('status', 'cancelled')
            ->whereDate('updated_at', $date->toDateString())
            ->distinct('organization_id')
            ->count('organization_id');
    }

    /**
     * Répartition des licences actives par plan.
     */
    private function getPlanDistribution(): array
    {
        return License::where('status', 'active')
            ->selectRaw('plan_id, COUNT(*) as cnt')
            ->groupBy('plan_id')
            ->pluck('cnt', 'plan_id')
            ->toArray();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HEALTH SCORE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calcule le health score (0-100) d'une organisation et le persiste.
     *
     * Pondération :
     *   - Fréquence de connexion  : 25 pts (logins/7j ramenés à 7+ = 100%)
     *   - Adoption fonctionnalités: 30 pts (% modules utilisés)
     *   - Volume de données       : 15 pts (> 1 Go = 100%, linéaire)
     *   - Récence dernière activité: 20 pts (aujourd'hui = 100%, -10% par jour d'inactivité)
     *   - Tickets support ouverts : -10 pts max (1 ticket = -3, 2 = -6, 3+ = -10)
     *
     * @return int Score 0-100
     */
    public function computeHealthScore(Organization $org): int
    {
        $today = Carbon::today();

        // ── Fréquence de connexion (25 pts) ──────────────────────────────────
        $loginsLast7Days = User::where('organization_id', $org->id)
            ->where('last_login_at', '>=', $today->copy()->subDays(7))
            ->count();
        // Normaliser : 7 logins/semaine (au moins 1 par jour) = max
        $loginScore = min(25, round(($loginsLast7Days / max($org->users()->count(), 1)) * 25));

        // ── Adoption des fonctionnalités (30 pts) ─────────────────────────────
        $modulesEnabled = count($org->getSetting('enabled_modules', []));
        $totalModules   = 12; // modules disponibles dans la plateforme
        $adoptionPct    = $modulesEnabled / $totalModules;
        $adoptionScore  = round($adoptionPct * 30);

        // ── Volume de données (15 pts) ─────────────────────────────────────
        // Approximation : nb documents * 0.5 Mo moyen
        $docCount    = DB::table('documents')->where('organization_id', $org->id)->count();
        $dataVolumeGb = ($docCount * 0.5) / 1024;
        $volumeScore  = min(15, round(($dataVolumeGb / 1.0) * 15)); // 1 Go = plein score

        // ── Récence de la dernière activité (20 pts) ──────────────────────
        $lastActive = User::where('organization_id', $org->id)
            ->max('last_login_at');
        $lastActiveAt = $lastActive ? Carbon::parse($lastActive) : null;

        if ($lastActiveAt === null) {
            $recencyScore = 0;
        } else {
            $daysSince    = $today->diffInDays($lastActiveAt, false);
            // Actif aujourd'hui = 20, perd 2 pts par jour d'inactivité
            $recencyScore = max(0, min(20, 20 - (abs($daysSince) * 2)));
        }

        // ── Tickets support ouverts (-10 pts max) ─────────────────────────
        $openTickets  = DB::table('support_tickets')
            ->where('organization_id', $org->id)
            ->whereIn('status', ['open', 'in_progress'])
            ->count();
        $ticketPenalty = min(10, $openTickets * 3);

        // ── Score total ────────────────────────────────────────────────────
        $score = max(0, min(100,
            $loginScore + $adoptionScore + $volumeScore + $recencyScore - $ticketPenalty
        ));

        // ── Détermination du risque de churn ──────────────────────────────
        if ($score < self::CHURN_HIGH_THRESHOLD) {
            $churnRisk = 'high';
            $churnReason = $this->predictChurnReason($loginScore, $adoptionScore, $recencyScore, $openTickets);
        } elseif ($score < self::CHURN_MEDIUM_THRESHOLD) {
            $churnRisk = 'medium';
            $churnReason = null;
        } else {
            $churnRisk = 'low';
            $churnReason = null;
        }

        // ── Persistance ───────────────────────────────────────────────────
        OrganizationHealthScore::updateOrCreate(
            [
                'organization_id' => $org->id,
                'score_date'      => $today->toDateString(),
            ],
            [
                'health_score'          => $score,
                'login_frequency'       => $loginsLast7Days,
                'feature_adoption'      => round($adoptionPct * 100, 1),
                'data_volume_gb'        => round($dataVolumeGb, 3),
                'support_tickets'       => $openTickets,
                'last_active_at'        => $lastActiveAt,
                'churn_risk'            => $churnRisk,
                'churn_reason_predicted' => $churnReason,
            ]
        );

        return $score;
    }

    /**
     * Prédit la raison principale de churn à partir des métriques.
     */
    private function predictChurnReason(
        float $loginScore,
        float $adoptionScore,
        float $recencyScore,
        int   $openTickets
    ): string {
        if ($recencyScore < 5) {
            return 'Inactivité prolongée — dernière connexion il y a plus de 7 jours';
        }
        if ($loginScore < 5) {
            return 'Très faible engagement utilisateur — moins d\'1 session/semaine par utilisateur';
        }
        if ($adoptionScore < 5) {
            return 'Adoption insuffisante des fonctionnalités — moins de 20% des modules utilisés';
        }
        if ($openTickets >= 3) {
            return 'Insatisfaction probable — plusieurs tickets support non résolus';
        }
        return 'Combinaison de facteurs : faible engagement et adoption partielle';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MRR
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retourne le détail MRR pour un mois donné.
     *
     * @return array{
     *   mrr: float,
     *   arr: float,
     *   new_mrr: float,
     *   expansion_mrr: float,
     *   churned_mrr: float,
     *   net_new_mrr: float,
     *   by_plan: array
     * }
     */
    public function getMrrBreakdown(Carbon $month): array
    {
        $startOfMonth = $month->copy()->startOfMonth();
        $endOfMonth   = $month->copy()->endOfMonth();

        // MRR courant = somme des licences actives ce mois
        $activeLicenses = License::where('status', 'active')
            ->where('starts_at', '<=', $endOfMonth)
            ->where('ends_at', '>=', $startOfMonth)
            ->get();

        $mrr = 0;
        $byPlan = [];

        foreach ($activeLicenses as $license) {
            $monthlyPrice = $license->billing_cycle === 'yearly'
                ? $license->price / 12
                : $license->price;

            $planSlug = $license->plan_id;
            $mrr += $monthlyPrice;
            $byPlan[$planSlug] = ($byPlan[$planSlug] ?? 0) + $monthlyPrice;
        }

        // New MRR = licences créées ce mois
        $newMrr = License::where('status', 'active')
            ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->get()
            ->sum(fn($l) => $l->billing_cycle === 'yearly' ? $l->price / 12 : $l->price);

        // Expansion MRR = upgrades de plan ce mois (approximation : nouvelles licences > ancien plan)
        $expansionMrr = 0; // Nécessite un historique des changements de plan

        // Churned MRR = licences annulées ce mois
        $churnedMrr = License::where('status', 'cancelled')
            ->whereBetween('updated_at', [$startOfMonth, $endOfMonth])
            ->get()
            ->sum(fn($l) => $l->billing_cycle === 'yearly' ? $l->price / 12 : $l->price);

        return [
            'mrr'           => round($mrr, 2),
            'arr'           => round($mrr * 12, 2),
            'new_mrr'       => round($newMrr, 2),
            'expansion_mrr' => round($expansionMrr, 2),
            'churned_mrr'   => round($churnedMrr, 2),
            'net_new_mrr'   => round($newMrr + $expansionMrr - $churnedMrr, 2),
            'by_plan'       => $byPlan,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRÉVISIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Génère des prévisions de revenus sur N mois (3 scénarios : bear/base/bull).
     *
     * La croissance est calculée à partir du taux de croissance MRR des 6 derniers mois.
     *
     * @return array{ bear: array, base: array, bull: array }
     */
    public function getRevenueForecasts(int $months = 12): array
    {
        // Récupère les 6 derniers snapshots journaliers (dernier de chaque mois)
        $history = SaasDailyMetric::whereRaw("metric_date = date_trunc('month', metric_date) + interval '1 month - 1 day'")
            ->orderByDesc('metric_date')
            ->limit(6)
            ->get(['metric_date', 'mrr_xof']);

        if ($history->count() < 2) {
            // Pas assez d'historique : croissance estimée à 5%
            $growthRate = 0.05;
        } else {
            $oldest = $history->last()->mrr_xof;
            $newest = $history->first()->mrr_xof;
            $periods = $history->count() - 1;
            // CAGR mensuel
            $growthRate = $oldest > 0 ? (pow($newest / $oldest, 1 / $periods) - 1) : 0.05;
        }

        $currentMrr = SaasDailyMetric::latest('metric_date')->value('mrr_xof') ?? 0;

        $bear = [];
        $base = [];
        $bull = [];

        for ($i = 1; $i <= $months; $i++) {
            $label = Carbon::now()->addMonths($i)->format('M Y');
            $bear[] = ['month' => $label, 'mrr' => round($currentMrr * pow(1 + ($growthRate * 0.5), $i))];
            $base[] = ['month' => $label, 'mrr' => round($currentMrr * pow(1 + $growthRate, $i))];
            $bull[] = ['month' => $label, 'mrr' => round($currentMrr * pow(1 + ($growthRate * 1.5), $i))];
        }

        return compact('bear', 'base', 'bull');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANALYSE DE COHORTE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Analyse de rétention par cohorte (mois de souscription).
     *
     * Retourne un tableau : mois_souscription → [M+0: 100, M+1: %, M+3: %, M+6: %, M+12: %]
     *
     * @return array
     */
    public function getCohortAnalysis(): array
    {
        // On récupère toutes les licences groupées par mois de création
        $cohorts = License::selectRaw("DATE_TRUNC('month', created_at) as cohort_month, COUNT(*) as initial_count")
            ->whereNotNull('created_at')
            ->groupBy('cohort_month')
            ->orderBy('cohort_month')
            ->get();

        $result = [];

        foreach ($cohorts as $cohort) {
            $cohortDate     = Carbon::parse($cohort->cohort_month);
            $cohortLabel    = $cohortDate->format('M Y');
            $initialCount   = $cohort->initial_count;

            $row = ['cohort' => $cohortLabel, 'initial' => $initialCount, 'periods' => []];

            // Calculer la rétention à M+0, M+1, M+3, M+6, M+12
            foreach ([0, 1, 3, 6, 12] as $offset) {
                $checkDate = $cohortDate->copy()->addMonths($offset);

                if ($checkDate->isFuture()) {
                    $row['periods']["M+{$offset}"] = null; // pas encore atteint
                    continue;
                }

                // Compter combien d'orgs de cette cohorte avaient une licence active à cette date
                $active = License::whereRaw("DATE_TRUNC('month', created_at) = ?", [$cohort->cohort_month])
                    ->where('starts_at', '<=', $checkDate->endOfMonth())
                    ->where(function ($q) use ($checkDate) {
                        $q->whereNull('ends_at')
                          ->orWhere('ends_at', '>=', $checkDate->startOfMonth());
                    })
                    ->whereNotIn('status', ['cancelled'])
                    ->count();

                $row['periods']["M+{$offset}"] = $initialCount > 0
                    ? round(($active / $initialCount) * 100, 1)
                    : 0;
            }

            $result[] = $row;
        }

        return $result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOP ORGANISATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retourne les N meilleures organisations triées par MRR.
     *
     * @return array
     */
    public function getTopOrganizations(int $limit = 20): array
    {
        $orgs = Organization::active()
            ->with(['license', 'users'])
            ->withCount('users')
            ->get();

        $result = [];

        foreach ($orgs as $org) {
            $license = $org->license;
            if (!$license) {
                continue;
            }

            $monthlyRevenue = $license->billing_cycle === 'yearly'
                ? $license->price / 12
                : $license->price;

            $healthScore = OrganizationHealthScore::where('organization_id', $org->id)
                ->latest('score_date')
                ->value('health_score') ?? 50;

            $result[] = [
                'id'            => $org->id,
                'name'          => $org->name,
                'slug'          => $org->slug,
                'plan'          => $license->plan_id,
                'mrr'           => $monthlyRevenue,
                'users_count'   => $org->users_count,
                'health_score'  => $healthScore,
                'created_at'    => $org->created_at->toDateString(),
                'months_active' => $org->created_at->diffInMonths(now()),
            ];
        }

        // Trier par MRR décroissant
        usort($result, fn ($a, $b) => $b['mrr'] <=> $a['mrr']);

        return array_slice($result, 0, $limit);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FEATURE ADOPTION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Calcule le taux d'adoption de chaque module.
     *
     * @return array{ module: string, label: string, count: int, percent: float }[]
     */
    public function getFeatureAdoptionRates(): array
    {
        $modules = [
            'agenda'       => 'Agenda',
            'courrier'     => 'Courrier',
            'ged'          => 'GED',
            'taches'       => 'Tâches',
            'reunions'     => 'Réunions',
            'rh'           => 'Ressources Humaines',
            'comptabilite' => 'Comptabilité',
            'projets'      => 'Projets',
            'bi'           => 'Business Intelligence',
            'formation'    => 'Formation',
            'signatures'   => 'Signatures',
            'ressources'   => 'Ressources matérielles',
        ];

        $totalOrgs = Organization::active()->count();
        if ($totalOrgs === 0) {
            return [];
        }

        $result = [];

        foreach ($modules as $slug => $label) {
            // Compter les orgs ayant ce module dans leurs settings
            $count = Organization::active()
                ->whereRaw("settings->'enabled_modules' @> ?", [json_encode([$slug])])
                ->count();

            $result[] = [
                'module'  => $slug,
                'label'   => $label,
                'count'   => $count,
                'percent' => round(($count / $totalOrgs) * 100, 1),
            ];
        }

        // Trier par adoption décroissante
        usort($result, fn ($a, $b) => $b['percent'] <=> $a['percent']);

        return $result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DÉTECTION DU RISQUE DE CHURN
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retourne les organisations à risque élevé avec leur raison prédite.
     *
     * @return array
     */
    public function detectChurnRisk(): array
    {
        return OrganizationHealthScore::where('churn_risk', 'high')
            ->whereDate('score_date', Carbon::today()->toDateString())
            ->with('organization')
            ->get()
            ->map(function ($score) {
                return [
                    'organization_id'    => $score->organization_id,
                    'organization_name'  => $score->organization?->name ?? 'N/A',
                    'health_score'       => $score->health_score,
                    'churn_risk'         => $score->churn_risk,
                    'churn_reason'       => $score->churn_reason_predicted,
                    'last_active_at'     => $score->last_active_at?->toDateTimeString(),
                    'login_frequency'    => $score->login_frequency,
                    'feature_adoption'   => $score->feature_adoption,
                ];
            })
            ->sortBy('health_score')
            ->values()
            ->toArray();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ALERTES MRR
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Vérifie si le MRR a baissé de plus de 5% vs le mois précédent.
     * Envoie une alerte si c'est le cas.
     */
    public function checkMrrAlert(): void
    {
        $thisMonth = SaasDailyMetric::whereMonth('metric_date', Carbon::now()->month)
            ->whereYear('metric_date', Carbon::now()->year)
            ->avg('mrr_xof') ?? 0;

        $lastMonth = SaasDailyMetric::whereMonth('metric_date', Carbon::now()->subMonth()->month)
            ->whereYear('metric_date', Carbon::now()->subMonth()->year)
            ->avg('mrr_xof') ?? 0;

        if ($lastMonth > 0) {
            $change = (($thisMonth - $lastMonth) / $lastMonth) * 100;

            if ($change < -5) {
                Log::warning('ALERTE MRR : baisse > 5%', [
                    'this_month_avg' => $thisMonth,
                    'last_month_avg' => $lastMonth,
                    'change_pct'     => round($change, 2),
                ]);

                // Notification par email à l'équipe IBIG Soft
                $ibigEmails = config('secretis.superadmin_alert_emails', ['admin@ibigsoft.com']);

                foreach ($ibigEmails as $email) {
                    try {
                        Mail::raw(
                            "ALERTE MRR SECRETIS\n\n" .
                            "Le MRR moyen du mois en cours a baissé de " . abs(round($change, 1)) . "% vs le mois précédent.\n\n" .
                            "Mois précédent : " . number_format($lastMonth, 0, ',', ' ') . " XOF\n" .
                            "Mois en cours  : " . number_format($thisMonth, 0, ',', ' ') . " XOF\n\n" .
                            "Vérifiez le tableau de bord SuperAdmin pour plus de détails.",
                            fn ($msg) => $msg->to($email)->subject('[ALERTE] Baisse MRR SECRETIS > 5%')
                        );
                    } catch (\Throwable $e) {
                        Log::error('Impossible d\'envoyer l\'alerte MRR', ['email' => $email, 'error' => $e->getMessage()]);
                    }
                }
            }
        }
    }
}
