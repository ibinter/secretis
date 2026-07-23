<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SaasDailyMetric;
use App\Services\SaasMetricsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * MetricsController — Dashboard métriques SaaS SuperAdmin IBIG Soft
 *
 * ACCÈS RESTREINT : Toutes les routes sont protégées par middleware 'role:super_admin'.
 */
class MetricsController extends Controller
{
    public function __construct(private readonly SaasMetricsService $metrics)
    {
        $this->middleware(['auth', 'role:super_admin']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/metrics
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Page Inertia complète des métriques SaaS.
     */
    public function index(): InertiaResponse
    {
        $latest = SaasDailyMetric::latest('metric_date')->first();

        // Historique MRR 12 mois
        $mrrHistory = SaasDailyMetric::selectRaw(
                "DATE_TRUNC('month', metric_date) as month,
                 MAX(mrr_xof)          as mrr,
                 MAX(new_mrr)          as new_mrr,
                 MAX(expansion_mrr)    as expansion_mrr,
                 MAX(churned_mrr)      as churned_mrr"
            )
            ->whereDate('metric_date', '>=', Carbon::now()->subMonths(12)->startOfMonth())
            ->groupByRaw("DATE_TRUNC('month', metric_date)")
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => [
                'month'         => Carbon::parse($r->month)->translatedFormat('M Y'),
                'mrr'           => (float) $r->mrr,
                'new_mrr'       => (float) $r->new_mrr,
                'expansion_mrr' => (float) $r->expansion_mrr,
                'churned_mrr'   => (float) $r->churned_mrr,
            ]);

        // Historique croissance orgs + users
        $growthHistory = SaasDailyMetric::selectRaw(
                "DATE_TRUNC('month', metric_date) as month,
                 MAX(total_organizations) as organizations,
                 MAX(total_users)         as users,
                 SUM(new_organizations)   as new_organizations"
            )
            ->whereDate('metric_date', '>=', Carbon::now()->subMonths(12)->startOfMonth())
            ->groupByRaw("DATE_TRUNC('month', metric_date)")
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => [
                'month'             => Carbon::parse($r->month)->translatedFormat('M Y'),
                'organizations'     => (int) $r->organizations,
                'users'             => (int) $r->users,
                'new_organizations' => (int) $r->new_organizations,
            ]);

        // Répartition par plan
        $byPlan = $this->metrics->getMrrBreakdown(Carbon::now()->startOfMonth());
        $revenueByPlan = collect($byPlan['by_plan'] ?? [])->map(fn ($revenue, $plan) => [
            'plan'    => $plan,
            'revenue' => $revenue,
            'count'   => \App\Models\License::where('plan_id', $plan)->where('status', 'active')->count(),
        ])->values();

        // Analyse cohortes
        $cohorts = $this->metrics->getCohortAnalysis();

        // Taux de conversion trial → payant
        $trialConversionRate = $this->computeTrialConversionRate();

        // NRR
        $nrr = $this->computeNrr();

        // LTV moyen
        $ltv = $this->computeLtv();

        return Inertia::render('SuperAdmin/Metrics', [
            'kpis' => [
                'mrr'                   => $latest?->mrr_xof ?? 0,
                'arr'                   => $latest?->arr_xof ?? 0,
                'churn_rate'            => $this->computeChurnRate(),
                'trial_conversion_rate' => $trialConversionRate,
                'nrr'                   => $nrr,
                'dau'                   => $latest?->active_users_dau ?? 0,
                'mau'                   => $latest?->active_users_mau ?? 0,
                'dau_mau_ratio'         => $latest && $latest->active_users_mau > 0
                    ? round(($latest->active_users_dau / $latest->active_users_mau) * 100, 1)
                    : 0,
                'active_organizations'  => $latest?->active_organizations ?? 0,
                'ltv'                   => $ltv,
                'mrr_growth'            => $this->mrrGrowthRate(),
            ],
            'mrr_history'    => $mrrHistory,
            'growth_history' => $growthHistory,
            'revenue_by_plan'=> $revenueByPlan,
            'cohorts'        => $cohorts,
            'computed_at'    => now()->toIso8601String(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/superadmin/metrics
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * API JSON : toutes les métriques pour dashboard temps réel.
     */
    public function apiMetrics(Request $request): JsonResponse
    {
        $latest = SaasDailyMetric::latest('metric_date')->first();

        return response()->json([
            'kpis' => [
                'mrr'                   => $latest?->mrr_xof ?? 0,
                'arr'                   => $latest?->arr_xof ?? 0,
                'churn_rate'            => $this->computeChurnRate(),
                'trial_conversion_rate' => $this->computeTrialConversionRate(),
                'nrr'                   => $this->computeNrr(),
                'dau'                   => $latest?->active_users_dau ?? 0,
                'mau'                   => $latest?->active_users_mau ?? 0,
                'dau_mau_ratio'         => $latest && $latest->active_users_mau > 0
                    ? round(($latest->active_users_dau / $latest->active_users_mau) * 100, 1)
                    : 0,
                'active_organizations'  => $latest?->active_organizations ?? 0,
                'ltv'                   => $this->computeLtv(),
                'mrr_growth'            => $this->mrrGrowthRate(),
            ],
            'mrr_history'    => $this->buildMrrHistory(),
            'growth_history' => $this->buildGrowthHistory(),
            'computed_at'    => now()->toIso8601String(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/metrics/export
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Export CSV des métriques historiques.
     */
    public function export(): StreamedResponse
    {
        $rows = SaasDailyMetric::orderBy('metric_date')->get();

        $filename = 'secretis-metrics-' . now()->format('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');

            // En-tête BOM UTF-8 (pour Excel)
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Date',
                'MRR (FCFA)',
                'ARR (FCFA)',
                'Nouveau MRR',
                'MRR Churné',
                'Orgs Actives',
                'Nouvelles Orgs',
                'Orgs Churnées',
                'Total Utilisateurs',
                'MAU',
                'DAU',
                'Plan Starter',
                'Plan Pro',
                'Plan Enterprise',
            ], ';');

            foreach ($rows as $row) {
                fputcsv($out, [
                    $row->metric_date,
                    $row->mrr_xof,
                    $row->arr_xof,
                    $row->new_mrr,
                    $row->churned_mrr,
                    $row->active_organizations,
                    $row->new_organizations,
                    $row->churned_organizations,
                    $row->total_users,
                    $row->active_users_mau,
                    $row->active_users_dau,
                    $row->plan_starter_count,
                    $row->plan_pro_count,
                    $row->plan_enterprise_count,
                ], ';');
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Calculs internes
    // ─────────────────────────────────────────────────────────────────────────

    private function computeChurnRate(): float
    {
        $thisMonth  = Carbon::now()->startOfMonth();
        $lastMonth  = Carbon::now()->subMonth()->startOfMonth();

        $activeStart = \App\Models\License::where('status', 'active')
            ->where('starts_at', '<', $thisMonth)
            ->count();

        if ($activeStart === 0) {
            return 0.0;
        }

        $churned = \App\Models\License::where('status', 'cancelled')
            ->whereBetween('updated_at', [$thisMonth, now()])
            ->count();

        return round(($churned / $activeStart) * 100, 2);
    }

    private function computeTrialConversionRate(): float
    {
        // Essais démarrés il y a 30 jours
        $startDate = Carbon::now()->subDays(30)->startOfDay();

        $trials = \App\Models\License::where('plan_id', 'trial')
            ->where('created_at', '>=', $startDate)
            ->count();

        if ($trials === 0) {
            return 0.0;
        }

        $converted = \App\Models\License::where('plan_id', '!=', 'trial')
            ->where('status', 'active')
            ->where('created_at', '>=', $startDate)
            ->whereNotNull('previous_plan_id')
            ->count();

        return round(($converted / $trials) * 100, 1);
    }

    private function computeNrr(): float
    {
        $startOfMonth = Carbon::now()->startOfMonth();
        $startOfPrevMonth = $startOfMonth->copy()->subMonth();

        $mrrStart = \App\Models\License::where('status', 'active')
            ->whereBetween('starts_at', [$startOfPrevMonth, $startOfMonth])
            ->get()
            ->sum(fn ($l) => $l->billing_cycle === 'yearly' ? $l->price / 12 : $l->price);

        if ($mrrStart === 0.0) {
            return 100.0;
        }

        $mrrEnd = \App\Models\License::where('status', 'active')
            ->whereBetween('starts_at', [$startOfMonth, now()])
            ->get()
            ->sum(fn ($l) => $l->billing_cycle === 'yearly' ? $l->price / 12 : $l->price);

        $churnedMrr = \App\Models\License::where('status', 'cancelled')
            ->whereBetween('updated_at', [$startOfMonth, now()])
            ->get()
            ->sum(fn ($l) => $l->billing_cycle === 'yearly' ? $l->price / 12 : $l->price);

        $nrr = (($mrrEnd - $churnedMrr) / $mrrStart) * 100;

        return round($nrr, 1);
    }

    private function computeLtv(): float
    {
        $avgMonthlyRevenue = \App\Models\License::where('status', 'active')
            ->get()
            ->avg(fn ($l) => $l->billing_cycle === 'yearly' ? $l->price / 12 : $l->price);

        $churnRate = $this->computeChurnRate();

        if ($churnRate <= 0) {
            return 0.0;
        }

        // LTV = ARPU / Churn mensuel (%)
        $monthlyChurnDecimal = $churnRate / 100;
        return round(($avgMonthlyRevenue ?? 0) / $monthlyChurnDecimal, 0);
    }

    private function mrrGrowthRate(): float
    {
        $thisMonthMrr = SaasDailyMetric::whereMonth('metric_date', now()->month)
            ->whereYear('metric_date', now()->year)
            ->max('mrr_xof') ?? 0;

        $lastMonthMrr = SaasDailyMetric::whereMonth('metric_date', now()->subMonth()->month)
            ->whereYear('metric_date', now()->subMonth()->year)
            ->max('mrr_xof') ?? 0;

        if ($lastMonthMrr === 0) {
            return 0.0;
        }

        return round((($thisMonthMrr - $lastMonthMrr) / $lastMonthMrr) * 100, 1);
    }

    private function buildMrrHistory(): \Illuminate\Support\Collection
    {
        return SaasDailyMetric::selectRaw(
                "DATE_TRUNC('month', metric_date) as month,
                 MAX(mrr_xof)       as mrr,
                 MAX(new_mrr)       as new_mrr,
                 MAX(churned_mrr)   as churned_mrr"
            )
            ->whereDate('metric_date', '>=', Carbon::now()->subMonths(12)->startOfMonth())
            ->groupByRaw("DATE_TRUNC('month', metric_date)")
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => [
                'month'       => Carbon::parse($r->month)->translatedFormat('M Y'),
                'mrr'         => (float) $r->mrr,
                'new_mrr'     => (float) $r->new_mrr,
                'churned_mrr' => (float) $r->churned_mrr,
            ]);
    }

    private function buildGrowthHistory(): \Illuminate\Support\Collection
    {
        return SaasDailyMetric::selectRaw(
                "DATE_TRUNC('month', metric_date) as month,
                 MAX(total_organizations) as organizations,
                 MAX(total_users)         as users"
            )
            ->whereDate('metric_date', '>=', Carbon::now()->subMonths(12)->startOfMonth())
            ->groupByRaw("DATE_TRUNC('month', metric_date)")
            ->orderBy('month')
            ->get()
            ->map(fn ($r) => [
                'month'         => Carbon::parse($r->month)->translatedFormat('M Y'),
                'organizations' => (int) $r->organizations,
                'users'         => (int) $r->users,
            ]);
    }
}
