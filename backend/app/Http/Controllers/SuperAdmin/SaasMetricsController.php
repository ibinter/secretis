<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\OrganizationHealthScore;
use App\Models\SaasDailyMetric;
use App\Services\SaasMetricsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SaasMetricsController — Métriques SaaS SuperAdmin IBIG Soft
 *
 * ACCÈS RESTREINT : Toutes les routes de ce contrôleur sont protégées
 * par le middleware 'role:superadmin_ibig'.
 */
class SaasMetricsController extends Controller
{
    public function __construct(private readonly SaasMetricsService $metricsService)
    {
        $this->middleware(['auth', 'role:superadmin_ibig']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/metrics/dashboard
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Tableau de bord SaaS global.
     * Renvoie les métriques des 12 derniers mois + snapshot courant.
     */
    public function dashboard(Request $request): Response|JsonResponse
    {
        // Snapshot le plus récent
        $latest = SaasDailyMetric::latest('metric_date')->first();

        // Évolution sur 12 mois (dernier jour de chaque mois)
        $monthlyTrend = SaasDailyMetric::selectRaw(
                "DATE_TRUNC('month', metric_date) as month,
                 MAX(mrr_xof) as mrr,
                 MAX(active_organizations) as active_orgs,
                 MAX(active_users_mau) as mau,
                 MAX(active_users_dau) as dau,
                 SUM(new_organizations) as new_orgs,
                 SUM(churned_organizations) as churned_orgs"
            )
            ->whereDate('metric_date', '>=', Carbon::now()->subMonths(12)->startOfMonth())
            ->groupByRaw("DATE_TRUNC('month', metric_date)")
            ->orderBy('month')
            ->get()
            ->map(fn ($row) => [
                'month'        => Carbon::parse($row->month)->format('M Y'),
                'mrr'          => (float) $row->mrr,
                'active_orgs'  => (int) $row->active_orgs,
                'mau'          => (int) $row->mau,
                'dau'          => (int) $row->dau,
                'new_orgs'     => (int) $row->new_orgs,
                'churned_orgs' => (int) $row->churned_orgs,
            ]);

        // Taux de churn mensuel
        $churnRate = $this->computeChurnRate();

        $data = [
            'kpis' => [
                'mrr'             => $latest?->mrr_xof ?? 0,
                'arr'             => ($latest?->arr_xof) ?? 0,
                'mrr_growth'      => $this->mrrGrowthRate(),
                'churn_rate'      => $churnRate,
                'active_orgs'     => $latest?->active_organizations ?? 0,
                'mau'             => $latest?->active_users_mau ?? 0,
                'dau'             => $latest?->active_users_dau ?? 0,
                'dau_mau_ratio'   => $latest && $latest->active_users_mau > 0
                    ? round(($latest->active_users_dau / $latest->active_users_mau) * 100, 1)
                    : 0,
            ],
            'monthly_trend'     => $monthlyTrend,
            'churn_risk_orgs'   => $this->metricsService->detectChurnRisk(),
            'top_organizations' => $this->metricsService->getTopOrganizations(5),
        ];

        if ($request->wantsJson()) {
            return response()->json($data);
        }

        return Inertia::render('SuperAdmin/SaasDashboard', $data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/metrics/mrr
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Analyse MRR détaillée + prévisions.
     */
    public function mrr(Request $request): Response|JsonResponse
    {
        $month       = $request->has('month')
            ? Carbon::parse($request->month)->startOfMonth()
            : Carbon::now()->startOfMonth();

        $breakdown   = $this->metricsService->getMrrBreakdown($month);
        $forecasts   = $this->metricsService->getRevenueForecasts(12);
        $topOrgs     = $this->metricsService->getTopOrganizations(20);

        // Historique MRR (12 derniers mois pour waterfall)
        $mrrHistory = SaasDailyMetric::selectRaw(
                "DATE_TRUNC('month', metric_date) as month, MAX(mrr_xof) as mrr, MAX(new_mrr) as new_mrr,
                 MAX(expansion_mrr) as expansion_mrr, MAX(churned_mrr) as churned_mrr"
            )
            ->whereDate('metric_date', '>=', Carbon::now()->subMonths(12)->startOfMonth())
            ->groupByRaw("DATE_TRUNC('month', metric_date)")
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => [
                'month'         => Carbon::parse($r->month)->format('M Y'),
                'mrr'           => (float) $r->mrr,
                'new_mrr'       => (float) $r->new_mrr,
                'expansion_mrr' => (float) $r->expansion_mrr,
                'churned_mrr'   => (float) $r->churned_mrr,
            ]);

        $data = [
            'breakdown'   => $breakdown,
            'forecasts'   => $forecasts,
            'mrr_history' => $mrrHistory,
            'top_orgs'    => $topOrgs,
            'selected_month' => $month->format('Y-m'),
        ];

        if ($request->wantsJson()) {
            return response()->json($data);
        }

        return Inertia::render('SuperAdmin/MrrAnalysis', $data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/metrics/cohorts
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Analyse de rétention par cohorte.
     */
    public function cohorts(Request $request): Response|JsonResponse
    {
        $data = [
            'cohorts' => $this->metricsService->getCohortAnalysis(),
        ];

        if ($request->wantsJson()) {
            return response()->json($data);
        }

        return Inertia::render('SuperAdmin/CohortAnalysis', $data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/metrics/health
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Health scores de toutes les organisations.
     */
    public function health(Request $request): Response|JsonResponse
    {
        $query = OrganizationHealthScore::with('organization')
            ->whereDate('score_date', Carbon::today()->toDateString())
            ->orderBy('health_score');

        // Filtres
        if ($request->has('risk')) {
            $query->where('churn_risk', $request->risk);
        }

        $scores = $query->get()->map(fn ($score) => [
            'organization_id'   => $score->organization_id,
            'organization_name' => $score->organization?->name,
            'plan'              => $score->organization?->getCurrentPlan(),
            'health_score'      => $score->health_score,
            'churn_risk'        => $score->churn_risk,
            'churn_reason'      => $score->churn_reason_predicted,
            'last_active_at'    => $score->last_active_at?->diffForHumans(),
            'login_frequency'   => $score->login_frequency,
            'feature_adoption'  => $score->feature_adoption,
            'data_volume_gb'    => $score->data_volume_gb,
            'support_tickets'   => $score->support_tickets,
        ]);

        $data = [
            'scores' => $scores,
            'summary' => [
                'high_risk'   => $scores->where('churn_risk', 'high')->count(),
                'medium_risk' => $scores->where('churn_risk', 'medium')->count(),
                'low_risk'    => $scores->where('churn_risk', 'low')->count(),
                'avg_score'   => round($scores->avg('health_score') ?? 0, 1),
            ],
        ];

        if ($request->wantsJson()) {
            return response()->json($data);
        }

        return Inertia::render('SuperAdmin/OrganizationHealth', $data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/metrics/churn-risk
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Organisations à risque de churn élevé.
     */
    public function churnRisk(Request $request): JsonResponse
    {
        return response()->json([
            'organizations' => $this->metricsService->detectChurnRisk(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/metrics/feature-adoption
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Taux d'adoption des fonctionnalités.
     */
    public function featureAdoption(Request $request): JsonResponse
    {
        return response()->json([
            'modules' => $this->metricsService->getFeatureAdoptionRates(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS PRIVÉS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Taux de croissance MRR (mois en cours vs mois précédent).
     */
    private function mrrGrowthRate(): float
    {
        $thisMonth = SaasDailyMetric::whereMonth('metric_date', Carbon::now()->month)
            ->whereYear('metric_date', Carbon::now()->year)
            ->max('mrr_xof') ?? 0;

        $lastMonth = SaasDailyMetric::whereMonth('metric_date', Carbon::now()->subMonth()->month)
            ->whereYear('metric_date', Carbon::now()->subMonth()->year)
            ->max('mrr_xof') ?? 0;

        if ($lastMonth == 0) {
            return 0;
        }

        return round((($thisMonth - $lastMonth) / $lastMonth) * 100, 1);
    }

    /**
     * Taux de churn mensuel (% d'organisations ayant churné ce mois).
     */
    private function computeChurnRate(): float
    {
        $activeLastMonth = SaasDailyMetric::whereMonth('metric_date', Carbon::now()->subMonth()->month)
            ->whereYear('metric_date', Carbon::now()->subMonth()->year)
            ->max('active_organizations') ?? 0;

        $churnedThisMonth = SaasDailyMetric::whereMonth('metric_date', Carbon::now()->month)
            ->whereYear('metric_date', Carbon::now()->year)
            ->sum('churned_organizations') ?? 0;

        if ($activeLastMonth == 0) {
            return 0;
        }

        return round(($churnedThisMonth / $activeLastMonth) * 100, 2);
    }
}
